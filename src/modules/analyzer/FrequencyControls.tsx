import { ControlInput } from '../../components/ControlInput'
import { formatFrequency } from '../../utils/format'
import type { AnalyzerStateValues } from '../../hooks/useAnalyzerState'

interface Props { state: AnalyzerStateValues }

export function FrequencyControls({ state }: Props) {
  const parseFreq = (val: string): number | null => {
    const trimmed = val.trim().toLowerCase()
    const num = parseFloat(trimmed)
    if (isNaN(num) || num <= 0) return null
    if (trimmed.includes('ghz')) return num * 1e9
    if (trimmed.includes('mhz')) return num * 1e6
    if (trimmed.includes('khz')) return num * 1e3
    return num
  }
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ControlInput label="Center Freq" value={formatFrequency(state.centerFreq)} onChange={v => { const f = parseFreq(v); if (f !== null) state.setCenterFreq(f) }} />
      <ControlInput label="Span" value={formatFrequency(state.span)} onChange={v => { const f = parseFreq(v); if (f !== null) state.setSpan(f) }} />
      <ControlInput label="Start Freq" value={formatFrequency(state.startFreq)} onChange={v => { const f = parseFreq(v); if (f !== null) state.setStartFreq(f) }} dimmed />
      <ControlInput label="Stop Freq" value={formatFrequency(state.stopFreq)} onChange={v => { const f = parseFreq(v); if (f !== null) state.setStopFreq(f) }} dimmed />
    </div>
  )
}
