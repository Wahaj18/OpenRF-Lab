import { useState, useMemo } from 'react'
import { designFIRFilter, computeFrequencyResponse, computeGroupDelay, type FilterType, type FrequencyResponse } from '../../dsp/filters'
import type { WindowType } from '../../dsp/windowing'

export interface FilterState {
  filterType: FilterType
  setFilterType: (t: FilterType) => void
  cutoffLow: number
  setCutoffLow: (f: number) => void
  cutoffHigh: number
  setCutoffHigh: (f: number) => void
  order: number
  setOrder: (o: number) => void
  windowType: WindowType
  setWindowType: (w: WindowType) => void
  sampleRate: number
  coefficients: Float64Array
  impulseResponse: Float64Array
  magnitudeResponse: Float64Array
  phaseResponse: Float64Array
  groupDelay: Float64Array
  frequencies: Float64Array
}

const NUM_FREQ_POINTS = 512

export function useFilterState(): FilterState {
  const [filterType, setFilterTypeRaw] = useState<FilterType>('lowpass')
  const [cutoffLow, setCutoffLowRaw] = useState(1000)
  const [cutoffHigh, setCutoffHighRaw] = useState(2000)
  const [order, setOrder] = useState(51)
  const [windowType, setWindowType] = useState<WindowType>('hamming')
  const sampleRate = 8192
  const maxCutoff = sampleRate / 2 - 1

  // Normalize cutoffs: ensure cutoffLow < cutoffHigh for dual-cutoff modes
  const setFilterType = (t: FilterType) => {
    setFilterTypeRaw(t)
    if (t === 'bandpass' || t === 'bandstop') {
      setCutoffLowRaw(prev => Math.min(prev, maxCutoff - 1))
      setCutoffHighRaw(prev => {
        const low = Math.min(cutoffLow, maxCutoff - 1)
        return Math.max(prev, low + 1)
      })
    }
  }

  const setCutoffLow = (f: number) => {
    const clamped = Math.max(1, Math.min(maxCutoff, f))
    setCutoffLowRaw(clamped)
    if (filterType === 'bandpass' || filterType === 'bandstop') {
      setCutoffHighRaw(prev => Math.max(prev, clamped + 1))
    }
  }

  const setCutoffHigh = (f: number) => {
    const clamped = Math.max(cutoffLow + 1, Math.min(maxCutoff, f))
    setCutoffHighRaw(clamped)
  }

  const coefficients = useMemo(
    () => designFIRFilter(filterType, cutoffLow, cutoffHigh, order, windowType, sampleRate),
    [filterType, cutoffLow, cutoffHigh, order, windowType],
  )

  const { magnitudeResponse, phaseResponse, frequencies } = useMemo<FrequencyResponse & { magnitudeResponse: Float64Array; phaseResponse: Float64Array }>(
    () => {
      const resp = computeFrequencyResponse(coefficients, NUM_FREQ_POINTS, sampleRate)
      return {
        ...resp,
        magnitudeResponse: resp.magnitude,
        phaseResponse: resp.phase,
      }
    },
    [coefficients],
  )

  const groupDelay = useMemo(
    () => computeGroupDelay(coefficients, NUM_FREQ_POINTS, sampleRate),
    [coefficients],
  )

  return {
    filterType, setFilterType,
    cutoffLow, setCutoffLow,
    cutoffHigh, setCutoffHigh,
    order, setOrder,
    windowType, setWindowType,
    sampleRate,
    coefficients,
    impulseResponse: coefficients,
    magnitudeResponse,
    phaseResponse,
    groupDelay,
    frequencies,
  }
}
