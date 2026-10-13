import { useFilterState } from './useFilterState'
import type { FilterType } from '../../dsp/filters'
import type { WindowType } from '../../dsp/windowing'

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'lowpass', label: 'LP' },
  { value: 'highpass', label: 'HP' },
  { value: 'bandpass', label: 'BP' },
  { value: 'bandstop', label: 'BS' },
]

const WINDOW_TYPES: WindowType[] = ['rectangular', 'hann', 'hamming', 'blackman', 'kaiser', 'flat-top']

const PLOT_W = 350
const PLOT_H = 180
const PAD = { top: 20, right: 15, bottom: 30, left: 50 }
const INNER_W = PLOT_W - PAD.left - PAD.right
const INNER_H = PLOT_H - PAD.top - PAD.bottom

const EDUCATIONAL_INFO: Record<FilterType, string> = {
  lowpass: 'A lowpass filter passes frequencies below the cutoff and attenuates those above. Built using a windowed sinc function: h[n] = sin(2*pi*fc*n)/(pi*n), then multiplied by a window to control sidelobe levels.',
  highpass: 'A highpass filter passes frequencies above the cutoff. It is created by spectrally inverting a lowpass filter: negate all coefficients and add 1 to the center tap.',
  bandpass: 'A bandpass filter passes a range of frequencies between two cutoffs. It is the difference of two lowpass filters: one at the upper cutoff minus one at the lower cutoff.',
  bandstop: 'A bandstop (notch) filter rejects a range of frequencies. It combines a lowpass filter (below the band) with a highpass filter (above the band).',
}

export function FilterFull() {
  const state = useFilterState()
  const needsDualCutoff = state.filterType === 'bandpass' || state.filterType === 'bandstop'

  return (
    <div className="flex-1 flex flex-col overflow-auto p-4 gap-4" style={{ backgroundColor: 'var(--sf-bg-primary)' }}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Filter type buttons */}
        <div>
          <div className="text-[9px] mb-1" style={{ color: 'var(--sf-text-dim)' }}>FILTER TYPE</div>
          <div className="flex gap-1">
            {FILTER_TYPES.map(ft => (
              <button key={ft.value} onClick={() => state.setFilterType(ft.value)}
                className="px-3 py-1 text-[11px] rounded cursor-pointer"
                style={{
                  backgroundColor: state.filterType === ft.value ? 'var(--sf-accent-blue)' : 'var(--sf-bg-control)',
                  color: state.filterType === ft.value ? 'var(--sf-bg-primary)' : 'var(--sf-text-primary)',
                  border: `1px solid ${state.filterType === ft.value ? 'var(--sf-accent-blue)' : 'var(--sf-border)'}`,
                }}>
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Window type dropdown */}
        <div>
          <div className="text-[9px] mb-1" style={{ color: 'var(--sf-text-dim)' }}>WINDOW</div>
          <select value={state.windowType} onChange={e => state.setWindowType(e.target.value as WindowType)}
            className="rounded text-[11px] px-2 py-1"
            style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }}>
            {WINDOW_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Order input */}
        <div>
          <div className="text-[9px] mb-1" style={{ color: 'var(--sf-text-dim)' }}>ORDER (taps)</div>
          <input type="number" min={3} max={501} step={2} value={state.order}
            onChange={e => {
              let v = parseInt(e.target.value, 10)
              if (!isNaN(v)) {
                if (v % 2 === 0) v += 1
                state.setOrder(Math.max(3, Math.min(501, v)))
              }
            }}
            className="w-20 rounded text-[11px] px-2 py-1"
            style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
        </div>

        {/* Cutoff frequencies */}
        <div>
          <div className="text-[9px] mb-1" style={{ color: 'var(--sf-text-dim)' }}>
            {needsDualCutoff ? 'CUTOFF LOW (Hz)' : 'CUTOFF (Hz)'}
          </div>
          <input type="number" min={1} max={state.sampleRate / 2 - 1} value={state.cutoffLow}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) state.setCutoffLow(Math.max(1, Math.min(state.sampleRate / 2 - 1, v)))
            }}
            className="w-24 rounded text-[11px] px-2 py-1"
            style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
        </div>

        {needsDualCutoff && (
          <div>
            <div className="text-[9px] mb-1" style={{ color: 'var(--sf-text-dim)' }}>CUTOFF HIGH (Hz)</div>
            <input type="number" min={state.cutoffLow + 1} max={state.sampleRate / 2 - 1} value={state.cutoffHigh}
              onChange={e => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v)) state.setCutoffHigh(Math.max(state.cutoffLow + 1, Math.min(state.sampleRate / 2 - 1, v)))
              }}
              className="w-24 rounded text-[11px] px-2 py-1"
              style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)', border: '1px solid var(--sf-border)' }} />
          </div>
        )}
      </div>

      {/* 2x2 plot grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlotCard title="Magnitude Response" color="var(--sf-accent-blue)"
          data={state.magnitudeResponse} xData={state.frequencies}
          xLabel="Frequency (Hz)" yLabel="dB" yDomain={[-100, 5]} />
        <PlotCard title="Phase Response" color="var(--sf-accent-green)"
          data={state.phaseResponse} xData={state.frequencies}
          xLabel="Frequency (Hz)" yLabel="Radians" yDomain={[-Math.PI, Math.PI]} />
        <PlotCard title="Group Delay" color="var(--sf-marker-yellow)"
          data={state.groupDelay} xData={state.frequencies}
          xLabel="Frequency (Hz)" yLabel="Samples" />
        <ImpulseCard title="Impulse Response" color="#00e5ff"
          data={state.impulseResponse} />
      </div>

      {/* Educational section */}
      <div className="rounded p-3" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--sf-accent-green)' }}>HOW IT WORKS</div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
          {EDUCATIONAL_INFO[state.filterType]}
        </p>
        <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--sf-text-muted)' }}>
          <strong style={{ color: 'var(--sf-text-primary)' }}>Window effect:</strong> The window function controls the trade-off between main lobe width (transition band sharpness) and sidelobe level (stopband attenuation). A rectangular window gives the narrowest main lobe but the highest sidelobes (-13 dB). Hamming achieves -43 dB sidelobes. Blackman reaches -58 dB at the cost of a wider transition band.
        </p>
      </div>
    </div>
  )
}

