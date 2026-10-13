import { useState } from 'react'
import { CONVERSIONS } from '../../utils/conversions'

function ConversionRow({ name, fromLabel, toLabel, forward, reverse }: {
  name: string; fromLabel: string; toLabel: string
  forward: (v: number) => number; reverse: (v: number) => number
}) {
  const [fromVal, setFromVal] = useState(0)
  const [toVal, setToVal] = useState(forward(0))

  const handleFrom = (v: number) => {
    setFromVal(v)
    const result = forward(v)
    setToVal(isFinite(result) ? result : 0)
  }
  const handleTo = (v: number) => {
    setToVal(v)
    const result = reverse(v)
    setFromVal(isFinite(result) ? result : 0)
  }

  return (
    <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>{name}</div>
      <div className="flex items-center gap-3">
        <label className="flex flex-col gap-1 text-xs flex-1">
          <span style={{ color: 'var(--sf-text-muted)' }}>{fromLabel}</span>
          <input type="number" value={fromVal} step="any"
            onChange={e => handleFrom(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <span className="text-sm mt-4" style={{ color: 'var(--sf-text-dim)' }}>⇄</span>
        <label className="flex flex-col gap-1 text-xs flex-1">
          <span style={{ color: 'var(--sf-text-muted)' }}>{toLabel}</span>
          <input type="number" value={toVal} step="any"
            onChange={e => handleTo(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
      </div>
    </div>
  )
}

export function UnitConversions() {
  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Unit Conversions</h2>
      <div className="grid grid-cols-2 gap-3">
        {CONVERSIONS.map(c => (
          <ConversionRow key={c.name} {...c} />
        ))}
      </div>

      <details className="text-xs mt-4" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: RF Unit Conversions</summary>
        <p className="mb-1">Common RF conversions:</p>
        <ul className="list-disc ml-4 text-[10px] space-y-0.5">
          <li>dBm = 10*log10(P_mW) — power relative to 1 milliwatt</li>
          <li>dBW = dBm - 30 — power relative to 1 watt</li>
          <li>dBi = 10*log10(G) — antenna gain relative to isotropic</li>
          <li>lambda = c/f — wavelength from frequency</li>
        </ul>
      </details>
    </div>
  )
}
