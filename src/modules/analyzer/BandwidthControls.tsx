import { ControlInput } from '../../components/ControlInput'
import { formatRBW } from '../../utils/format'
import type { AnalyzerStateValues } from '../../hooks/useAnalyzerState'

interface Props { state: AnalyzerStateValues }
const WINDOW_OPTIONS = ['rectangular', 'hann', 'hamming', 'blackman', 'kaiser', 'flat-top'] as const
const DETECTOR_OPTIONS = ['peak', 'sample', 'average', 'normal', 'neg-peak', 'rms'] as const
const SWEEP_OPTIONS = ['continuous', 'single', 'off'] as const

export function BandwidthControls({ state }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ControlInput label="RBW" value={formatRBW(state.rbw)} onChange={v => { const n = parseFloat(v) * (v.toLowerCase().includes('k') ? 1e3 : v.toLowerCase().includes('m') ? 1e6 : 1); if (isFinite(n) && n >= 1) state.setRbw(n) }} />
      <ControlInput label="VBW" value={formatRBW(state.vbw)} onChange={v => { const n = parseFloat(v) * (v.toLowerCase().includes('k') ? 1e3 : v.toLowerCase().includes('m') ? 1e6 : 1); if (isFinite(n) && n >= 1) state.setVbw(n) }} />
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>Window</div>
        <select value={state.windowType} onChange={e => state.setWindowType(e.target.value as typeof state.windowType)}
          className="w-full rounded text-[11px] px-1 py-1 outline-none cursor-pointer"
          aria-label="Window function type"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}>
          {WINDOW_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>Detector</div>
        <select value={state.detectorType} onChange={e => state.setDetectorType(e.target.value as typeof state.detectorType)}
          className="w-full rounded text-[11px] px-1 py-1 outline-none cursor-pointer"
          aria-label="Detector type"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}>
          {DETECTOR_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>Sweep</div>
        <select value={state.sweepMode} onChange={e => state.setSweepMode(e.target.value as typeof state.sweepMode)}
          className="w-full rounded text-[11px] px-1 py-1 outline-none cursor-pointer"
          aria-label="Sweep mode"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}>
          {SWEEP_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}
