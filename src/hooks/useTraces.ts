import { useState, useCallback } from 'react'
import type { TraceMode, TraceMathConfig } from '../dsp/types'

export interface TraceState {
  index: number; mode: TraceMode; enabled: boolean; color: string; visible: boolean
}

export type TraceMath = TraceMathConfig

const DEFAULT_COLORS = ['#00e5ff', '#00ff88', '#ff6b6b', '#ffcc00', '#c084fc', '#ff8c00']

export function useTraces() {
  const [traces, setTraces] = useState<TraceState[]>(
    Array.from({ length: 6 }, (_, i) => ({
      index: i, mode: (i === 0 ? 'clear-write' : 'off') as TraceMode,
      enabled: i === 0, color: DEFAULT_COLORS[i], visible: true,
    }))
  )
  const [traceMath, setTraceMath] = useState<TraceMath>({
    enabled: false, operation: 'subtract', traceA: 0, traceB: 1, result: 2,
  })

  const setTraceMode = useCallback((index: number, mode: TraceMode) => {
    setTraces(prev => prev.map(t => t.index === index ? { ...t, mode, enabled: mode !== 'off' } : t))
  }, [])
  const setTraceColor = useCallback((index: number, color: string) => {
    setTraces(prev => prev.map(t => t.index === index ? { ...t, color } : t))
  }, [])
  const setTraceVisible = useCallback((index: number, visible: boolean) => {
    setTraces(prev => prev.map(t => t.index === index ? { ...t, visible } : t))
  }, [])

  return { traces, traceMath, setTraceMode, setTraceColor, setTraceVisible, setTraceMath }
}
