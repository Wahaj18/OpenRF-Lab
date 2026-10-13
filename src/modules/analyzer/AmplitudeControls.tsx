import { ControlInput } from '../../components/ControlInput'
import type { AnalyzerStateValues } from '../../hooks/useAnalyzerState'

interface Props { state: AnalyzerStateValues }

export function AmplitudeControls({ state }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ControlInput label="Ref Level" value={`${state.refLevel} dBm`} onChange={v => { const n = parseFloat(v); if (isFinite(n)) state.setRefLevel(Math.max(-200, Math.min(50, n))) }} />
      <ControlInput label="Scale" value={`${state.scale} dB/div`} onChange={v => { const n = parseFloat(v); if (isFinite(n) && n > 0) state.setScale(Math.max(0.1, Math.min(50, n))) }} />
      <ControlInput label="Offset" value={`${state.offset} dB`} onChange={v => { const n = parseFloat(v); if (isFinite(n)) state.setOffset(Math.max(-200, Math.min(200, n))) }} />
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>Units</div>
        <select value={state.units} onChange={e => state.setUnits(e.target.value as 'dBm' | 'dBV' | 'dBuV' | 'W')}
          className="w-full rounded text-[11px] px-1 py-1 outline-none cursor-pointer"
          aria-label="Amplitude units"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}>
          <option value="dBm">dBm</option>
          <option value="dBV">dBV</option>
          <option value="dBuV">dBμV</option>
          <option value="W">W</option>
        </select>
      </div>
    </div>
  )
}
