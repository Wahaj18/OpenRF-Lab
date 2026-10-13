import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalyzerState } from '../../src/hooks/useAnalyzerState'

describe('useAnalyzerState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useAnalyzerState())
    expect(result.current.centerFreq).toBe(2.437e9)
    expect(result.current.span).toBe(100e6)
    expect(result.current.rbw).toBe(100e3)
    expect(result.current.refLevel).toBe(0)
    expect(result.current.scale).toBe(10)
  })
  it('setCenterFreq updates center and recomputes start/stop', () => {
    const { result } = renderHook(() => useAnalyzerState())
    act(() => result.current.setCenterFreq(1e9))
    expect(result.current.centerFreq).toBe(1e9)
    expect(result.current.startFreq).toBe(1e9 - 50e6)
    expect(result.current.stopFreq).toBe(1e9 + 50e6)
  })
  it('setSpan updates span and recomputes start/stop', () => {
    const { result } = renderHook(() => useAnalyzerState())
    act(() => result.current.setSpan(200e6))
    expect(result.current.span).toBe(200e6)
    expect(result.current.startFreq).toBe(2.437e9 - 100e6)
    expect(result.current.stopFreq).toBe(2.437e9 + 100e6)
  })
  it('setStartFreq updates start and recomputes center/span', () => {
    const { result } = renderHook(() => useAnalyzerState())
    const stop = result.current.stopFreq
    act(() => result.current.setStartFreq(2.4e9))
    expect(result.current.startFreq).toBe(2.4e9)
    expect(result.current.centerFreq).toBe((2.4e9 + stop) / 2)
    expect(result.current.span).toBe(stop - 2.4e9)
  })
})
