import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMarkers } from '../../src/hooks/useMarkers'

describe('useMarkers', () => {
  it('starts with no markers', () => {
    const { result } = renderHook(() => useMarkers())
    expect(result.current.markers).toHaveLength(0)
  })
  it('addMarker creates a normal marker', () => {
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.addMarker(2.437e9, -22.4, 0))
    expect(result.current.markers).toHaveLength(1)
    expect(result.current.markers[0].type).toBe('normal')
    expect(result.current.markers[0].frequency).toBe(2.437e9)
  })
  it('addDeltaMarker references another marker', () => {
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.addMarker(2.437e9, -22.4, 0))
    act(() => result.current.addDeltaMarker(2.462e9, -38.1, 0, result.current.markers[0].id))
    expect(result.current.markers).toHaveLength(2)
    expect(result.current.markers[1].type).toBe('delta')
    expect(result.current.markers[1].refMarkerId).toBe(result.current.markers[0].id)
  })
  it('removeMarker deletes a marker', () => {
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.addMarker(2.437e9, -22.4, 0))
    const id = result.current.markers[0].id
    act(() => result.current.removeMarker(id))
    expect(result.current.markers).toHaveLength(0)
  })
  it('moveMarker updates frequency and amplitude', () => {
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.addMarker(2.437e9, -22.4, 0))
    const id = result.current.markers[0].id
    act(() => result.current.moveMarker(id, 2.45e9, -30))
    expect(result.current.markers[0].frequency).toBe(2.45e9)
    expect(result.current.markers[0].amplitude).toBe(-30)
  })
  it('enforces maximum of 12 markers', () => {
    const { result } = renderHook(() => useMarkers())
    for (let i = 0; i < 14; i++) act(() => result.current.addMarker(2.4e9 + i * 1e6, -20, 0))
    expect(result.current.markers.length).toBeLessThanOrEqual(12)
  })
  it('clearAllMarkers removes everything', () => {
    const { result } = renderHook(() => useMarkers())
    act(() => result.current.addMarker(2.437e9, -22, 0))
    act(() => result.current.addMarker(2.462e9, -38, 0))
    act(() => result.current.clearAllMarkers())
    expect(result.current.markers).toHaveLength(0)
  })
  it('peakSearch finds the highest point', () => {
    const { result } = renderHook(() => useMarkers())
    const spectrum = new Float32Array([-80, -60, -20, -50, -90])
    act(() => { result.current.peakSearch(spectrum, 2.387e9, 100e6, 0) })
    expect(result.current.markers).toHaveLength(1)
    expect(result.current.markers[0].amplitude).toBe(-20)
  })
})
