import { useState, useCallback } from 'react'

export type MarkerType = 'normal' | 'delta' | 'band-power' | 'ndb-bw'

export interface Marker {
  id: string; type: MarkerType; frequency: number; amplitude: number
  traceIndex: number; refMarkerId?: string; bandwidthHz?: number
  nDb?: number; nDbBandwidth?: number; locked: boolean
}

const MAX_MARKERS = 12
let nextId = 1

export function useMarkers() {
  const [markers, setMarkers] = useState<Marker[]>([])

  const addMarker = useCallback((frequency: number, amplitude: number, traceIndex: number) => {
    setMarkers(prev => {
      if (prev.length >= MAX_MARKERS) return prev
      return [...prev, { id: `M${nextId++}`, type: 'normal', frequency, amplitude, traceIndex, locked: false }]
    })
  }, [])

  const addDeltaMarker = useCallback((frequency: number, amplitude: number, traceIndex: number, refMarkerId: string) => {
    setMarkers(prev => {
      if (prev.length >= MAX_MARKERS) return prev
      return [...prev, { id: `M${nextId++}`, type: 'delta', frequency, amplitude, traceIndex, refMarkerId, locked: false }]
    })
  }, [])

  const addBandPowerMarker = useCallback((frequency: number, amplitude: number, traceIndex: number, bandwidthHz: number) => {
    setMarkers(prev => {
      if (prev.length >= MAX_MARKERS) return prev
      return [...prev, { id: `BP${nextId++}`, type: 'band-power', frequency, amplitude, traceIndex, bandwidthHz, locked: false }]
    })
  }, [])

  const addNdbMarker = useCallback((frequency: number, amplitude: number, traceIndex: number, nDb: number = 3) => {
    setMarkers(prev => {
      if (prev.length >= MAX_MARKERS) return prev
      return [...prev, { id: `M${nextId++}`, type: 'ndb-bw', frequency, amplitude, traceIndex, nDb, locked: false }]
    })
  }, [])

  const removeMarker = useCallback((id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id))
  }, [])

  const moveMarker = useCallback((id: string, frequency: number, amplitude: number) => {
    setMarkers(prev => prev.map(m => m.id === id && !m.locked ? { ...m, frequency, amplitude } : m))
  }, [])

  const updateMarker = useCallback((id: string, updates: Partial<Marker>) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const clearAllMarkers = useCallback(() => { setMarkers([]) }, [])

  const peakSearch = useCallback((spectrum: Float32Array, startFreq: number, span: number, traceIndex: number): { frequency: number; amplitude: number } | null => {
    if (spectrum.length === 0) return null
    let maxIdx = 0, maxVal = spectrum[0]
    for (let i = 1; i < spectrum.length; i++) { if (spectrum[i] > maxVal) { maxVal = spectrum[i]; maxIdx = i } }
    const frequency = startFreq + (maxIdx / (spectrum.length - 1)) * span
    const amplitude = maxVal
    const binWidth = span / (spectrum.length - 1)
    setMarkers(prev => {
      if (prev.length >= MAX_MARKERS) return prev
      const duplicate = prev.find(m => Math.abs(m.frequency - frequency) < binWidth)
      if (duplicate) return prev.map(m => m.id === duplicate.id ? { ...m, frequency, amplitude } : m)
      return [...prev, { id: `M${nextId++}`, type: 'normal', frequency, amplitude, traceIndex, locked: false }]
    })
    return { frequency, amplitude }
  }, [])

  const nextPeak = useCallback((spectrum: Float32Array, startFreq: number, span: number, _traceIndex: number, currentMarkerId: string, direction: 'next' | 'left' | 'right') => {
    const marker = markers.find(m => m.id === currentMarkerId)
    if (!marker || spectrum.length === 0) return
    const currentBin = Math.round(((marker.frequency - startFreq) / span) * (spectrum.length - 1))
    const peaks: { bin: number; val: number }[] = []
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) peaks.push({ bin: i, val: spectrum[i] })
    }
    let target: { bin: number; val: number } | null = null
    if (direction === 'next') { peaks.sort((a, b) => b.val - a.val); target = peaks.find(p => p.val < marker.amplitude && p.bin !== currentBin) ?? null }
    else if (direction === 'left') { target = peaks.filter(p => p.bin < currentBin).sort((a, b) => b.bin - a.bin)[0] ?? null }
    else { target = peaks.filter(p => p.bin > currentBin).sort((a, b) => a.bin - b.bin)[0] ?? null }
    if (target) { const freq = startFreq + (target.bin / (spectrum.length - 1)) * span; moveMarker(currentMarkerId, freq, target.val) }
  }, [markers, moveMarker])

  return { markers, addMarker, addDeltaMarker, addBandPowerMarker, addNdbMarker, removeMarker, moveMarker, updateMarker, clearAllMarkers, peakSearch, nextPeak }
}
