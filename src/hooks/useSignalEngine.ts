import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type { AnalyzerConfig, EngineCommand, EngineOutput, SignalConfig } from '../dsp/types'
import React from 'react'

interface SignalEngineContextValue {
  isRunning: boolean
  sweepCount: number
  spectrumData: Map<number, Float32Array>
  waterfallRow: Float32Array | null
  configure: (config: AnalyzerConfig) => void
  setSignals: (signals: SignalConfig[]) => void
  start: () => void
  stop: () => void
  singleSweep: () => void
}

const SignalEngineContext = createContext<SignalEngineContextValue>(null!)

export function useSignalEngine() { return useContext(SignalEngineContext) }

export function SignalEngineProvider({ children }: { children: ReactNode }) {
  const workerRef = useRef<Worker | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [sweepCount, setSweepCount] = useState(0)
  const spectrumDataRef = useRef(new Map<number, Float32Array>())
  const waterfallRowRef = useRef<Float32Array | null>(null)
  const [, forceUpdate] = useState(0)
  // Queue commands sent before the worker is ready, then flush on init
  const pendingRef = useRef<EngineCommand[]>([])

  useEffect(() => {
    const worker = new Worker(new URL('../dsp/engine.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<EngineOutput>) => {
      const msg = e.data
      switch (msg.type) {
        case 'spectrum': spectrumDataRef.current.set(msg.traceIndex, msg.data); forceUpdate(c => c + 1); break
        case 'waterfall-row': waterfallRowRef.current = msg.data; break
        case 'status': setIsRunning(msg.running); setSweepCount(msg.sweepCount); break
      }
    }
    workerRef.current = worker
    // Flush any commands queued before the worker was ready
    for (const cmd of pendingRef.current) worker.postMessage(cmd)
    pendingRef.current = []
    return () => { workerRef.current = null; worker.terminate() }
  }, [])

  const send = useCallback((cmd: EngineCommand) => {
    if (workerRef.current) workerRef.current.postMessage(cmd)
    else pendingRef.current.push(cmd)
  }, [])
  const configure = useCallback((config: AnalyzerConfig) => send({ type: 'configure', config }), [send])
  const setSignals = useCallback((signals: SignalConfig[]) => send({ type: 'set-signals', signals }), [send])
  const start = useCallback(() => send({ type: 'start' }), [send])
  const stop = useCallback(() => send({ type: 'stop' }), [send])
  const singleSweep = useCallback(() => send({ type: 'single-sweep' }), [send])

  const value: SignalEngineContextValue = {
    isRunning, sweepCount,
    spectrumData: spectrumDataRef.current,
    waterfallRow: waterfallRowRef.current,
    configure, setSignals, start, stop, singleSweep,
  }

  return React.createElement(SignalEngineContext.Provider, { value }, children)
}
