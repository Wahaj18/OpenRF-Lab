import { useState, useMemo } from 'react'
import { eirp, dbmToWatts } from '../../utils/rf-math'

const FCC_LIMITS = [
  { band: '2.4 GHz (Part 15)', eirpDbm: 36 },
  { band: '5 GHz UNII-1', eirpDbm: 30 },
  { band: '5 GHz UNII-3', eirpDbm: 36 },
  { band: '900 MHz ISM', eirpDbm: 36 },
  { band: '60 GHz (Part 15)', eirpDbm: 82 },
]

export function EIRPCalc() {
  const [txPower, setTxPower] = useState(20)
  const [antennaGain, setAntennaGain] = useState(6)
  const [losses, setLosses] = useState(1)

  const result = useMemo(() => eirp(txPower, antennaGain, losses), [txPower, antennaGain, losses])
  const resultWatts = useMemo(() => dbmToWatts(result), [result])

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>EIRP Calculator</h2>

      <div className="flex gap-4 mb-4">
        {[
          { label: 'TX Power (dBm)', value: txPower, set: setTxPower },
          { label: 'Antenna Gain (dBi)', value: antennaGain, set: setAntennaGain },
          { label: 'Losses (dB)', value: losses, set: setLosses },
        ].map(f => (
          <label key={f.label} className="flex flex-col gap-1 text-xs">
            <span style={{ color: 'var(--sf-text-muted)' }}>{f.label}</span>
            <input type="number" value={f.value} step={0.5}
              onChange={e => f.set(parseFloat(e.target.value) || 0)}
              className="w-28 px-2 py-1 rounded text-xs outline-none"
              style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
          </label>
        ))}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="p-3 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>EIRP</div>
          <div className="text-lg font-mono font-bold" style={{ color: 'var(--sf-accent-blue)' }}>{result.toFixed(1)} dBm</div>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>{resultWatts.toFixed(4)} W</div>
        </div>
        <div className="p-3 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Formula</div>
          <div className="text-xs font-mono mt-1" style={{ color: 'var(--sf-text-primary)' }}>
            {txPower} + {antennaGain} - {losses} = {result.toFixed(1)} dBm
          </div>
        </div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>FCC EIRP Limits</div>
        <div className="space-y-1.5">
          {FCC_LIMITS.map(limit => {
            const exceeds = result > limit.eirpDbm
            return (
              <div key={limit.band} className="flex items-center gap-2 text-xs">
                <span className="w-36" style={{ color: 'var(--sf-text-muted)' }}>{limit.band}</span>
                <div className="flex-1 h-3 rounded overflow-hidden" style={{ backgroundColor: 'var(--sf-bg-control)' }}>
                  <div className="h-full rounded" style={{
                    width: `${Math.min(100, (result / limit.eirpDbm) * 100)}%`,
                    backgroundColor: exceeds ? 'var(--sf-marker-red)' : 'var(--sf-accent-green)',
                    opacity: 0.7,
                  }} />
                </div>
                <span className="w-16 text-right font-mono text-[10px]"
                  style={{ color: exceeds ? 'var(--sf-marker-red)' : 'var(--sf-text-dim)' }}>
                  {limit.eirpDbm} dBm
                </span>
                <span className="text-[10px]" style={{ color: exceeds ? 'var(--sf-marker-red)' : 'var(--sf-accent-green)' }}>
                  {exceeds ? 'EXCEEDS' : 'OK'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: EIRP</summary>
        <p className="mb-1">EIRP is the power an isotropic antenna would need to radiate to match this one:</p>
        <p className="font-mono text-[10px]">EIRP = P_tx + G_antenna - L_cable</p>
        <p className="mt-1">Regulatory bodies like the FCC set EIRP limits per frequency band to prevent interference.</p>
      </details>
    </div>
  )
}
