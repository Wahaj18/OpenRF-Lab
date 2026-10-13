import { computeSweep, DISPLAY_BINS } from './sweep'
import type { FHSSState } from './signals/hopper'
import type { AnalyzerConfig, EngineCommand, SignalConfig } from './types'
import { applyTraceMode, newTraceBuffer, traceMath } from './traceModes'

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
const traceBuffers = Array.from({ length: 6 }, newTraceBuffer)

self.onmessage = (e: MessageEvent<EngineCommand>) => {
  const cmd = e.data
  switch (cmd.type) {
    case 'configure':
      config = cmd.config
      for (let i = 0; i < 6; i++) traceBuffers[i] = newTraceBuffer()
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

  const m = config.traceMath
  const mathOn = !!m?.enabled && m.result !== m.traceA && m.result !== m.traceB
  const latest = new Map<number, Float64Array>()
  for (const trace of config.traces) {
    if (mathOn && trace.index === m!.result) continue
    if (!trace.enabled || trace.mode === 'off') continue
    const result = applyTraceMode(detected, traceBuffers[trace.index], trace.mode)
    latest.set(trace.index, result)
    post(result, trace.index)
  }
  if (mathOn) {
    const a = latest.get(m!.traceA), b = latest.get(m!.traceB)
    if (a && b) post(traceMath(a, b, m!.operation), m!.result)
  }

  const waterfallRow = new Float32Array(DISPLAY_BINS)
  for (let i = 0; i < DISPLAY_BINS; i++) waterfallRow[i] = detected[i]
  self.postMessage({ type: 'waterfall-row', data: waterfallRow, timestamp: Date.now() }, { transfer: [waterfallRow.buffer] })

  sweepCount++
  if (sweepCount % 30 === 0) postStatus()
}

function post(result: Float64Array, traceIndex: number) {
  const transferable = new Float32Array(result.length)
  for (let i = 0; i < result.length; i++) transferable[i] = result[i]
  self.postMessage({ type: 'spectrum', data: transferable, traceIndex }, { transfer: [transferable.buffer] })
}

function postStatus() { self.postMessage({ type: 'status', running, sweepCount }) }
