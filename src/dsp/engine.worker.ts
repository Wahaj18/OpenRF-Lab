import { computeSweep, DISPLAY_BINS } from './sweep'
import type { FHSSState } from './signals/hopper'
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
  const detected = computeSweep(config, signals, fhssStates)

  for (const trace of config.traces) {
    if (!trace.enabled || trace.mode === 'off') continue
    const result = applyTraceMode(detected, trace.index, trace.mode)
    const transferable = new Float32Array(result.length)
    for (let i = 0; i < result.length; i++) transferable[i] = result[i]
    self.postMessage({ type: 'spectrum', data: transferable, traceIndex: trace.index }, { transfer: [transferable.buffer] })
  }

  const waterfallRow = new Float32Array(DISPLAY_BINS)
  for (let i = 0; i < DISPLAY_BINS; i++) waterfallRow[i] = detected[i]
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

function postStatus() { self.postMessage({ type: 'status', running, sweepCount }) }
