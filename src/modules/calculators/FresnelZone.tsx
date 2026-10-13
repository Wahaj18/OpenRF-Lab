import { useState, useMemo } from 'react'
import { fresnelRadius, freqToWavelength } from '../../utils/rf-math'

export function FresnelZone() {
  const [frequency, setFrequency] = useState(2.4e9)
  const [totalDistance, setTotalDistance] = useState(1000)
  const [pointAlong, setPointAlong] = useState(500)

  const d1 = pointAlong
  const d2 = totalDistance - pointAlong

  const zones = useMemo(() => {
    if (d1 <= 0 || d2 <= 0) return [0, 0, 0]
    return [1, 2, 3].map(n => fresnelRadius(n, frequency, d1, d2))
  }, [frequency, d1, d2])

  const wavelength = freqToWavelength(frequency)

  const svgW = 440
  const svgH = 180
  const midX = svgW / 2
  const midY = svgH / 2
  const maxR = Math.max(...zones, 1)
  const scale = (svgH / 2 - 20) / maxR

  const ellipseRx = (svgW - 80) / 2
  const zoneColors = ['var(--sf-accent-blue)', 'var(--sf-marker-yellow)', 'var(--sf-marker-orange)']

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Fresnel Zone Calculator</h2>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Frequency (GHz)</span>
          <input type="number" value={frequency / 1e9} step={0.1}
            onChange={e => setFrequency((parseFloat(e.target.value) || 0.001) * 1e9)}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Total Distance (m)</span>
          <input type="number" value={totalDistance} step={10}
            onChange={e => { const v = parseFloat(e.target.value) || 1; setTotalDistance(v); setPointAlong(Math.min(pointAlong, v)) }}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Point Along Path (m)</span>
          <input type="number" value={pointAlong} step={10} min={1} max={totalDistance - 1}
            onChange={e => setPointAlong(Math.max(1, Math.min(totalDistance - 1, parseFloat(e.target.value) || 1)))}
            className="w-28 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
      </div>

      <div className="flex gap-3 mb-4">
        {zones.map((r, i) => (
          <div key={i} className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
            <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Zone {i + 1} Radius</div>
            <div className="text-sm font-mono font-bold" style={{ color: zoneColors[i] }}>{r.toFixed(2)} m</div>
          </div>
        ))}
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Wavelength</div>
          <div className="text-sm font-mono font-bold" style={{ color: 'var(--sf-text-primary)' }}>
            {wavelength > 1 ? `${wavelength.toFixed(3)} m` : `${(wavelength * 100).toFixed(2)} cm`}
          </div>
        </div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-dim)' }}>Cross Section at Measurement Point</div>
        <svg width={svgW} height={svgH}>
          {/* Zones (drawn in reverse so zone 1 is on top) */}
          {[...zones].reverse().map((r, ri) => {
            const idx = zones.length - 1 - ri
            const ry = r * scale
            return (
              <ellipse key={idx} cx={midX} cy={midY} rx={ellipseRx} ry={ry}
                fill={zoneColors[idx]} fillOpacity={0.15}
                stroke={zoneColors[idx]} strokeWidth={1.5} strokeDasharray={idx > 0 ? '4,3' : 'none'} />
            )
          })}
          {/* Center line */}
          <line x1={40} y1={midY} x2={svgW - 40} y2={midY} stroke="var(--sf-text-dim)" strokeWidth={0.5} strokeDasharray="2,2" />
          {/* TX/RX markers */}
          <circle cx={40} cy={midY} r={4} fill="var(--sf-accent-green)" />
          <text x={40} y={midY - 10} textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)">TX</text>
          <circle cx={svgW - 40} cy={midY} r={4} fill="var(--sf-marker-red)" />
          <text x={svgW - 40} y={midY - 10} textAnchor="middle" fontSize={9} fill="var(--sf-text-muted)">RX</text>
          {/* Zone labels */}
          {zones.map((r, i) => (
            <text key={i} x={midX + ellipseRx + 4} y={midY - r * scale + 4} fontSize={9} fill={zoneColors[i]}>F{i + 1}</text>
          ))}
        </svg>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Fresnel Zones</summary>
        <p className="mb-1">Fresnel zones are concentric ellipsoids between TX and RX. The first zone carries most energy:</p>
        <p className="font-mono text-[10px]">F_n = sqrt(n * lambda * d1 * d2 / (d1 + d2))</p>
        <p className="mt-1">For reliable links, at least 60% of the first Fresnel zone should be clear of obstructions.</p>
      </details>
    </div>
  )
}
