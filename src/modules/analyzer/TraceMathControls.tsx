import type { TraceMath, TraceState } from '../../hooks/useTraces'

interface Props {
  traces: TraceState[]; traceMath: TraceMath; setTraceMath: (m: TraceMath) => void
  spectrumData: Map<number, Float32Array>
}

const mean = (d?: Float32Array) => {
  if (!d || d.length === 0) return null
  let s = 0; for (let i = 0; i < d.length; i++) s += d[i]
  return s / d.length
}
const fmt = (v: number | null) => v === null ? '—' : v.toFixed(2)

export function TraceMathControls({ traces, traceMath: m, setTraceMath, spectrumData }: Props) {
  const sel = 'rounded text-[11px] px-1 py-1 outline-none cursor-pointer min-w-0'
  const style = { backgroundColor: 'var(--sf-bg-input, #111)', border: '1px solid var(--sf-border)', color: 'var(--sf-text-primary)' }
  const opts = traces.map(t => <option key={t.index} value={t.index}>T{t.index + 1}</option>)
  const bad = m.result === m.traceA || m.result === m.traceB
  const on = m.enabled && !bad
  const color = traces[m.result]?.color
  return (
    <div className="flex flex-col gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--sf-border)' }} data-testid="trace-math">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--sf-text-muted)' }}>TRACE MATH</span>
        <select aria-label="Trace math" value={m.enabled ? m.operation : 'off'} className={sel} style={style}
          onChange={e => setTraceMath(e.target.value === 'off' ? { ...m, enabled: false } : { ...m, enabled: true, operation: e.target.value as TraceMath['operation'] })}>
          <option value="off">Off</option>
          <option value="subtract">A − B</option>
          <option value="add">A + B</option>
        </select>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] items-center gap-1 text-[11px]" style={{ color: 'var(--sf-text-primary)' }}>
        <select aria-label="Math result" value={m.result} className={sel} style={{ ...style, color }} onChange={e => setTraceMath({ ...m, result: +e.target.value })}>{opts}</select>
        <span className="text-center">=</span>
        <select aria-label="Math A" value={m.traceA} className={sel} style={style} onChange={e => setTraceMath({ ...m, traceA: +e.target.value })}>{opts}</select>
        <span className="text-center">{m.operation === 'add' ? '+' : '−'}</span>
        <select aria-label="Math B" value={m.traceB} className={sel} style={style} onChange={e => setTraceMath({ ...m, traceB: +e.target.value })}>{opts}</select>
        <span />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>
        {bad ? 'Result must differ from A and B.'
          : m.operation === 'add' ? 'Adds linear power; result in dBm.' : 'Difference in dB (power ratio A/B). 0 dB is the centre line.'}
      </p>
      {on && (
        <p className="text-[10px] font-mono" data-testid="trace-math-readout" style={{ color: 'var(--sf-text-muted)' }}>
          mean A <span data-v="a">{fmt(mean(spectrumData.get(m.traceA)))}</span> · B <span data-v="b">{fmt(mean(spectrumData.get(m.traceB)))}</span> · T{m.result + 1} <span data-v="r" style={{ color }}>{fmt(mean(spectrumData.get(m.result)))}</span>
        </p>
      )}
    </div>
  )
}
