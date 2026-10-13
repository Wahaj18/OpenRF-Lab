import { formatFrequency, formatRBW, formatAmplitude } from '../utils/format'
import type { AnalyzerStateValues } from '../hooks/useAnalyzerState'
import type { TraceState } from '../hooks/useTraces'

interface Props { state: AnalyzerStateValues; traces: TraceState[] }

export function QuickAccessBar({ state, traces }: Props) {
  const activeTraces = traces.filter(t => t.enabled)
  return (
    <div className="flex gap-x-4 gap-y-1 items-center px-3 py-1.5 flex-wrap text-[11px] basis-full sm:basis-auto sm:flex-1 min-w-0 whitespace-nowrap"
      style={{ backgroundColor: 'var(--sf-bg-toolbar)', borderTop: '1px solid var(--sf-border)' }}>
      <Param label="Center" value={formatFrequency(state.centerFreq)} />
      <Param label="Span" value={formatFrequency(state.span)} />
      <Param label="RBW" value={formatRBW(state.rbw)} />
      <Param label="Ref" value={formatAmplitude(state.refLevel, state.units)} />
      <Param label="Det" value={state.detectorType} plain />
      {activeTraces.slice(0, 3).map(t => (
        <div key={t.index} className="flex gap-1 items-center">
          <span style={{ color: 'var(--sf-text-dim)' }}>T{t.index + 1}:</span>
          <span style={{ color: t.color }}>{t.mode}</span>
        </div>
      ))}
    </div>
  )
}

function Param({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="flex gap-1 items-center">
      <span style={{ color: 'var(--sf-text-dim)' }}>{label}:</span>
      {plain ? <span style={{ color: 'var(--sf-accent-blue)' }}>{value}</span> : (
        <span className="rounded px-1.5 py-0.5"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}>{value}</span>
      )}
    </div>
  )
}
