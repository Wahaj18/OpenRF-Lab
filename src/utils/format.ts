export function formatFrequency(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(3)} kHz`
  return `${hz.toFixed(1)} Hz`
}

export function formatAmplitude(dbm: number, units: 'dBm' | 'dBV' | 'dBuV' | 'W' = 'dBm'): string {
  switch (units) {
    case 'dBm': return `${dbm.toFixed(1)} dBm`
    case 'dBV': return `${(dbm - 13).toFixed(1)} dBV` // dBV = dBm - 13 (50Ω)
    case 'dBuV': return `${(dbm + 107).toFixed(1)} dBμV` // dBμV = dBm + 107 (50Ω)
    case 'W': {
      const watts = Math.pow(10, (dbm - 30) / 10)
      if (watts >= 1) return `${watts.toFixed(2)} W`
      if (watts >= 1e-3) return `${(watts * 1e3).toFixed(2)} mW`
      if (watts >= 1e-6) return `${(watts * 1e6).toFixed(2)} μW`
      return `${(watts * 1e9).toFixed(2)} nW`
    }
  }
}

export function formatRBW(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(0)} kHz`
  return `${hz.toFixed(0)} Hz`
}
