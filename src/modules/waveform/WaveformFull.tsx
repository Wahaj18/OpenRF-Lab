import { useState } from 'react'
import { useWaveformState, type WaveformType } from './useWaveformState'

const WAVEFORM_TYPES: { value: WaveformType; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'chirp', label: 'Chirp' },
  { value: 'pulse', label: 'Pulse' },
]

const EDUCATIONAL_CONTENT: Record<WaveformType, { title: string; description: string; fourier: string }> = {
  sine: {
    title: 'Sine Wave',
    description: 'The fundamental building block of all signals. A pure tone at a single frequency.',
    fourier: 'A single spectral line at the fundamental frequency. No harmonics present.',
  },
  square: {
    title: 'Square Wave',
    description: 'A periodic waveform that alternates between two levels. Common in digital clocks and PWM.',
    fourier: 'Contains only odd harmonics (1f, 3f, 5f, ...) with amplitudes decreasing as 1/n. The duty cycle affects the harmonic content.',
  },
  sawtooth: {
    title: 'Sawtooth Wave',
    description: 'A linearly rising waveform that resets sharply. Used in frequency sweeps and synthesis.',
    fourier: 'Contains all harmonics (1f, 2f, 3f, ...) with amplitudes decreasing as 1/n.',
  },
  triangle: {
    title: 'Triangle Wave',
    description: 'A linearly rising and falling waveform. Smoother than square waves with faster harmonic rolloff.',
    fourier: 'Contains only odd harmonics (1f, 3f, 5f, ...) with amplitudes decreasing as 1/n\u00b2, much faster than a square wave.',
  },
  chirp: {
    title: 'Linear Chirp',
    description: 'A signal whose frequency increases linearly over time from f to 4f. Used in radar and spread spectrum.',
    fourier: 'Energy is spread across the swept frequency band. The spectrum approximates a flat band from f to 4f.',
  },
  pulse: {
    title: 'Pulse Train',
    description: 'A rectangular pulse with adjustable duty cycle. Fundamental to radar and digital communications.',
    fourier: 'Spectrum follows a sinc function envelope. The main lobe width is inversely proportional to pulse width.',
  },
}

const PLOT_W = 350
const PLOT_H = 200
const MARGIN = { top: 15, right: 10, bottom: 25, left: 45 }
const INNER_W = PLOT_W - MARGIN.left - MARGIN.right
const INNER_H = PLOT_H - MARGIN.top - MARGIN.bottom

function TimeDomainPlot({ samples }: { samples: Float64Array }) {
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

  const yTicks = 5
  const yTickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(yMin + (i / yTicks) * (yMax - yMin))
  }

  return (
    <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="w-full h-auto" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      {/* Grid */}
      {yTickValues.map((v, i) => (
        <line key={i} x1={MARGIN.left} x2={PLOT_W - MARGIN.right}
          y1={yScale(v)} y2={yScale(v)}
          stroke="var(--sf-border)" strokeWidth={0.5} strokeDasharray="2,2" />
      ))}
      {/* Y axis labels */}
      {yTickValues.map((v, i) => (
        <text key={`t${i}`} x={MARGIN.left - 4} y={yScale(v) + 3}
          textAnchor="end" fontSize={8} fill="var(--sf-text-muted)">
          {v.toFixed(2)}
        </text>
      ))}
      {/* Trace */}
      <path d={points.join('')} fill="none" stroke="var(--sf-accent-blue)" strokeWidth={1.5} />
      {/* Axis labels */}
      <text x={MARGIN.left + INNER_W / 2} y={PLOT_H - 3}
        textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)">
        Sample Index
      </text>
      <text x={12} y={MARGIN.top + INNER_H / 2}
        textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)"
        transform={`rotate(-90, 12, ${MARGIN.top + INNER_H / 2})`}>
        Amplitude
      </text>
      {/* Border */}
      <rect x={MARGIN.left} y={MARGIN.top} width={INNER_W} height={INNER_H}
        fill="none" stroke="var(--sf-border)" strokeWidth={1} />
    </svg>
  )
}

