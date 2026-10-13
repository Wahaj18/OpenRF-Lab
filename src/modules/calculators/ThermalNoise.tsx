import { useState, useMemo } from 'react'
import { thermalNoise } from '../../utils/rf-math'

const BW_PRESETS = [
  { label: '1 kHz', hz: 1e3 },
  { label: '10 kHz', hz: 1e4 },
  { label: '100 kHz', hz: 1e5 },
  { label: '1 MHz', hz: 1e6 },
  { label: '10 MHz', hz: 1e7 },
  { label: '20 MHz', hz: 2e7 },
  { label: '100 MHz', hz: 1e8 },
]

export function ThermalNoiseCalc() {
  const [temperature, setTemperature] = useState(290)
  const [bandwidth, setBandwidth] = useState(1e6)

  const noise = useMemo(() => thermalNoise(temperature, bandwidth), [temperature, bandwidth])

  const chartW = 460
  const chartH = 180

  const chartData = useMemo(() => {
    const pts: { bw: number; noise: number; label: string }[] = []
    for (const preset of BW_PRESETS) {
      pts.push({ bw: preset.hz, noise: thermalNoise(temperature, preset.hz), label: preset.label })
    }
    return pts
  }, [temperature])

  const noiseMin = Math.min(...chartData.map(d => d.noise))
  const noiseMax = Math.max(...chartData.map(d => d.noise))
  const noiseRange = noiseMax - noiseMin || 1
  const barW = Math.min(45, (chartW - 80) / chartData.length - 6)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Thermal Noise (kTB)</h2>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Temperature (K)</span>
          <input type="number" value={temperature} step={10}
            onChange={e => setTemperature(parseFloat(e.target.value) || 1)}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Bandwidth (MHz)</span>
          <input type="number" value={bandwidth / 1e6} step={0.1}
            onChange={e => setBandwidth((parseFloat(e.target.value) || 0.001) * 1e6)}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="p-3 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Noise Floor</div>
          <div className="text-lg font-mono font-bold" style={{ color: 'var(--sf-accent-blue)' }}>{noise.toFixed(2)} dBm</div>
        </div>
        <div className="p-3 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Reference: -174 dBm/Hz at 290K</div>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--sf-text-muted)' }}>
            kTB = -174 + 10*log10(BW_Hz) = {(-174 + 10 * Math.log10(bandwidth)).toFixed(1)} dBm
          </div>
        </div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-dim)' }}>
          Noise Floor vs Bandwidth (T = {temperature} K)
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ maxWidth: chartW, height: 'auto' }}>
          {chartData.map((d, i) => {
            const x = 60 + i * (barW + 6)
            const normalized = (d.noise - noiseMin) / noiseRange
            const h = 20 + normalized * (chartH - 50)
            return (
              <g key={i}>
                <rect x={x} y={chartH - 20 - h} width={barW} height={h} rx={2}
                  fill="var(--sf-accent-blue)" opacity={0.6} />
                <text x={x + barW / 2} y={chartH - 22 - h} textAnchor="middle" fontSize={8} fill="var(--sf-text-primary)">
                  {d.noise.toFixed(1)}
                </text>
                <text x={x + barW / 2} y={chartH - 4} textAnchor="middle" fontSize={8} fill="var(--sf-text-dim)">
                  {d.label}
                </text>
              </g>
            )
          })}
          <text x={4} y={12} fontSize={8} fill="var(--sf-text-dim)">dBm</text>
        </svg>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Thermal Noise</summary>
        <p className="mb-1">Johnson-Nyquist noise is the fundamental noise floor due to thermal agitation of electrons:</p>
        <p className="font-mono text-[10px]">N = kTB where k = 1.38e-23 J/K (Boltzmann constant)</p>
        <p className="mt-1">At room temperature (290K), the noise spectral density is -174 dBm/Hz. Each 10x increase in bandwidth adds 10 dB of noise.</p>
      </details>
    </div>
  )
}
