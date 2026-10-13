import { useState, useMemo } from 'react'
import { linkBudget, dbmToWatts } from '../../utils/rf-math'

interface Params {
  txPower: number; txGain: number; txLoss: number
  frequency: number; distance: number
  atmosphericLoss: number; rainLoss: number
  rxGain: number; rxLoss: number
  rxSensitivity: number
}

const DEFAULT: Params = {
  txPower: 20, txGain: 6, txLoss: 1,
  frequency: 2.4e9, distance: 1000,
  atmosphericLoss: 0.5, rainLoss: 0,
  rxGain: 2, rxLoss: 1, rxSensitivity: -90,
}

function Field({ label, value, unit, onChange }: {
  label: string; value: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span style={{ color: 'var(--sf-text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 rounded text-xs outline-none"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }}
        />
        <span style={{ color: 'var(--sf-text-dim)' }}>{unit}</span>
      </div>
    </label>
  )
}

function WaterfallChart({ params, result }: { params: Params; result: { receivedPower: number; pathLoss: number } }) {
  const items = [
    { label: 'TX Power', value: params.txPower, type: 'gain' as const },
    { label: 'TX Gain', value: params.txGain, type: 'gain' as const },
    { label: 'TX Loss', value: -params.txLoss, type: 'loss' as const },
    { label: 'Path Loss', value: -result.pathLoss, type: 'loss' as const },
    { label: 'RX Gain', value: params.rxGain, type: 'gain' as const },
    { label: 'RX Loss', value: -params.rxLoss, type: 'loss' as const },
  ]

  const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1)
  const barWidth = 360
  const barH = 22
  const gap = 4

  return (
    <svg width={barWidth + 120} height={(barH + gap) * items.length + 10} className="mt-2">
      {items.map((item, i) => {
        const w = (Math.abs(item.value) / maxAbs) * (barWidth * 0.7)
        const x = item.value >= 0 ? 80 : 80 - w
        return (
          <g key={i} transform={`translate(0, ${i * (barH + gap)})`}>
            <text x={76} y={barH / 2 + 4} textAnchor="end" fontSize={10} fill="var(--sf-text-muted)">
              {item.label}
            </text>
            <rect x={x} y={2} width={w} height={barH - 4} rx={2}
              fill={item.value >= 0 ? 'var(--sf-accent-green)' : 'var(--sf-marker-red)'} opacity={0.7} />
            <text x={80 + (item.value >= 0 ? w + 4 : -w - 4)} y={barH / 2 + 4}
              textAnchor={item.value >= 0 ? 'start' : 'end'} fontSize={10} fill="var(--sf-text-primary)">
              {item.value >= 0 ? '+' : ''}{item.value.toFixed(1)} dB
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function LinkBudget() {
  const [p, setP] = useState(DEFAULT)
  const set = (key: keyof Params) => (v: number) => setP(prev => ({ ...prev, [key]: v }))

  const result = useMemo(() => linkBudget(p), [p])
  const margin = result.receivedPower - p.rxSensitivity
  const maxRange = useMemo(() => {
    const available = p.txPower + p.txGain - p.txLoss + p.rxGain - p.rxLoss - p.atmosphericLoss - p.rainLoss - p.rxSensitivity
    const base = available - 20 * Math.log10(p.frequency) - 20 * Math.log10(4 * Math.PI / 299792458)
    return Math.pow(10, base / 20)
  }, [p])

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Link Budget Calculator</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Transmitter</div>
          <div className="flex flex-col gap-2">
            <Field label="TX Power" value={p.txPower} unit="dBm" onChange={set('txPower')} />
            <Field label="Antenna Gain" value={p.txGain} unit="dBi" onChange={set('txGain')} />
            <Field label="Cable/Connector Loss" value={p.txLoss} unit="dB" onChange={set('txLoss')} />
          </div>
        </div>

        <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Path</div>
          <div className="flex flex-col gap-2">
            <Field label="Frequency" value={p.frequency / 1e9} unit="GHz" onChange={v => set('frequency')(v * 1e9)} />
            <Field label="Distance" value={p.distance} unit="m" onChange={set('distance')} />
            <Field label="Atmospheric Loss" value={p.atmosphericLoss} unit="dB" onChange={set('atmosphericLoss')} />
            <Field label="Rain Loss" value={p.rainLoss} unit="dB" onChange={set('rainLoss')} />
          </div>
        </div>

        <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Receiver</div>
          <div className="flex flex-col gap-2">
            <Field label="Antenna Gain" value={p.rxGain} unit="dBi" onChange={set('rxGain')} />
            <Field label="Cable/Connector Loss" value={p.rxLoss} unit="dB" onChange={set('rxLoss')} />
            <Field label="Sensitivity" value={p.rxSensitivity} unit="dBm" onChange={set('rxSensitivity')} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Path Loss', value: `${result.pathLoss.toFixed(1)} dB`, color: 'var(--sf-marker-red)' },
          { label: 'Received Power', value: `${result.receivedPower.toFixed(1)} dBm`, color: 'var(--sf-accent-blue)' },
          { label: 'Link Margin', value: `${margin.toFixed(1)} dB`, color: margin > 0 ? 'var(--sf-accent-green)' : 'var(--sf-marker-red)' },
          { label: 'Max Range', value: maxRange > 1000 ? `${(maxRange / 1000).toFixed(1)} km` : `${maxRange.toFixed(0)} m`, color: 'var(--sf-marker-yellow)' },
        ].map(r => (
          <div key={r.label} className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
            <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>{r.label}</div>
            <div className="text-sm font-mono font-bold" style={{ color: r.color }}>{r.value}</div>
            {r.label === 'Received Power' && (
              <div className="text-[9px]" style={{ color: 'var(--sf-text-dim)' }}>{(dbmToWatts(result.receivedPower) * 1e9).toFixed(3)} nW</div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-dim)' }}>Waterfall</div>
        <WaterfallChart params={p} result={result} />
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Link Budget</summary>
        <p className="mb-1">A link budget accounts for all gains and losses from transmitter to receiver:</p>
        <p className="font-mono text-[10px] mb-1">P_rx = P_tx + G_tx - L_tx - FSPL - L_atm - L_rain + G_rx - L_rx</p>
        <p>Where FSPL = 20log10(d) + 20log10(f) + 20log10(4pi/c). The link margin is P_rx - Sensitivity.</p>
      </details>
    </div>
  )
}
