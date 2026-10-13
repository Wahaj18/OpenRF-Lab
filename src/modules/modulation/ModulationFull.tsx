import { useMemo } from 'react'
import { useModulationState, type ModulationType } from './useModulationState'

const ANALOG_TYPES: { id: ModulationType; label: string }[] = [
  { id: 'am', label: 'AM' },
  { id: 'fm', label: 'FM' },
]

const DIGITAL_TYPES: { id: ModulationType; label: string }[] = [
  { id: 'bpsk', label: 'BPSK' },
  { id: 'qpsk', label: 'QPSK' },
  { id: '8psk', label: '8PSK' },
  { id: '16qam', label: '16-QAM' },
  { id: '64qam', label: '64-QAM' },
  { id: '256qam', label: '256-QAM' },
]

const EDUCATION_INFO: Record<ModulationType, { title: string; description: string }> = {
  am: {
    title: 'Amplitude Modulation (AM)',
    description: 'AM encodes information by varying the amplitude of a carrier wave. The modulation index controls the depth of modulation. Simple to implement but spectrally inefficient, using twice the message bandwidth.',
  },
  fm: {
    title: 'Frequency Modulation (FM)',
    description: 'FM encodes information by varying the instantaneous frequency of the carrier. More resistant to noise than AM because information is in frequency, not amplitude. The modulation index determines bandwidth via Carson\'s rule.',
  },
  bpsk: {
    title: 'Binary Phase-Shift Keying (BPSK)',
    description: 'BPSK maps 1 bit per symbol using two constellation points at 0 and 180 degrees. Most robust digital scheme but lowest spectral efficiency (1 bit/symbol). Used where reliability is critical.',
  },
  qpsk: {
    title: 'Quadrature Phase-Shift Keying (QPSK)',
    description: 'QPSK maps 2 bits per symbol using four points equally spaced on the unit circle. Double the throughput of BPSK at the same symbol rate. Widely used in satellite and cellular communications.',
  },
  '8psk': {
    title: '8-Phase-Shift Keying (8PSK)',
    description: '8PSK maps 3 bits per symbol using eight equally-spaced points on the unit circle. Higher spectral efficiency than QPSK but requires better SNR. Used in EDGE cellular and satellite links.',
  },
  '16qam': {
    title: '16-QAM (Quadrature Amplitude Modulation)',
    description: '16-QAM maps 4 bits per symbol on a 4x4 grid using both amplitude and phase. Provides 4x the throughput of BPSK. Common in Wi-Fi (802.11), LTE, and cable modems.',
  },
  '64qam': {
    title: '64-QAM',
    description: '64-QAM maps 6 bits per symbol on an 8x8 grid. High spectral efficiency (6 bits/Hz/s) but requires SNR above ~26 dB. Used in LTE, Wi-Fi, and digital cable TV.',
  },
  '256qam': {
    title: '256-QAM',
    description: '256-QAM maps 8 bits per symbol on a 16x16 grid. Very high spectral efficiency but demands SNR above ~32 dB. Used in DOCSIS 3.1 cable and Wi-Fi 6 under ideal channel conditions.',
  },
}

function TypeButton({
  id, label, active, onClick,
}: {
  id: ModulationType; label: string; active: boolean; onClick: (t: ModulationType) => void
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className="px-3 py-1.5 text-[11px] font-medium rounded transition-colors"
      style={{
        backgroundColor: active ? 'var(--sf-accent-blue)' : 'var(--sf-bg-control)',
        color: active ? 'var(--sf-bg-primary)' : 'var(--sf-text-muted)',
        border: `1px solid ${active ? 'var(--sf-accent-blue)' : 'var(--sf-border)'}`,
      }}
    >
      {label}
    </button>
  )
}