/* ---- SVG Plot Components ---- */

interface PlotCardProps {
  title: string
  color: string
  data: Float64Array
  xData: Float64Array
  xLabel: string
  yLabel: string
  yDomain?: [number, number]
}

function PlotCard({ title, color, data, xData, xLabel, yLabel, yDomain }: PlotCardProps) {
  const xMin = xData[0]
  const xMax = xData[xData.length - 1]

  let yMin: number, yMax: number
  if (yDomain) {
    [yMin, yMax] = yDomain
  } else {
    yMin = Infinity
    yMax = -Infinity
    for (let i = 0; i < data.length; i++) {
      if (isFinite(data[i])) {
        if (data[i] < yMin) yMin = data[i]
        if (data[i] > yMax) yMax = data[i]
      }
    }
    const margin = (yMax - yMin) * 0.1 || 1
    yMin -= margin
    yMax += margin
  }

  const toX = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * INNER_W
  const toY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * INNER_H

  const pathParts: string[] = []
  for (let i = 0; i < data.length; i++) {
    const y = isFinite(data[i]) ? Math.max(yMin, Math.min(yMax, data[i])) : yMin
    pathParts.push(`${i === 0 ? 'M' : 'L'}${toX(xData[i]).toFixed(1)},${toY(y).toFixed(1)}`)
  }

  return (
    <div className="rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
      <div className="text-[9px] font-semibold px-2 pt-1" style={{ color }}>{title}</div>
      <svg width={PLOT_W} height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="w-full h-auto">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line key={`h-${frac}`} x1={PAD.left} x2={PAD.left + INNER_W}
            y1={PAD.top + frac * INNER_H} y2={PAD.top + frac * INNER_H}
            stroke="var(--sf-border)" strokeWidth={0.5} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line key={`v-${frac}`} x1={PAD.left + frac * INNER_W} x2={PAD.left + frac * INNER_W}
            y1={PAD.top} y2={PAD.top + INNER_H}
            stroke="var(--sf-border)" strokeWidth={0.5} />
        ))}
        {/* Trace */}
        <path d={pathParts.join('')} fill="none" stroke={color} strokeWidth={1.5} />
        {/* Axes labels */}
        <text x={PAD.left + INNER_W / 2} y={PLOT_H - 4} textAnchor="middle"
          fill="var(--sf-text-dim)" fontSize={8}>{xLabel}</text>
        <text x={8} y={PAD.top + INNER_H / 2} textAnchor="middle"
          fill="var(--sf-text-dim)" fontSize={8} transform={`rotate(-90,8,${PAD.top + INNER_H / 2})`}>{yLabel}</text>
        {/* Y-axis ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`yt-${frac}`} x={PAD.left - 4} y={PAD.top + frac * INNER_H + 3}
            textAnchor="end" fill="var(--sf-text-dim)" fontSize={7}>
            {(yMax - frac * (yMax - yMin)).toFixed(yMax - yMin > 10 ? 0 : 1)}
          </text>
        ))}
        {/* X-axis ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`xt-${frac}`} x={PAD.left + frac * INNER_W} y={PAD.top + INNER_H + 14}
            textAnchor="middle" fill="var(--sf-text-dim)" fontSize={7}>
            {(xMin + frac * (xMax - xMin)).toFixed(0)}
          </text>
        ))}
      </svg>
    </div>
  )
}

interface ImpulseCardProps {
  title: string
  color: string
  data: Float64Array
}

function ImpulseCard({ title, color, data }: ImpulseCardProps) {
  let yMin = Infinity, yMax = -Infinity
  for (let i = 0; i < data.length; i++) {
    if (data[i] < yMin) yMin = data[i]
    if (data[i] > yMax) yMax = data[i]
  }
  const margin = (yMax - yMin) * 0.1 || 0.01
  yMin -= margin
  yMax += margin

  const toX = (n: number) => PAD.left + (n / (data.length - 1)) * INNER_W
  const toY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * INNER_H
  const zeroY = toY(0)

  return (
    <div className="rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
      <div className="text-[9px] font-semibold px-2 pt-1" style={{ color }}>
        {title}
      </div>
      <svg width={PLOT_W} height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="w-full h-auto">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line key={`h-${frac}`} x1={PAD.left} x2={PAD.left + INNER_W}
            y1={PAD.top + frac * INNER_H} y2={PAD.top + frac * INNER_H}
            stroke="var(--sf-border)" strokeWidth={0.5} />
        ))}
        {/* Zero line */}
        <line x1={PAD.left} x2={PAD.left + INNER_W} y1={zeroY} y2={zeroY}
          stroke="var(--sf-text-dim)" strokeWidth={0.5} strokeDasharray="3,3" />
        {/* Stems */}
        {Array.from(data).map((v, n) => (
          <line key={n} x1={toX(n)} x2={toX(n)} y1={zeroY} y2={toY(v)}
            stroke={color} strokeWidth={data.length > 100 ? 0.5 : 1} opacity={0.8} />
        ))}
        {/* Labels */}
        <text x={PAD.left + INNER_W / 2} y={PLOT_H - 4} textAnchor="middle"
          fill="var(--sf-text-dim)" fontSize={8}>Sample</text>
        <text x={8} y={PAD.top + INNER_H / 2} textAnchor="middle"
          fill="var(--sf-text-dim)" fontSize={8} transform={`rotate(-90,8,${PAD.top + INNER_H / 2})`}>Amplitude</text>
        {/* Y ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`yt-${frac}`} x={PAD.left - 4} y={PAD.top + frac * INNER_H + 3}
            textAnchor="end" fill="var(--sf-text-dim)" fontSize={7}>
            {(yMax - frac * (yMax - yMin)).toFixed(3)}
          </text>
        ))}
        {/* X ticks */}
        {[0, 0.5, 1].map(frac => (
          <text key={`xt-${frac}`} x={PAD.left + frac * INNER_W} y={PAD.top + INNER_H + 14}
            textAnchor="middle" fill="var(--sf-text-dim)" fontSize={7}>
            {Math.round(frac * (data.length - 1))}
          </text>
        ))}
      </svg>
    </div>
  )
}
