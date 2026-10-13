import type { TraceMode } from './types'

export interface TraceBuffer { data: Float64Array | null; count: number }

export function newTraceBuffer(): TraceBuffer { return { data: null, count: 0 } }

/** Apply a trace mode to a new sweep, updating the buffer in place. Average is a running power (linear) mean. */
export function applyTraceMode(current: Float64Array, buf: TraceBuffer, mode: TraceMode): Float64Array {
  switch (mode) {
    case 'clear-write': buf.data = new Float64Array(current); return current
    case 'max-hold':
    case 'min-hold': {
      if (!buf.data || buf.data.length !== current.length) { buf.data = new Float64Array(current); return buf.data }
      const d = buf.data
      if (mode === 'max-hold') { for (let i = 0; i < current.length; i++) d[i] = Math.max(d[i], current[i]) }
      else { for (let i = 0; i < current.length; i++) d[i] = Math.min(d[i], current[i]) }
      return d
    }
    case 'average': {
      buf.count++
      if (!buf.data || buf.data.length !== current.length) { buf.data = new Float64Array(current); buf.count = 1; return buf.data }
      const alpha = 1 / buf.count
      const d = buf.data
      for (let i = 0; i < current.length; i++) {
        const lin = Math.pow(10, d[i] / 10)
        d[i] = 10 * Math.log10(Math.max(lin + alpha * (Math.pow(10, current[i] / 10) - lin), 1e-15))
      }
      return d
    }
    case 'view': return buf.data ?? current
    default: return current
  }
}

/** Trace math on dB traces. A − B: dB difference (= 10·log10 of the power ratio). A + B: linear power sum, back in dBm. */
export function traceMath(a: Float64Array, b: Float64Array, op: 'add' | 'subtract'): Float64Array {
  const out = new Float64Array(Math.min(a.length, b.length))
  for (let i = 0; i < out.length; i++) {
    out[i] = op === 'subtract' ? a[i] - b[i] : 10 * Math.log10(Math.pow(10, a[i] / 10) + Math.pow(10, b[i] / 10))
  }
  return out
}