function FrequencyDomainPlot({ spectrum, freqAxis }: { spectrum: Float64Array; freqAxis: number[] }) {
  const count = spectrum.length
  let yMin = Infinity
  let yMax = -Infinity
  for (let i = 0; i < count; i++) {
    if (spectrum[i] > -140) {
      if (spectrum[i] < yMin) yMin = spectrum[i]
      if (spectrum[i] > yMax) yMax = spectrum[i]
    }
  }
  if (yMin === Infinity) { yMin = -120; yMax = 0 }
  const yPad = (yMax - yMin) * 0.1 || 10
  yMin = Math.max(yMin - yPad, -150)
  yMax += yPad

  const fMax = freqAxis[freqAxis.length - 1]
  const xScale = (f: number) => MARGIN.left + (f / fMax) * INNER_W
  const yScale = (v: number) => MARGIN.top + INNER_H - ((v - yMin) / (yMax - yMin)) * INNER_H

  const points: string[] = []
  for (let i = 0; i < count; i++) {
    const clamped = Math.max(spectrum[i], yMin)
    const x = xScale(freqAxis[i]).toFixed(1)
    const y = yScale(clamped).toFixed(1)
    points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }

  const yTicks = 5
  const yTickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(yMin + (i / yTicks) * (yMax - yMin))
  }

  const xTicks = 4
  const xTickValues: number[] = []
  for (let i = 0; i <= xTicks; i++) {
    xTickValues.push((i / xTicks) * fMax)
  }

  return (
    <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="w-full h-auto" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      {/* Grid */}
      {yTickValues.map((v, i) => (
        <line key={`yg${i}`} x1={MARGIN.left} x2={PLOT_W - MARGIN.right}
          y1={yScale(v)} y2={yScale(v)}
          stroke="var(--sf-border)" strokeWidth={0.5} strokeDasharray="2,2" />
      ))}
      {xTickValues.map((f, i) => (
        <line key={`xg${i}`} x1={xScale(f)} x2={xScale(f)}
          y1={MARGIN.top} y2={MARGIN.top + INNER_H}
          stroke="var(--sf-border)" strokeWidth={0.5} strokeDasharray="2,2" />
      ))}
      {/* Y axis labels */}
      {yTickValues.map((v, i) => (
        <text key={`yt${i}`} x={MARGIN.left - 4} y={yScale(v) + 3}
          textAnchor="end" fontSize={8} fill="var(--sf-text-muted)">
          {v.toFixed(0)}
        </text>
      ))}
      {/* X axis labels */}
      {xTickValues.map((f, i) => (
        <text key={`xt${i}`} x={xScale(f)} y={PLOT_H - MARGIN.bottom + 14}
          textAnchor="middle" fontSize={8} fill="var(--sf-text-muted)">
          {f >= 1000 ? `${(f / 1000).toFixed(1)}k` : f.toFixed(0)}
        </text>
      ))}
      {/* Trace */}
      <path d={points.join('')} fill="none" stroke="var(--sf-accent-green)" strokeWidth={1.5} />
      {/* Axis labels */}
      <text x={MARGIN.left + INNER_W / 2} y={PLOT_H - 3}
        textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)">
        Frequency (Hz)
      </text>
      <text x={12} y={MARGIN.top + INNER_H / 2}
        textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)"
        transform={`rotate(-90, 12, ${MARGIN.top + INNER_H / 2})`}>
        Magnitude (dB)
      </text>
      {/* Border */}
      <rect x={MARGIN.left} y={MARGIN.top} width={INNER_W} height={INNER_H}
        fill="none" stroke="var(--sf-border)" strokeWidth={1} />
    </svg>
  )
}

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}

function SliderControl({ label, value, min, max, step, unit, onChange }: SliderControlProps) {
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <label className="text-[10px] w-20 text-right shrink-0" style={{ color: 'var(--sf-text-muted)' }}>
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 appearance-none rounded cursor-pointer"
        style={{ accentColor: 'var(--sf-accent-blue)' }}
      />
      <span className="text-[10px] w-16 tabular-nums" style={{ color: 'var(--sf-accent-blue)' }}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Number.isInteger(step) ? value : value.toFixed(2)} {unit}
      </span>
    </div>
  )
}

export function WaveformFull() {
  const state = useWaveformState()
  const [eduOpen, setEduOpen] = useState(true)
  const edu = EDUCATIONAL_CONTENT[state.waveformType]
  const showDutyCycle = state.waveformType === 'square' || state.waveformType === 'pulse'

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--sf-bg-panel)' }}>

      {/* Waveform type selector */}
      <div className="flex gap-1 flex-wrap">
        {WAVEFORM_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => state.setWaveformType(value)}
            className="px-3 py-1.5 rounded text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: state.waveformType === value ? 'var(--sf-accent-blue)' : 'var(--sf-bg-control)',
              color: state.waveformType === value ? 'var(--sf-bg-primary)' : 'var(--sf-text-primary)',
              border: `1px solid ${state.waveformType === value ? 'var(--sf-accent-blue)' : 'var(--sf-border)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] mb-1 text-center" style={{ color: 'var(--sf-text-muted)' }}>
            Time Domain
          </div>
          <TimeDomainPlot samples={state.samples} />
        </div>
        <div>
          <div className="text-[10px] mb-1 text-center" style={{ color: 'var(--sf-text-muted)' }}>
            Frequency Domain
          </div>
          <FrequencyDomainPlot spectrum={state.spectrum} freqAxis={state.freqAxis} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 p-3 rounded"
        style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--sf-text-muted)' }}>
          Parameters
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <SliderControl
            label="Frequency"
            value={state.frequency}
            min={10}
            max={4000}
            step={10}
            unit="Hz"
            onChange={state.setFrequency}
          />
          <SliderControl
            label="Amplitude"
            value={state.amplitude}
            min={0.01}
            max={2.0}
            step={0.01}
            unit=""
            onChange={state.setAmplitude}
          />
          <SliderControl
            label="Phase"
            value={state.phase}
            min={0}
            max={6.28}
            step={0.01}
            unit="rad"
            onChange={state.setPhase}
          />
          {showDutyCycle && (
            <SliderControl
              label="Duty Cycle"
              value={state.dutyCycle}
              min={0.05}
              max={0.95}
              step={0.05}
              unit=""
              onChange={state.setDutyCycle}
            />
          )}
          <SliderControl
            label="Noise Level"
            value={state.noiseLevel}
            min={-100}
            max={0}
            step={1}
            unit="dBm"
            onChange={state.setNoiseLevel}
          />
        </div>
      </div>

      {/* Educational panel */}
      <div className="rounded" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
        <button
          onClick={() => setEduOpen(!eduOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-left"
          style={{ color: 'var(--sf-text-primary)' }}
        >
          <span className="text-[11px] font-medium">{edu.title} — Fourier Properties</span>
          <span className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>
            {eduOpen ? '\u25B2' : '\u25BC'}
          </span>
        </button>
        {eduOpen && (
          <div className="px-3 pb-3 flex flex-col gap-2">
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
              {edu.description}
            </p>
            <div className="p-2 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
              <div className="text-[9px] font-medium mb-1" style={{ color: 'var(--sf-accent-green)' }}>
                Spectrum Characteristics
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
                {edu.fourier}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
