import { useState, useMemo } from 'react'
import { fspl } from '../../utils/rf-math'

const FREQ_PRESETS = [
  { label: '433 MHz', hz: 433e6 },
  { label: '915 MHz', hz: 915e6 },
  { label: '2.4 GHz', hz: 2.4e9 },
  { label: '5.8 GHz', hz: 5.8e9 },
  { label: '28 GHz', hz: 28e9 },
]

export function FSPLCalc() {
  const [frequency, setFrequency] = useState(2.4e9)
  const [distance, setDistance] = useState(100)

  const loss = useMemo(() => fspl(frequency, distance), [frequency, distance])

  const chartW = 500
  const chartH = 200
  const maxDist = distance * 5 || 1000
  const points = 100

  const lines = useMemo(() => {
    return FREQ_PRESETS.map(preset => {
      const pts: { x: number; y: number }[] = []
      for (let i = 1; i <= points; i++) {
        const d = (i / points) * maxDist
        pts.push({ x: d, y: fspl(preset.hz, d) })
      }
      return { label: preset.label, pts }
    })
  }, [maxDist])

  const yMin = Math.min(...lines.flatMap(l => l.pts.map(p => p.y)))
  const yMax = Math.max(...lines.flatMap(l => l.pts.map(p => p.y)))
  const yRange = yMax - yMin || 1

  const colors = ['var(--sf-accent-blue)', 'var(--sf-accent-green)', 'var(--sf-marker-yellow)', 'var(--sf-marker-orange)', 'var(--sf-marker-purple)']

  const toSvgX = (d: number) => 50 + (d / maxDist) * (chartW - 70)
  const toSvgY = (v: number) => 20 + ((v - yMin) / yRange) * (chartH - 40)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Free Space Path Loss</h2>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Frequency (GHz)</span>
          <input type="number" value={frequency / 1e9} step={0.1}
            onChange={e => setFrequency((parseFloat(e.target.value) || 0.001) * 1e9)}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Distance (m)</span>
          <input type="number" value={distance} step={10}
            onChange={e => setDistance(parseFloat(e.target.value) || 1)}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
      </div>

      <div className="p-3 rounded mb-4 inline-block" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>FSPL</div>
        <div className="text-lg font-mono font-bold" style={{ color: 'var(--sf-marker-red)' }}>{loss.toFixed(2)} dB</div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-dim)' }}>Loss vs Distance</div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ maxWidth: chartW, height: 'auto' }}>
          {/* Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => {
            const val = yMin + frac * yRange
            return (
              <text key={frac} x={46} y={toSvgY(val) + 3} textAnchor="end" fontSize={9} fill="var(--sf-text-dim)">
                {val.toFixed(0)}
              </text>
            )
          })}
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => (
            <line key={frac} x1={50} y1={toSvgY(yMin + frac * yRange)} x2={chartW - 20} y2={toSvgY(yMin + frac * yRange)}
              stroke="var(--sf-border)" strokeWidth={0.5} />
          ))}
          {/* Lines */}
          {lines.map((line, li) => (
            <polyline key={li}
              points={line.pts.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
              fill="none" stroke={colors[li]} strokeWidth={1.5} opacity={0.8} />
          ))}
          {/* Legend */}
          {lines.map((line, li) => (
            <g key={li} transform={`translate(${chartW - 90}, ${20 + li * 14})`}>
              <line x1={0} y1={0} x2={12} y2={0} stroke={colors[li]} strokeWidth={2} />
              <text x={16} y={3} fontSize={9} fill="var(--sf-text-muted)">{line.label}</text>
            </g>
          ))}
          {/* X axis label */}
          <text x={chartW / 2} y={chartH - 2} textAnchor="middle" fontSize={9} fill="var(--sf-text-dim)">Distance (m)</text>
        </svg>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: FSPL</summary>
        <p className="mb-1">Free Space Path Loss models signal attenuation in a clear line-of-sight path:</p>
        <p className="font-mono text-[10px]">FSPL(dB) = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)</p>
        <p className="mt-1">Loss increases 6 dB per doubling of distance (inverse square law) and 6 dB per doubling of frequency.</p>
      </details>
    </div>
  )
}
