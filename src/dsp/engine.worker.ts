import { fft, magnitudeSpectrum } from './fft'
import { createWindow } from './windowing'
import { applyDetector } from './detection'
import { generateCW } from './signals/cw'
import { generateNoise } from './signals/noise'
import { generateModulated } from './signals/modulated'
import { generateChirp } from './signals/chirp'
import { generateFHSS, type FHSSState } from './signals/hopper'
import type { AnalyzerConfig, EngineCommand, SignalConfig, TraceMode } from './types'

let config: AnalyzerConfig = {
  centerFreq: 2.437e9, span: 100e6, rbw: 100e3, vbw: 100e3,
  refLevel: 0, scale: 10, fftSize: 1024, sampleRate: 1024 * 100e3,
  windowType: 'hann', detectorType: 'peak', sweepMode: 'continuous',
  traces: [{ index: 0, mode: 'clear-write', enabled: true }],
}

let signals: SignalConfig[] = []
const fhssStates = new Map<string, FHSSState>()
let running = false
let sweepCount = 0
let sweepTimerId: ReturnType<typeof setTimeout> | null = null
const TARGET_FPS = 30
const traceBuffers: (Float64Array | null)[] = Array(6).fill(null)
const traceAvgCounts: number[] = Array(6).fill(0)
const displayBins = 800

self.onmessage = (e: MessageEvent<EngineCommand>) => {
  const cmd = e.data
  switch (cmd.type) {
    case 'configure':
      config = cmd.config
      for (let i = 0; i < 6; i++) { traceBuffers[i] = null; traceAvgCounts[i] = 0 }
      break
    case 'set-signals':
      signals = cmd.signals
      // Reset FHSS states for signals that were removed or changed
      for (const key of fhssStates.keys()) {
        if (!signals.some(s => s.id === key && s.type === 'fhss')) {
          fhssStates.delete(key)
        }
      }
      break
    case 'start':
      if (config.sweepMode === 'off') { running = false; postStatus(); break }
      running = true; sweepCount = 0; postStatus()
      if (config.sweepMode === 'single') { runSingleSweep(); running = false; postStatus() }
      else { runSweepLoop() }
      break
    case 'stop':
      running = false
      if (sweepTimerId !== null) { clearTimeout(sweepTimerId); sweepTimerId = null }
      postStatus(); break
    case 'single-sweep': runSingleSweep(); break
  }
}

function runSweepLoop() {
  if (!running) return
  runSingleSweep()
  sweepTimerId = setTimeout(runSweepLoop, 1000 / TARGET_FPS)
}

function runSingleSweep() {
  const N = config.fftSize
  const sampleRate = config.sampleRate
  const composite = new Float64Array(N)
  for (const sig of signals) {
    if (!sig.enabled) continue
    const generated = generateSignal(sig, sampleRate, N, config.centerFreq)
    for (let i = 0; i < N; i++) composite[i] += generated[i]
  }
  const window = createWindow(config.windowType, N)
  const windowed = new Float64Array(N)
  for (let i = 0; i < N; i++) windowed[i] = composite[i] * window[i]
  const imag = new Float64Array(N)
  const freq = fft(new Float64Array(windowed), imag)
  const magSpectrum = magnitudeSpectrum(freq.real, freq.imag, N)
  const rawDetected = applyDetector(magSpectrum, displayBins, config.detectorType)

  // Apply VBW smoothing: VBW < RBW smooths the trace (exponential moving average)
  const detected = applyVbwSmoothing(rawDetected, config.vbw, config.rbw)

  for (const trace of config.traces) {
    if (!trace.enabled || trace.mode === 'off') continue
    const result = applyTraceMode(detected, trace.index, trace.mode)
    const transferable = new Float32Array(result.length)
    for (let i = 0; i < result.length; i++) transferable[i] = result[i]
    self.postMessage({ type: 'spectrum', data: transferable, traceIndex: trace.index }, { transfer: [transferable.buffer] })
  }

  const waterfallRow = new Float32Array(displayBins)
  for (let i = 0; i < displayBins; i++) waterfallRow[i] = detected[i]
  self.postMessage({ type: 'waterfall-row', data: waterfallRow, timestamp: Date.now() }, { transfer: [waterfallRow.buffer] })

  sweepCount++
  if (sweepCount % 30 === 0) postStatus()
}

