import type { TraceState } from '../../hooks/useTraces'
import type { TraceMode } from '../../dsp/types'

interface Props { traces: TraceState[]; setTraceMode: (index: number, mode: TraceMode) => void; mathResult?: number }
const TRACE_MODES: TraceMode[] = ['clear-write', 'max-hold', 'min-hold', 'average', 'view', 'off']

export function TraceControls({ traces, setTraceMode, mathResult }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {traces.map(t => (
        <div key={t.index} className="flex items-center gap-1.5 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.enabled || t.index === mathResult ? t.color : 'var(--sf-text-dim)', opacity: t.enabled || t.index === mathResult ? 1 : 0.3 }} />
          <span className="text-[11px] w-6" style={{ color: 'var(--sf-text-primary)' }}>T{t.index + 1}</span>
          {t.index === mathResult ? <span className="flex-1 text-[10px] px-1" style={{ color: t.color }}>math</span> :
          <select value={t.mode} onChange={e => setTraceMode(t.index, e.target.value as TraceMode)}
            className="flex-1 rounded text-[10px] px-1 py-0.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'transparent', border: 'none', color: t.enabled ? t.color : 'var(--sf-text-dim)' }}>
            {TRACE_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>}
        </div>
      ))}
    </div>
  )
}
