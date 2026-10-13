import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTraces } from '../../src/hooks/useTraces'

describe('useTraces', () => {
  it('initializes with 6 traces, T1 active as clear-write', () => {
    const { result } = renderHook(() => useTraces())
    expect(result.current.traces.length).toBe(6)
    expect(result.current.traces[0].mode).toBe('clear-write')
    expect(result.current.traces[0].enabled).toBe(true)
    expect(result.current.traces[1].mode).toBe('off')
    expect(result.current.traces[1].enabled).toBe(false)
  })
  it('setTraceMode updates a specific trace', () => {
    const { result } = renderHook(() => useTraces())
    act(() => result.current.setTraceMode(1, 'max-hold'))
    expect(result.current.traces[1].mode).toBe('max-hold')
    expect(result.current.traces[1].enabled).toBe(true)
  })
  it('setting mode to off disables the trace', () => {
    const { result } = renderHook(() => useTraces())
    act(() => result.current.setTraceMode(0, 'off'))
    expect(result.current.traces[0].enabled).toBe(false)
  })
  it('setTraceColor updates trace color', () => {
    const { result } = renderHook(() => useTraces())
    act(() => result.current.setTraceColor(0, '#ff0000'))
    expect(result.current.traces[0].color).toBe('#ff0000')
  })
})