function ConstellationDiagram({
  width, height, idealPoints, noisyPoints,
}: {
  width: number; height: number
  idealPoints: { i: number; q: number }[]
  noisyPoints: { i: number; q: number }[]
}) {
  const pad = 30
  const plotW = width - 2 * pad
  const plotH = height - 2 * pad
  const maxRange = useMemo(() => {
    let max = 1
    for (const p of [...idealPoints, ...noisyPoints]) {
      max = Math.max(max, Math.abs(p.i), Math.abs(p.q))
    }
    return max * 1.3
  }, [idealPoints, noisyPoints])

  const toX = (v: number) => pad + ((v + maxRange) / (2 * maxRange)) * plotW
  const toY = (v: number) => pad + ((maxRange - v) / (2 * maxRange)) * plotH

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      {/* Grid */}
      <line x1={toX(-maxRange)} y1={toY(0)} x2={toX(maxRange)} y2={toY(0)}
        stroke="var(--sf-border)" strokeWidth={1} />
      <line x1={toX(0)} y1={toY(-maxRange)} x2={toX(0)} y2={toY(maxRange)}
        stroke="var(--sf-border)" strokeWidth={1} />
      {/* Axis labels */}
      <text x={width - pad + 4} y={toY(0) + 4} fill="var(--sf-text-dim)" fontSize={10}>I</text>
      <text x={toX(0) + 4} y={pad - 6} fill="var(--sf-text-dim)" fontSize={10}>Q</text>
      {/* Noisy points */}
      {noisyPoints.map((p, idx) => (
        <circle key={idx} cx={toX(p.i)} cy={toY(p.q)} r={1.5}
          fill="var(--sf-accent-blue)" opacity={0.4} />
      ))}
      {/* Ideal points */}
      {idealPoints.map((p, idx) => (
        <circle key={`ideal-${idx}`} cx={toX(p.i)} cy={toY(p.q)} r={5}
          fill="none" stroke="var(--sf-accent-green)" strokeWidth={2} />
      ))}
    </svg>
  )
}

function TimeDomainPlot({
  width, height, signal,
}: {
  width: number; height: number; signal: number[]
}) {
  const pad = 30
  const plotW = width - 2 * pad
  const plotH = height - 2 * pad

  const pathD = useMemo(() => {
    if (signal.length === 0) return ''
    const maxSamples = Math.min(signal.length, 512)
    let maxAmp = 0
    for (let n = 0; n < maxSamples; n++) {
      maxAmp = Math.max(maxAmp, Math.abs(signal[n]))
    }
    if (maxAmp === 0) maxAmp = 1

    const parts: string[] = []
    for (let n = 0; n < maxSamples; n++) {
      const x = pad + (n / (maxSamples - 1)) * plotW
      const y = pad + ((maxAmp - signal[n]) / (2 * maxAmp)) * plotH
      parts.push(n === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return parts.join(' ')
  }, [signal, plotW, plotH])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      <line x1={pad} y1={pad + plotH / 2} x2={pad + plotW} y2={pad + plotH / 2}
        stroke="var(--sf-border)" strokeWidth={1} />
      <text x={pad + plotW / 2} y={height - 4} fill="var(--sf-text-dim)" fontSize={10}
        textAnchor="middle">Time</text>
      <text x={4} y={pad + plotH / 2} fill="var(--sf-text-dim)" fontSize={10}
        dominantBaseline="middle">A</text>
      {pathD && (
        <path d={pathD} fill="none" stroke="var(--sf-accent-blue)" strokeWidth={1.2} />
      )}
    </svg>
  )
}

function SpectrumPlot({
  width, height, noisyPoints,
}: {
  width: number; height: number; noisyPoints: { i: number; q: number }[]
}) {
  const pad = 30
  const plotW = width - 2 * pad
  const plotH = height - 2 * pad

  const magnitudes = useMemo(() => {
    if (noisyPoints.length === 0) return []
    const fftSize = 256
    const reArr = new Array(fftSize).fill(0)
    const imArr = new Array(fftSize).fill(0)
    const count = Math.min(noisyPoints.length, fftSize)
    for (let n = 0; n < count; n++) {
      reArr[n] = noisyPoints[n].i
      imArr[n] = noisyPoints[n].q
    }
    const mags: number[] = new Array(fftSize)
    for (let k = 0; k < fftSize; k++) {
      let sumRe = 0, sumIm = 0
      for (let n = 0; n < fftSize; n++) {
        const angle = (2 * Math.PI * k * n) / fftSize
        sumRe += reArr[n] * Math.cos(angle) + imArr[n] * Math.sin(angle)
        sumIm += imArr[n] * Math.cos(angle) - reArr[n] * Math.sin(angle)
      }
      mags[k] = 10 * Math.log10(Math.max(1e-12, sumRe * sumRe + sumIm * sumIm))
    }
    return mags
  }, [noisyPoints])

  const pathD = useMemo(() => {
    if (magnitudes.length === 0) return ''
    let maxVal = -Infinity, minVal = Infinity
    for (const m of magnitudes) {
      if (m > maxVal) maxVal = m
      if (m < minVal) minVal = m
    }
    const range = maxVal - minVal || 1
    const parts: string[] = []
    for (let k = 0; k < magnitudes.length; k++) {
      const x = pad + (k / (magnitudes.length - 1)) * plotW
      const y = pad + ((maxVal - magnitudes[k]) / range) * plotH
      parts.push(k === 0 ? `M${x},${y}` : `L${x},${y}`)
    }
    return parts.join(' ')
  }, [magnitudes, plotW, plotH])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      <line x1={pad} y1={pad} x2={pad} y2={pad + plotH}
        stroke="var(--sf-border)" strokeWidth={1} />
      <line x1={pad} y1={pad + plotH} x2={pad + plotW} y2={pad + plotH}
        stroke="var(--sf-border)" strokeWidth={1} />
      <text x={pad + plotW / 2} y={height - 4} fill="var(--sf-text-dim)" fontSize={10}
        textAnchor="middle">Frequency Bin</text>
      <text x={4} y={pad + plotH / 2} fill="var(--sf-text-dim)" fontSize={10}
        dominantBaseline="middle" transform={`rotate(-90, 4, ${pad + plotH / 2})`}>dB</text>
      {pathD && (
        <path d={pathD} fill="none" stroke="var(--sf-accent-green)" strokeWidth={1.2} />
      )}
    </svg>
  )
}

