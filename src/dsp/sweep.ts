import { fft, magnitudeSpectrum } from './fft'
import { createWindow } from './windowing'
import { applyDetector } from './detection'
import { generateCW } from './signals/cw'
import { generateNoise } from './signals/noise'
import { generateModulated } from './signals/modulated'
import { generateChirp } from './signals/chirp'
import { generateFHSS, type FHSSState } from './signals/hopper'
import type { AnalyzerConfig, SignalConfig } from './types'

export const DISPLAY_BINS = 800
const MAX_FFT = 1 << 16

/**
 * Signals are synthesised as real samples on an IF so the one-sided FFT
 * covers [startFreq, stopFreq] exactly. The IF places startFreq at
 * GUARD * span above 0 Hz, which keeps every in-span signal clear of DC and
 * of Nyquist (fs/2 = 1.25 span).
 */
const GUARD = 0.1

export interface SweepPlan { fftSize: number; sampleRate: number; ifOrigin: number; firstBin: number; lastBin: number }

export function planSweep(config: AnalyzerConfig): SweepPlan {
  const sampleRate = config.span * 2.5
  const wanted = Math.max(256, 2 * (config.fftSize || 1024))
  const fftSize = Math.min(MAX_FFT, Math.pow(2, Math.ceil(Math.log2(wanted))))
  const binHz = sampleRate / fftSize
  const startFreq = config.centerFreq - config.span / 2
  const ifOrigin = startFreq - GUARD * config.span
  const firstBin = Math.round((GUARD * config.span) / binHz)
  const lastBin = Math.round(((GUARD + 1) * config.span) / binHz)
  return { fftSize, sampleRate, ifOrigin, firstBin, lastBin }
}

/** One detected sweep across the analyzer span, DISPLAY_BINS points in dBm. */
export function computeSweep(config: AnalyzerConfig, signals: SignalConfig[], fhssStates: Map<string, FHSSState> = new Map()): Float64Array {
  const plan = planSweep(config)
  const N = plan.fftSize
  const composite = new Float64Array(N)
  for (const sig of signals) {
    if (!sig.enabled) continue
    const generated = generateSignal(sig, plan.sampleRate, N, plan.ifOrigin, fhssStates)
    for (let i = 0; i < N; i++) composite[i] += generated[i]
  }
  const window = createWindow(config.windowType, N)
  const windowed = new Float64Array(N)
  for (let i = 0; i < N; i++) windowed[i] = composite[i] * window[i]
  const freq = fft(windowed, new Float64Array(N))
  const mag = magnitudeSpectrum(freq.real, freq.imag, N)
  // Calibrate so a CW reads its RMS power in dBm: undo the window's coherent
  // gain and fold the negative-frequency half into the one-sided spectrum.
  let wSum = 0
  for (let i = 0; i < N; i++) wSum += window[i]
  const cg = wSum / N
  const calDb = 10 * Math.log10(2 / (cg * cg))
  const inSpan = mag.slice(plan.firstBin, plan.lastBin + 1)
  for (let i = 0; i < inSpan.length; i++) if (inSpan[i] > -150) inSpan[i] += calDb
  return applyVbwSmoothing(applyDetector(inSpan, DISPLAY_BINS, config.detectorType), config.vbw, config.rbw)
}

export function generateSignal(sig: SignalConfig, sampleRate: number, numSamples: number, centerFreq: number, fhssStates: Map<string, FHSSState>): Float64Array {
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

