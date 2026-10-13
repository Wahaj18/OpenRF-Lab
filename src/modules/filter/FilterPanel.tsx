import { useFilterState } from './useFilterState'
import type { FilterType } from '../../dsp/filters'
import type { WindowType } from '../../dsp/windowing'
import { useTabManager } from '../../app/TabManager'

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'lowpass', label: 'Lowpass' },
  { value: 'highpass', label: 'Highpass' },
  { value: 'bandpass', label: 'Bandpass' },
  { value: 'bandstop', label: 'Bandstop' },
]

const WINDOW_OPTIONS: WindowType[] = ['rectangular', 'hann', 'hamming', 'blackman', 'kaiser', 'flat-top']

const MINI_W = 250
const MINI_H = 100
const PAD = { top: 12, right: 8, bottom: 20, left: 36 }
const IW = MINI_W - PAD.left - PAD.right
const IH = MINI_H - PAD.top - PAD.bottom

export function FilterPanel() {
  const state = useFilterState()
  const { openTab } = useTabManager()
  const needsDual = state.filterType === 'bandpass' || state.filterType === 'bandstop'

  return (
    <div className="flex flex-col gap-2 p-2 text-[11px]"
      style={{ width: 280, backgroundColor: 'var(--sf-bg-panel)', borderRight: '1px solid var(--sf-border)' }}>

      {/* Filter type */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>FILTER TYPE</div>
        <select value={state.filterType} onChange={e => state.setFilterType(e.target.value as FilterType)}
          className="w-full rounded px-1.5 py-1 text-[11px]"
          style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }}>
          {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Window type */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>WINDOW</div>
        <select value={state.windowType} onChange={e => state.setWindowType(e.target.value as WindowType)}
          className="w-full rounded px-1.5 py-1 text-[11px]"
          style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }}>
          {WINDOW_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {/* Order */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>ORDER</div>
        <input type="number" min={3} max={501} step={2} value={state.order}
          onChange={e => {
            let v = parseInt(e.target.value, 10)
            if (!isNaN(v)) {
              if (v % 2 === 0) v += 1
              state.setOrder(Math.max(3, Math.min(501, v)))
            }
          }}
          className="w-full rounded px-1.5 py-1 text-[11px]"
          style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
      </div>

      {/* Mini magnitude plot */}
      <MiniMagnitudePlot magnitude={state.magnitudeResponse} frequencies={state.frequencies} />

      {/* Cutoff frequency */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>
          {needsDual ? 'CUTOFF LOW (Hz)' : 'CUTOFF (Hz)'}
        </div>
        <input type="number" min={1} max={state.sampleRate / 2 - 1} value={state.cutoffLow}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) state.setCutoffLow(Math.max(1, Math.min(state.sampleRate / 2 - 1, v)))
          }}
          className="w-full rounded px-1.5 py-1 text-[11px]"
          style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
      </div>

      {needsDual && (
        <div>
          <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>CUTOFF HIGH (Hz)</div>
          <input type="number" min={state.cutoffLow + 1} max={state.sampleRate / 2 - 1} value={state.cutoffHigh}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) state.setCutoffHigh(Math.max(state.cutoffLow + 1, Math.min(state.sampleRate / 2 - 1, v)))
            }}
            className="w-full rounded px-1.5 py-1 text-[11px]"
            style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
        </div>
      )}

      {/* Apply button (placeholder) */}
      <button onClick={() => openTab('analyzer')}
        className="w-full rounded py-1.5 text-[11px] font-semibold cursor-pointer mt-1"
        style={{
          backgroundColor: 'var(--sf-accent-blue)',
          color: 'var(--sf-bg-primary)',
          border: 'none',
        }}>
        View in Analyzer
      </button>
    </div>
  )
}

function MiniMagnitudePlot({ magnitude, frequencies }: { magnitude: Float64Array; frequencies: Float64Array }) {
  const xMin = frequencies[0]
  const xMax = frequencies[frequencies.length - 1]
  const yMin = -100
  const yMax = 5

  const toX = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * IW
  const toY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * IH

  const pathParts: string[] = []
  for (let i = 0; i < magnitude.length; i++) {
    const y = Math.max(yMin, Math.min(yMax, isFinite(magnitude[i]) ? magnitude[i] : yMin))
    pathParts.push(`${i === 0 ? 'M' : 'L'}${toX(frequencies[i]).toFixed(1)},${toY(y).toFixed(1)}`)
  }

  return (
    <div className="rounded" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
      <svg width={MINI_W} height={MINI_H} viewBox={`0 0 ${MINI_W} ${MINI_H}`} className="w-full h-auto">
        {[0, 0.5, 1].map(frac => (
          <line key={`g-${frac}`} x1={PAD.left} x2={PAD.left + IW}
            y1={PAD.top + frac * IH} y2={PAD.top + frac * IH}
            stroke="var(--sf-border)" strokeWidth={0.5} />
        ))}
        <path d={pathParts.join('')} fill="none" stroke="var(--sf-accent-blue)" strokeWidth={1.2} />
        {/* Y ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`y-${frac}`} x={PAD.left - 3} y={PAD.top + frac * IH + 3}
            textAnchor="end" fill="var(--sf-text-dim)" fontSize={7}>
            {(yMax - frac * (yMax - yMin)).toFixed(0)}
          </text>
        ))}
        {/* X ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`x-${frac}`} x={PAD.left + frac * IW} y={PAD.top + IH + 12}
            textAnchor="middle" fill="var(--sf-text-dim)" fontSize={7}>
            {(xMin + frac * (xMax - xMin)).toFixed(0)} Hz
          </text>
        ))}
      </svg>
    </div>
  )
}
