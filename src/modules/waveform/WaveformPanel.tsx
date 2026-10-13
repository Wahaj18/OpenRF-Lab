import { useWaveformState, type WaveformType } from './useWaveformState'
import { useTabManager } from '../../app/TabManager'

const WAVEFORM_OPTIONS: { value: WaveformType; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'chirp', label: 'Chirp' },
  { value: 'pulse', label: 'Pulse' },
]

const PANEL_W = 250
const PLOT_H = 100
const MARGIN = { top: 10, right: 8, bottom: 18, left: 35 }
const INNER_W = PANEL_W - MARGIN.left - MARGIN.right
const INNER_H = PLOT_H - MARGIN.top - MARGIN.bottom

function MiniTimePlot({ samples }: { samples: Float64Array }) {
  const displayCount = Math.min(samples.length, 256)
  let yMin = Infinity
  let yMax = -Infinity
  for (let i = 0; i < displayCount; i++) {
    if (samples[i] < yMin) yMin = samples[i]
    if (samples[i] > yMax) yMax = samples[i]
  }
  const yPad = (yMax - yMin) * 0.1 || 0.1
  yMin -= yPad
  yMax += yPad

  const xScale = (i: number) => MARGIN.left + (i / (displayCount - 1)) * INNER_W
  const yScale = (v: number) => MARGIN.top + INNER_H - ((v - yMin) / (yMax - yMin)) * INNER_H

  const points: string[] = []
  for (let i = 0; i < displayCount; i++) {
    const x = xScale(i).toFixed(1)
    const y = yScale(samples[i]).toFixed(1)
    points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }

  const yTicks = 3
  const yTickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(yMin + (i / yTicks) * (yMax - yMin))
  }

  return (
    <svg width={PANEL_W} height={PLOT_H} style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      {yTickValues.map((v, i) => (
        <line key={i} x1={MARGIN.left} x2={PANEL_W - MARGIN.right}
          y1={yScale(v)} y2={yScale(v)}
          stroke="var(--sf-border)" strokeWidth={0.5} strokeDasharray="2,2" />
      ))}
      {yTickValues.map((v, i) => (
        <text key={`t${i}`} x={MARGIN.left - 3} y={yScale(v) + 3}
          textAnchor="end" fontSize={7} fill="var(--sf-text-muted)">
          {v.toFixed(1)}
        </text>
      ))}
      <path d={points.join('')} fill="none" stroke="var(--sf-accent-blue)" strokeWidth={1.2} />
      <text x={MARGIN.left + INNER_W / 2} y={PLOT_H - 2}
        textAnchor="middle" fontSize={7} fill="var(--sf-text-dim)">
        Time Domain
      </text>
      <rect x={MARGIN.left} y={MARGIN.top} width={INNER_W} height={INNER_H}
        fill="none" stroke="var(--sf-border)" strokeWidth={0.5} />
    </svg>
  )
}

export function WaveformPanel() {
  const state = useWaveformState()
  const { openTab } = useTabManager()

  return (
    <div className="flex flex-col gap-2 p-2" style={{
      backgroundColor: 'var(--sf-bg-panel)',
      width: 280,
    }}>
      {/* Header */}
      <div className="text-[11px] font-medium" style={{ color: 'var(--sf-text-primary)' }}>
        Waveform Designer
      </div>

      {/* Waveform type dropdown */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>Waveform Type</div>
        <select
          value={state.waveformType}
          onChange={e => state.setWaveformType(e.target.value as WaveformType)}
          className="w-full rounded text-[11px] px-1.5 py-1 outline-none appearance-none cursor-pointer"
          style={{
            backgroundColor: 'var(--sf-bg-control)',
            border: '1px solid var(--sf-border)',
            color: 'var(--sf-accent-blue)',
          }}
        >
          {WAVEFORM_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Mini plot */}
      <MiniTimePlot samples={state.samples} />

      {/* Compact controls */}
      <div className="flex flex-col gap-1.5">
        <CompactSlider
          label="Freq"
          value={state.frequency}
          min={10}
          max={4000}
          step={10}
          unit="Hz"
          onChange={state.setFrequency}
        />
        <CompactSlider
          label="Amp"
          value={state.amplitude}
          min={0.01}
          max={2.0}
          step={0.01}
          unit=""
          onChange={state.setAmplitude}
        />
      </div>

      {/* Send to Analyzer button */}
      <button
        onClick={() => openTab('analyzer')}
        className="w-full py-1.5 rounded text-[10px] font-medium transition-colors"
        style={{
          backgroundColor: 'var(--sf-bg-control)',
          border: '1px solid var(--sf-accent-blue)',
          color: 'var(--sf-accent-blue)',
        }}
      >
        Send to Analyzer
      </button>
    </div>
  )
}

interface CompactSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}

function CompactSlider({ label, value, min, max, step, unit, onChange }: CompactSliderProps) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number.isInteger(step) ? String(value) : value.toFixed(2)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] w-8 text-right shrink-0" style={{ color: 'var(--sf-text-dim)' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-0.5 appearance-none rounded cursor-pointer"
        style={{ accentColor: 'var(--sf-accent-blue)' }}
      />
      <span className="text-[9px] w-12 tabular-nums" style={{ color: 'var(--sf-accent-blue)' }}>
        {display} {unit}
      </span>
    </div>
  )
}
