import { useState, useMemo, useCallback } from 'react'

export type ModulationType = 'am' | 'fm' | 'bpsk' | 'qpsk' | '8psk' | '16qam' | '64qam' | '256qam'

export interface IQPoint {
  i: number
  q: number
}

export interface ModulationState {
  modulationType: ModulationType
  setModulationType: (t: ModulationType) => void
  carrierFreq: number
  setCarrierFreq: (f: number) => void
  symbolRate: number
  setSymbolRate: (r: number) => void
  modulationIndex: number
  setModulationIndex: (m: number) => void
  snr: number
  setSnr: (s: number) => void
  sampleRate: number
  numSymbols: number
  constellationPoints: IQPoint[]
  idealPoints: IQPoint[]
  timeDomainSignal: number[]
  bitsPerSymbol: number
  throughput: number
  isDigital: boolean
}

const SQRT2_INV = 1 / Math.sqrt(2)

function getIdealConstellation(type: ModulationType): IQPoint[] {
  switch (type) {
    case 'bpsk':
      return [{ i: -1, q: 0 }, { i: 1, q: 0 }]
    case 'qpsk':
      return [
        { i: SQRT2_INV, q: SQRT2_INV },
        { i: -SQRT2_INV, q: SQRT2_INV },
        { i: -SQRT2_INV, q: -SQRT2_INV },
        { i: SQRT2_INV, q: -SQRT2_INV },
      ]
    case '8psk':
      return Array.from({ length: 8 }, (_, k) => ({
        i: Math.cos((2 * Math.PI * k) / 8),
        q: Math.sin((2 * Math.PI * k) / 8),
      }))
    case '16qam':
      return buildQamGrid(4)
    case '64qam':
      return buildQamGrid(8)
    case '256qam':
      return buildQamGrid(16)
    default:
      return []
  }
}

function buildQamGrid(side: number): IQPoint[] {
  const points: IQPoint[] = []
  const half = (side - 1) / 2
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      points.push({ i: (col - half) / half, q: (row - half) / half })
    }
  }
  return points
}

function getBitsPerSymbol(type: ModulationType): number {
  switch (type) {
    case 'bpsk': return 1
    case 'qpsk': return 2
    case '8psk': return 3
    case '16qam': return 4
    case '64qam': return 6
    case '256qam': return 8
    default: return 0
  }
}

function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function generateNoisyConstellation(
  ideal: IQPoint[],
  numSymbols: number,
  snrDb: number,
): IQPoint[] {
  const snrLinear = Math.pow(10, snrDb / 10)
  const noiseSigma = Math.sqrt(1 / (2 * snrLinear))
  const points: IQPoint[] = []
  for (let n = 0; n < numSymbols; n++) {
    const ref = ideal[Math.floor(Math.random() * ideal.length)]
    points.push({
      i: ref.i + gaussianRandom() * noiseSigma,
      q: ref.q + gaussianRandom() * noiseSigma,
    })
  }
  return points
}

function generateAnalogSignal(
  type: 'am' | 'fm',
  carrierFreq: number,
  modulationIndex: number,
  sampleRate: number,
  numSamples: number,
  snrDb: number,
): number[] {
  const messageFreq = carrierFreq / 10
  const signal: number[] = new Array(numSamples)
  const snrLinear = Math.pow(10, snrDb / 10)
  const noiseSigma = Math.sqrt(1 / (2 * snrLinear))

  for (let n = 0; n < numSamples; n++) {
    const t = n / sampleRate
    const msg = Math.sin(2 * Math.PI * messageFreq * t)
    if (type === 'am') {
      signal[n] = (1 + modulationIndex * msg) * Math.cos(2 * Math.PI * carrierFreq * t)
    } else {
      const integral = -Math.cos(2 * Math.PI * messageFreq * t) / (2 * Math.PI * messageFreq)
      signal[n] = Math.cos(2 * Math.PI * carrierFreq * t + modulationIndex * integral)
    }
    signal[n] += gaussianRandom() * noiseSigma
  }
  return signal
}

function generateDigitalTimeDomain(
  idealPoints: IQPoint[],
  symbolRate: number,
  sampleRate: number,
  snrDb: number,
): number[] {
  const numSymbols = 20
  const samplesPerSymbol = Math.round(sampleRate / symbolRate)
  const totalSamples = numSymbols * samplesPerSymbol
  const snrLinear = Math.pow(10, snrDb / 10)
  const noiseSigma = Math.sqrt(1 / (2 * snrLinear))
  const signal: number[] = new Array(totalSamples)
  const carrierFreq = symbolRate * 2

  for (let sym = 0; sym < numSymbols; sym++) {
    const ref = idealPoints[Math.floor(Math.random() * idealPoints.length)]
    const iVal = ref.i + gaussianRandom() * noiseSigma
    const qVal = ref.q + gaussianRandom() * noiseSigma
    for (let s = 0; s < samplesPerSymbol; s++) {
      const n = sym * samplesPerSymbol + s
      const t = n / sampleRate
      signal[n] = iVal * Math.cos(2 * Math.PI * carrierFreq * t)
                - qVal * Math.sin(2 * Math.PI * carrierFreq * t)
    }
  }
  return signal
}

export function useModulationState(): ModulationState {
  const [modulationType, setModulationType] = useState<ModulationType>('qpsk')
  const [carrierFreq, setCarrierFreq] = useState(1000)
  const [symbolRate, setSymbolRate] = useState(100)
  const [modulationIndex, setModulationIndex] = useState(1.0)
  const [snr, setSnr] = useState(20)
  const sampleRate = 8192
  const numSymbols = 200

  const isDigital = useMemo(
    () => modulationType !== 'am' && modulationType !== 'fm',
    [modulationType],
  )

  const bitsPerSymbol = useMemo(() => getBitsPerSymbol(modulationType), [modulationType])

  const throughput = useMemo(
    () => isDigital ? bitsPerSymbol * symbolRate : 0,
    [isDigital, bitsPerSymbol, symbolRate],
  )

  const idealPoints = useMemo(
    () => getIdealConstellation(modulationType),
    [modulationType],
  )

  const constellationPoints = useMemo(
    () => isDigital ? generateNoisyConstellation(idealPoints, numSymbols, snr) : [],
    [isDigital, idealPoints, numSymbols, snr],
  )

  const timeDomainSignal = useMemo(() => {
    if (isDigital) {
      return generateDigitalTimeDomain(idealPoints, symbolRate, sampleRate, snr)
    }
    const numSamples = Math.min(sampleRate, 2048)
    return generateAnalogSignal(
      modulationType as 'am' | 'fm',
      carrierFreq,
      modulationIndex,
      sampleRate,
      numSamples,
      snr,
    )
  }, [isDigital, modulationType, carrierFreq, modulationIndex, sampleRate, idealPoints, symbolRate, snr])

  return {
    modulationType,
    setModulationType: useCallback((t: ModulationType) => setModulationType(t), []),
    carrierFreq,
    setCarrierFreq: useCallback((f: number) => setCarrierFreq(f), []),
    symbolRate,
    setSymbolRate: useCallback((r: number) => setSymbolRate(r), []),
    modulationIndex,
    setModulationIndex: useCallback((m: number) => setModulationIndex(m), []),
    snr,
    setSnr: useCallback((s: number) => setSnr(s), []),
    sampleRate,
    numSymbols,
    constellationPoints,
    idealPoints,
    timeDomainSignal,
    bitsPerSymbol,
    throughput,
    isDigital,
  }
}
