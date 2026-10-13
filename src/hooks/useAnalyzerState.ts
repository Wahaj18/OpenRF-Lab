import { useState, useCallback, useMemo } from 'react'
import type { WindowType, DetectorType } from '../dsp/types'

export interface AnalyzerStateValues {
  centerFreq: number; span: number; startFreq: number; stopFreq: number
  rbw: number; vbw: number; refLevel: number; scale: number; offset: number
  units: 'dBm' | 'dBV' | 'dBuV' | 'W'
  windowType: WindowType; detectorType: DetectorType
  sweepMode: 'continuous' | 'single' | 'off'
  setCenterFreq: (hz: number) => void; setSpan: (hz: number) => void
  setStartFreq: (hz: number) => void; setStopFreq: (hz: number) => void
  setRbw: (hz: number) => void; setVbw: (hz: number) => void
  setRefLevel: (dbm: number) => void; setScale: (dbPerDiv: number) => void
  setOffset: (db: number) => void; setUnits: (u: 'dBm' | 'dBV' | 'dBuV' | 'W') => void
  setWindowType: (w: WindowType) => void; setDetectorType: (d: DetectorType) => void
  setSweepMode: (m: 'continuous' | 'single' | 'off') => void
}

export function useAnalyzerState(): AnalyzerStateValues {
  const [centerFreq, setCenterFreqRaw] = useState(2.437e9)
  const [span, setSpanRaw] = useState(100e6)
  const [rbw, setRbw] = useState(100e3)
  const [vbw, setVbw] = useState(100e3)
  const [refLevel, setRefLevel] = useState(0)
  const [scale, setScale] = useState(10)
  const [offset, setOffset] = useState(0)
  const [units, setUnits] = useState<'dBm' | 'dBV' | 'dBuV' | 'W'>('dBm')
  const [windowType, setWindowType] = useState<WindowType>('hann')
  const [detectorType, setDetectorType] = useState<DetectorType>('peak')
  const [sweepMode, setSweepMode] = useState<'continuous' | 'single' | 'off'>('continuous')

  const startFreq = useMemo(() => centerFreq - span / 2, [centerFreq, span])
  const stopFreq = useMemo(() => centerFreq + span / 2, [centerFreq, span])

  const setCenterFreq = useCallback((hz: number) => { if (isFinite(hz) && hz > 0) setCenterFreqRaw(hz) }, [])
  const setSpan = useCallback((hz: number) => { if (isFinite(hz) && hz > 0) setSpanRaw(hz) }, [])

  const setStartFreq = useCallback((hz: number) => {
    const currentStop = centerFreq + span / 2
    const newSpan = currentStop - hz
    const newCenter = (hz + currentStop) / 2
    setCenterFreqRaw(newCenter); setSpanRaw(newSpan)
  }, [centerFreq, span])

  const setStopFreq = useCallback((hz: number) => {
    const currentStart = centerFreq - span / 2
    const newSpan = hz - currentStart
    const newCenter = (currentStart + hz) / 2
    setCenterFreqRaw(newCenter); setSpanRaw(newSpan)
  }, [centerFreq, span])

  return {
    centerFreq, span, startFreq, stopFreq, rbw, vbw, refLevel, scale, offset, units,
    windowType, detectorType, sweepMode,
    setCenterFreq, setSpan, setStartFreq, setStopFreq,
    setRbw, setVbw, setRefLevel, setScale, setOffset, setUnits,
    setWindowType, setDetectorType, setSweepMode,
  }
}
