// Messages from UI → Worker
export type EngineCommand =
  | { type: 'configure'; config: AnalyzerConfig }
  | { type: 'set-signals'; signals: SignalConfig[] }
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'single-sweep' }

// Messages from Worker → UI
export type EngineOutput =
  | { type: 'spectrum'; data: Float32Array; traceIndex: number }
  | { type: 'waterfall-row'; data: Float32Array; timestamp: number }
  | { type: 'status'; running: boolean; sweepCount: number }

export interface AnalyzerConfig {
  centerFreq: number
  span: number
  rbw: number
  vbw: number
  refLevel: number
  scale: number
  fftSize: number
  sampleRate: number
  windowType: WindowType
  detectorType: DetectorType
  sweepMode: 'continuous' | 'single' | 'off'
  traces: TraceConfig[]
}

export interface TraceConfig {
  index: number
  mode: TraceMode
  enabled: boolean
}

export type TraceMode = 'clear-write' | 'max-hold' | 'min-hold' | 'average' | 'view' | 'off'
export type WindowType = 'rectangular' | 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'flat-top'
export type DetectorType = 'peak' | 'sample' | 'average' | 'normal' | 'neg-peak' | 'rms'

export interface SignalConfig {
  id: string
  enabled: boolean
  type: SignalType
  params: Record<string, number | string | number[]>
}

export type SignalType = 'cw' | 'noise' | 'am' | 'fm' | 'bpsk' | 'qpsk' | 'qam16' | 'qam64' | 'chirp' | 'pulse' | 'fhss'