function applyTraceMode(current: Float64Array, traceIdx: number, mode: TraceMode): Float64Array {
  switch (mode) {
    case 'clear-write': traceBuffers[traceIdx] = new Float64Array(current); return current
    case 'max-hold': {
      if (!traceBuffers[traceIdx]) { traceBuffers[traceIdx] = new Float64Array(current) }
      else { const buf = traceBuffers[traceIdx]!; for (let i = 0; i < current.length; i++) buf[i] = Math.max(buf[i], current[i]) }
      return traceBuffers[traceIdx]!
    }
    case 'min-hold': {
      if (!traceBuffers[traceIdx]) { traceBuffers[traceIdx] = new Float64Array(current) }
      else { const buf = traceBuffers[traceIdx]!; for (let i = 0; i < current.length; i++) buf[i] = Math.min(buf[i], current[i]) }
      return traceBuffers[traceIdx]!
    }
    case 'average': {
      traceAvgCounts[traceIdx]++
      const alpha = 1 / traceAvgCounts[traceIdx]
      if (!traceBuffers[traceIdx]) { traceBuffers[traceIdx] = new Float64Array(current) }
      else {
        const buf = traceBuffers[traceIdx]!
        for (let i = 0; i < current.length; i++) {
          // Average in linear power domain, not dB
          const linBuf = Math.pow(10, buf[i] / 10)
          const linCur = Math.pow(10, current[i] / 10)
          const linAvg = linBuf + alpha * (linCur - linBuf)
          buf[i] = 10 * Math.log10(Math.max(linAvg, 1e-15))
        }
      }
      return traceBuffers[traceIdx]!
    }
    case 'view': return traceBuffers[traceIdx] ?? current
    default: return current
  }
}

function generateSignal(sig: SignalConfig, sampleRate: number, numSamples: number, centerFreq: number): Float64Array {
  const p = sig.params
  switch (sig.type) {
    case 'cw': return generateCW({ frequency: ((p.frequency as number) ?? 1000) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, phase: (p.phase as number) ?? 0, sampleRate, numSamples })
    case 'noise': return generateNoise({ type: (p.noiseType as 'awgn' | 'pink' | 'brown') ?? 'awgn', powerDbm: (p.powerDbm as number) ?? -90, numSamples })
    case 'am': case 'fm': case 'bpsk': case 'qpsk': case 'qam16': case 'qam64':
      return generateModulated({ type: sig.type, carrierFreq: ((p.carrierFreq as number) ?? 1000) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, bandwidth: (p.bandwidth as number) ?? 500, modulationIndex: (p.modulationIndex as number) ?? 1, sampleRate, numSamples })
    case 'chirp': case 'pulse':
      return generateChirp({ startFreq: ((p.startFreq as number) ?? 500) - centerFreq, stopFreq: ((p.stopFreq as number) ?? 1500) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, pulseWidth: (p.pulseWidth as number) ?? 0.01, pri: (p.pri as number) ?? 0.05, sampleRate, numSamples })
    case 'fhss': {
      const rawHops = (p.hopFrequencies as number[]) ?? [500, 1000, 1500, 2000]
      const basebandHops = rawHops.map(f => f - centerFreq)
      const fhssParams = { hopFrequencies: basebandHops, dwellTime: (p.dwellTime as number) ?? 0.01, powerDbm: (p.powerDbm as number) ?? -20, pattern: (p.pattern as 'sequential' | 'random') ?? 'sequential', sampleRate, numSamples }
      const existingState = fhssStates.get(sig.id)
      const result = generateFHSS(fhssParams, existingState)
      fhssStates.set(sig.id, result.state)
      return result.samples
    }
    default: return new Float64Array(numSamples)
  }
}

/** VBW smoothing: when VBW < RBW, apply exponential moving average to smooth the trace */
function applyVbwSmoothing(spectrum: Float64Array, vbw: number, rbw: number): Float64Array {
  if (vbw >= rbw) return spectrum
  const ratio = vbw / rbw
  // Smoothing kernel width inversely proportional to VBW/RBW ratio
  const kernelWidth = Math.max(1, Math.round(1 / ratio))
  if (kernelWidth <= 1) return spectrum

  const smoothed = new Float64Array(spectrum.length)
  const alpha = 2 / (kernelWidth + 1)
  smoothed[0] = spectrum[0]
  // Forward pass
  for (let i = 1; i < spectrum.length; i++) {
    smoothed[i] = alpha * spectrum[i] + (1 - alpha) * smoothed[i - 1]
  }
  // Backward pass for zero-phase smoothing
  for (let i = spectrum.length - 2; i >= 0; i--) {
    smoothed[i] = alpha * smoothed[i] + (1 - alpha) * smoothed[i + 1]
  }
  return smoothed
}

function postStatus() { self.postMessage({ type: 'status', running, sweepCount }) }
