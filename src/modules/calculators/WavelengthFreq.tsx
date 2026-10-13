import { useState, useMemo } from 'react'
import { freqToWavelength, wavelengthToFreq } from '../../utils/rf-math'

const BANDS = [
  { name: 'ELF', min: 3, max: 30, unit: 'Hz' },
  { name: 'VLF', min: 3e3, max: 30e3, unit: 'kHz' },
  { name: 'LF', min: 30e3, max: 300e3, unit: 'kHz' },
  { name: 'MF', min: 300e3, max: 3e6, unit: 'MHz' },
  { name: 'HF', min: 3e6, max: 30e6, unit: 'MHz' },
  { name: 'VHF', min: 30e6, max: 300e6, unit: 'MHz' },
  { name: 'UHF', min: 300e6, max: 1e9, unit: 'GHz' },
  { name: 'L', min: 1e9, max: 2e9, unit: 'GHz' },
  { name: 'S', min: 2e9, max: 4e9, unit: 'GHz' },
  { name: 'C', min: 4e9, max: 8e9, unit: 'GHz' },
  { name: 'X', min: 8e9, max: 12e9, unit: 'GHz' },
  { name: 'Ku', min: 12e9, max: 18e9, unit: 'GHz' },
  { name: 'K', min: 18e9, max: 27e9, unit: 'GHz' },
  { name: 'Ka', min: 27e9, max: 40e9, unit: 'GHz' },
  { name: 'V', min: 40e9, max: 75e9, unit: 'GHz' },
  { name: 'W', min: 75e9, max: 110e9, unit: 'GHz' },
]

function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(3)} kHz`
  return `${hz.toFixed(1)} Hz`
}

function formatWavelength(m: number): string {
  if (m >= 1e3) return `${(m / 1e3).toFixed(2)} km`
  if (m >= 1) return `${m.toFixed(4)} m`
  if (m >= 0.01) return `${(m * 100).toFixed(2)} cm`
  if (m >= 1e-4) return `${(m * 1e3).toFixed(3)} mm`
  return `${(m * 1e6).toFixed(1)} um`
}

export function WavelengthFreq() {
  const [frequency, setFrequency] = useState(2.4e9)

  const wavelength = useMemo(() => freqToWavelength(frequency), [frequency])

  const activeBand = useMemo(() => {
    return BANDS.find(b => frequency >= b.min && frequency < b.max)?.name || '—'
  }, [frequency])

  const handleFreqChange = (hz: number) => {
    if (hz > 0) setFrequency(hz)
  }

  const handleWavelengthChange = (m: number) => {
    if (m > 0) setFrequency(wavelengthToFreq(m))
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Wavelength / Frequency Converter</h2>

      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Frequency (GHz)</span>
          <input type="number" value={frequency / 1e9} step={0.001}
            onChange={e => handleFreqChange((parseFloat(e.target.value) || 0.001) * 1e9)}
            className="w-36 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
        <span className="text-sm mt-5" style={{ color: 'var(--sf-text-dim)' }}>⇄</span>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--sf-text-muted)' }}>Wavelength (m)</span>
          <input type="number" value={wavelength} step={0.001}
            onChange={e => handleWavelengthChange(parseFloat(e.target.value) || 0.001)}
            className="w-36 px-2 py-1 rounded text-xs outline-none"
            style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
        </label>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Frequency</div>
          <div className="text-sm font-mono font-bold" style={{ color: 'var(--sf-accent-blue)' }}>{formatHz(frequency)}</div>
        </div>
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Wavelength</div>
          <div className="text-sm font-mono font-bold" style={{ color: 'var(--sf-accent-green)' }}>{formatWavelength(wavelength)}</div>
        </div>
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Band</div>
          <div className="text-sm font-mono font-bold" style={{ color: 'var(--sf-marker-yellow)' }}>{activeBand}</div>
        </div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Band Designations</div>
        <div className="grid grid-cols-4 gap-1">
          {BANDS.map(band => {
            const isActive = frequency >= band.min && frequency < band.max
            return (
              <button key={band.name}
                onClick={() => setFrequency((band.min + band.max) / 2)}
                className="text-[10px] px-2 py-1 rounded cursor-pointer text-left"
                style={{
                  backgroundColor: isActive ? 'var(--sf-accent-blue)' : 'var(--sf-bg-control)',
                  color: isActive ? 'var(--sf-bg-primary)' : 'var(--sf-text-muted)',
                  border: '1px solid var(--sf-border)',
                }}>
                <span className="font-bold">{band.name}</span>
                <span className="ml-1 opacity-70">{formatHz(band.min)}-{formatHz(band.max)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Wavelength-Frequency</summary>
        <p className="mb-1">Electromagnetic waves travel at the speed of light (c = 299,792,458 m/s):</p>
        <p className="font-mono text-[10px]">lambda = c / f, f = c / lambda</p>
        <p className="mt-1">Higher frequencies have shorter wavelengths. Antenna size is typically proportional to wavelength (lambda/4 or lambda/2 dipole).</p>
      </details>
    </div>
  )
}