export function ModulationFull() {
  const state = useModulationState()
  const info = EDUCATION_INFO[state.modulationType]

  return (
    <div className="flex-1 flex flex-col overflow-auto p-4 gap-4"
      style={{ backgroundColor: 'var(--sf-bg-primary)' }}>
      {/* Type selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-1 font-semibold uppercase tracking-wider"
            style={{ color: 'var(--sf-text-dim)' }}>Analog</span>
          {ANALOG_TYPES.map(t => (
            <TypeButton key={t.id} id={t.id} label={t.label}
              active={state.modulationType === t.id}
              onClick={state.setModulationType} />
          ))}
        </div>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--sf-border)' }} />
        <div className="flex items-center gap-1">
          <span className="text-[10px] mr-1 font-semibold uppercase tracking-wider"
            style={{ color: 'var(--sf-text-dim)' }}>Digital</span>
          {DIGITAL_TYPES.map(t => (
            <TypeButton key={t.id} id={t.id} label={t.label}
              active={state.modulationType === t.id}
              onClick={state.setModulationType} />
          ))}
        </div>
      </div>

      {/* Plots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.isDigital ? (
          <>
            <div className="rounded overflow-hidden"
              style={{ border: '1px solid var(--sf-border)' }}>
              <div className="text-[10px] px-2 py-1 font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: 'var(--sf-text-dim)' }}>
                Constellation Diagram
              </div>
              <ConstellationDiagram
                width={350} height={350}
                idealPoints={state.idealPoints}
                noisyPoints={state.constellationPoints}
              />
            </div>
            <div className="rounded overflow-hidden"
              style={{ border: '1px solid var(--sf-border)' }}>
              <div className="text-[10px] px-2 py-1 font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: 'var(--sf-text-dim)' }}>
                Time-Domain Waveform
              </div>
              <TimeDomainPlot
                width={350} height={350}
                signal={state.timeDomainSignal}
              />
            </div>
            <div className="rounded overflow-hidden"
              style={{ border: '1px solid var(--sf-border)' }}>
              <div className="text-[10px] px-2 py-1 font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: 'var(--sf-text-dim)' }}>
                Signal Spectrum
              </div>
              <SpectrumPlot
                width={350} height={350}
                noisyPoints={state.constellationPoints}
              />
            </div>
          </>
        ) : (
          <>
            <div className="rounded overflow-hidden"
              style={{ border: '1px solid var(--sf-border)' }}>
              <div className="text-[10px] px-2 py-1 font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: 'var(--sf-text-dim)' }}>
                Time-Domain Waveform
              </div>
              <TimeDomainPlot
                width={350} height={350}
                signal={state.timeDomainSignal}
              />
            </div>
            <div className="rounded overflow-hidden"
              style={{ border: '1px solid var(--sf-border)' }}>
              <div className="text-[10px] px-2 py-1 font-semibold uppercase tracking-wider"
                style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: 'var(--sf-text-dim)' }}>
                Constellation (N/A for Analog)
              </div>
              <svg width={350} height={350} style={{ backgroundColor: 'var(--sf-bg-control)' }}>
                <text x={175} y={175} fill="var(--sf-text-dim)" fontSize={12}
                  textAnchor="middle" dominantBaseline="middle">
                  Analog mode - no constellation
                </text>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-end flex-wrap rounded p-3"
        style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--sf-text-dim)' }}>
            SNR (dB): {state.snr}
          </label>
          <input type="range" min={0} max={40} step={1} value={state.snr}
            onChange={e => state.setSnr(Number(e.target.value))}
            className="w-48 accent-[var(--sf-accent-blue)]" />
        </div>
        {state.isDigital && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--sf-text-dim)' }}>
              Symbol Rate (sym/s): {state.symbolRate}
            </label>
            <input type="range" min={10} max={500} step={10} value={state.symbolRate}
              onChange={e => state.setSymbolRate(Number(e.target.value))}
              className="w-48 accent-[var(--sf-accent-blue)]" />
          </div>
        )}
        {!state.isDigital && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--sf-text-dim)' }}>
                Carrier Freq (Hz): {state.carrierFreq}
              </label>
              <input type="range" min={100} max={4000} step={100} value={state.carrierFreq}
                onChange={e => state.setCarrierFreq(Number(e.target.value))}
                className="w-48 accent-[var(--sf-accent-blue)]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--sf-text-dim)' }}>
                Modulation Index: {state.modulationIndex.toFixed(2)}
              </label>
              <input type="range" min={0.1} max={5.0} step={0.1} value={state.modulationIndex}
                onChange={e => state.setModulationIndex(Number(e.target.value))}
                className="w-48 accent-[var(--sf-accent-blue)]" />
            </div>
          </>
        )}
      </div>

      {/* Educational section */}
      <div className="rounded p-3"
        style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--sf-accent-green)' }}>
          {info.title}
        </div>
        <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--sf-text-muted)' }}>
          {info.description}
        </p>
        {state.isDigital && (
          <div className="flex gap-6 text-[11px] flex-wrap" style={{ color: 'var(--sf-text-primary)' }}>
            <span>
              Bits per symbol: <strong style={{ color: 'var(--sf-accent-blue)' }}>{state.bitsPerSymbol}</strong>
            </span>
            <span>
              Spectral efficiency: <strong style={{ color: 'var(--sf-accent-blue)' }}>
                {state.bitsPerSymbol} bit/s/Hz
              </strong>
            </span>
            <span>
              Throughput: <strong style={{ color: 'var(--sf-accent-blue)' }}>
                {state.throughput >= 1000 ? `${(state.throughput / 1000).toFixed(1)} kbit/s` : `${state.throughput} bit/s`}
              </strong>
            </span>
            <span>
              Constellation size: <strong style={{ color: 'var(--sf-accent-blue)' }}>
                {state.idealPoints.length} points
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
