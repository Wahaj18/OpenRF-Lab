import { useState, useEffect, useRef, useCallback } from 'react'
import { useSignalEngine } from '../../hooks/useSignalEngine'
import { useAnalyzerState } from '../../hooks/useAnalyzerState'
import { useTraces } from '../../hooks/useTraces'
import { useMarkers, withLiveLevels } from '../../hooks/useMarkers'
import { ControlSidebar } from './ControlSidebar'
import { SignalDialog } from './SignalDialog'
import { SpectrumCanvas } from './SpectrumCanvas'
import { WaterfallCanvas } from './WaterfallCanvas'
import { MarkerOverlay } from './MarkerOverlay'
import { MarkerTable } from './MarkerTable'
import { QuickAccessBar } from '../../components/QuickAccessBar'
import { StatusBar } from '../../components/StatusBar'
import type { SignalConfig, AnalyzerConfig } from '../../dsp/types'

const PRESET_SIGNALS: SignalConfig[] = [
  { id: 'sig-1', enabled: true, type: 'cw', params: { frequency: 2.437e9, powerDbm: -20, phase: 0 } },
  { id: 'sig-2', enabled: true, type: 'cw', params: { frequency: 2.412e9, powerDbm: -35, phase: 0 } },
  { id: 'sig-3', enabled: true, type: 'cw', params: { frequency: 2.462e9, powerDbm: -30, phase: 0 } },
  { id: 'sig-4', enabled: true, type: 'noise', params: { noiseType: 'awgn', powerDbm: -55 } },
]

export function AnalyzerTab() {
  const engine = useSignalEngine()
  const analyzerState = useAnalyzerState()
  const { traces, setTraceMode } = useTraces()
  const {
    markers, addMarker, addDeltaMarker, addBandPowerMarker,
    addNdbMarker, removeMarker, moveMarker, clearAllMarkers, peakSearch,
  } = useMarkers()

  const [signals, setSignals] = useState<SignalConfig[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSignal, setEditingSignal] = useState<SignalConfig | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  // ResizeObserver for center panel dimensions
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setContainerSize({ width: Math.floor(width), height: Math.floor(height) })
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Send analyzer config to engine when state changes
  useEffect(() => {
    const fftSize = Math.pow(2, Math.max(8, Math.ceil(Math.log2(analyzerState.span / analyzerState.rbw))))
    const config: AnalyzerConfig = {
      centerFreq: analyzerState.centerFreq,
      span: analyzerState.span,
      rbw: analyzerState.rbw,
      vbw: analyzerState.vbw,
      refLevel: analyzerState.refLevel,
      scale: analyzerState.scale,
      fftSize,
      sampleRate: analyzerState.span * 1.25,
      windowType: analyzerState.windowType,
      detectorType: analyzerState.detectorType,
      sweepMode: analyzerState.sweepMode,
      traces: traces.map(t => ({ index: t.index, mode: t.mode, enabled: t.enabled })),
    }
    engine.configure(config)
  }, [
    analyzerState.centerFreq, analyzerState.span, analyzerState.rbw,
    analyzerState.vbw, analyzerState.refLevel, analyzerState.scale,
    analyzerState.windowType, analyzerState.detectorType, analyzerState.sweepMode,
    traces, engine.configure,
  ])

  // Send signals to engine when they change
  useEffect(() => {
    engine.setSignals(signals.filter(s => s.enabled))
  }, [signals, engine.setSignals])

  // Start engine on mount, stop on unmount
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [engine.start, engine.stop])

  // Sidebar callbacks
  const handleToggleSignal = useCallback((id: string) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }, [])

  const handleAddSignal = useCallback(() => {
    setEditingSignal(null)
    setDialogOpen(true)
  }, [])

  const handleEditSignal = useCallback((id: string) => {
    const sig = signals.find(s => s.id === id)
    if (sig) {
      setEditingSignal(sig)
      setDialogOpen(true)
    }
  }, [signals])

  const handleSaveSignal = useCallback((signal: SignalConfig) => {
    setSignals(prev => {
      const idx = prev.findIndex(s => s.id === signal.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = signal
        return next
      }
      return [...prev, signal]
    })
  }, [])

  const handleDeleteSignal = useCallback((id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleLoadPreset = useCallback(() => {
    setSignals(PRESET_SIGNALS)
  }, [])

  const handleAddMarker = useCallback(() => {
    addMarker(analyzerState.centerFreq, analyzerState.refLevel - 30, 0)
  }, [addMarker, analyzerState.centerFreq, analyzerState.refLevel])

  const handleAddDelta = useCallback(() => {
    const lastMarker = markers[markers.length - 1]
    if (lastMarker) {
      addDeltaMarker(analyzerState.centerFreq, analyzerState.refLevel - 30, 0, lastMarker.id)
    } else {
      addMarker(analyzerState.centerFreq, analyzerState.refLevel - 30, 0)
    }
  }, [addDeltaMarker, addMarker, markers, analyzerState.centerFreq, analyzerState.refLevel])

  const handlePeakSearch = useCallback(() => {
    const spectrum = engine.spectrumData.get(0)
    if (spectrum) {
      peakSearch(spectrum, analyzerState.startFreq, analyzerState.span, 0)
    }
  }, [engine.spectrumData, peakSearch, analyzerState.startFreq, analyzerState.span])

  const handleMarkerToCenter = useCallback(() => {
    const lastMarker = markers[markers.length - 1]
    if (lastMarker) {
      analyzerState.setCenterFreq(lastMarker.frequency)
    }
  }, [markers, analyzerState.setCenterFreq])

  const handleNdbBw = useCallback(() => {
    addNdbMarker(analyzerState.centerFreq, analyzerState.refLevel - 30, 0, 3)
  }, [addNdbMarker, analyzerState.centerFreq, analyzerState.refLevel])

  const handleBandPower = useCallback(() => {
    addBandPowerMarker(analyzerState.centerFreq, analyzerState.refLevel - 30, 0, analyzerState.span / 10)
  }, [addBandPowerMarker, analyzerState.centerFreq, analyzerState.refLevel, analyzerState.span])

  const handleClickSpectrum = useCallback((frequency: number, amplitude: number) => {
    addMarker(frequency, amplitude, 0)
  }, [addMarker])

  const liveMarkers = withLiveLevels(markers, engine.spectrumData, analyzerState.startFreq, analyzerState.span)

  // Layout: 60% spectrum, 40% waterfall
  const spectrumHeight = Math.floor(containerSize.height * 0.6)
  const waterfallHeight = containerSize.height - spectrumHeight
  const totalDbRange = analyzerState.scale * 10

  return (
    <div className="flex-1 flex flex-col overflow-y-auto md:overflow-hidden">
      <div className="flex-1 flex overflow-visible md:overflow-hidden min-h-[600px] md:min-h-0">
        {/* Left sidebar */}
        <ControlSidebar
          analyzerState={analyzerState}
          traces={traces}
          setTraceMode={setTraceMode}
          signals={signals}
          onToggleSignal={handleToggleSignal}
          onAddSignal={handleAddSignal}
          onEditSignal={handleEditSignal}
          onLoadPreset={handleLoadPreset}
          onAddMarker={handleAddMarker}
          onAddDelta={handleAddDelta}
          onPeakSearch={handlePeakSearch}
          onMarkerToCenter={handleMarkerToCenter}
          onNdbBw={handleNdbBw}
          onBandPower={handleBandPower}
          onClearAllMarkers={clearAllMarkers}
        />

        {/* Center display area */}
        <div ref={containerRef} className="flex-1 min-w-0 flex flex-col relative overflow-hidden p-2 gap-1 min-h-[480px] md:min-h-0">
          {/* Spectrum + marker overlay */}
          <div className="relative" data-tour="spectrum" style={{ height: spectrumHeight }}>
            <SpectrumCanvas
              width={containerSize.width}
              height={spectrumHeight}
              spectrumData={engine.spectrumData}
              traceColors={traces.map(t => t.color)}
              traceVisible={traces.map(t => t.visible)}
              refLevel={analyzerState.refLevel}
              scale={analyzerState.scale}
              numDivY={10}
              startFreq={analyzerState.startFreq}
              stopFreq={analyzerState.stopFreq}
              offset={analyzerState.offset}
              onClickSpectrum={handleClickSpectrum}
            />
            <MarkerOverlay
              width={containerSize.width}
              height={spectrumHeight}
              markers={liveMarkers}
              startFreq={analyzerState.startFreq}
              stopFreq={analyzerState.stopFreq}
              refLevel={analyzerState.refLevel}
              totalDbRange={totalDbRange}
              onMoveMarker={moveMarker}
            />
          </div>

          {signals.length === 0 && (
            <div className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none px-4">
              <span className="text-xs text-center rounded px-3 py-2" style={{ color: 'var(--sf-text-muted)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                No signals. Use + Signal in Signal Simulator.
              </span>
            </div>
          )}

          {/* Waterfall */}
          <div data-tour="waterfall">
          <WaterfallCanvas
            width={containerSize.width}
            height={waterfallHeight}
            waterfallRow={engine.waterfallRow}
            refLevel={analyzerState.refLevel}
            scale={analyzerState.scale}
            numDivY={10}
          />
          </div>
        </div>
      </div>

      {/* Marker table */}
      <MarkerTable markers={liveMarkers} onRemoveMarker={removeMarker}
        spectrumData={engine.spectrumData} startFreq={analyzerState.startFreq} span={analyzerState.span} />

      {/* Bottom bar: Quick access + Status */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5"
        style={{ backgroundColor: 'var(--sf-bg-toolbar)', borderTop: '1px solid var(--sf-border)' }}>
        <QuickAccessBar state={analyzerState} traces={traces} />
        <StatusBar isRunning={engine.isRunning} sweepCount={engine.sweepCount}
          onStart={engine.start} onStop={engine.stop} onSingleSweep={engine.singleSweep} />
      </div>

      {/* Signal add/edit dialog */}
      <SignalDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveSignal}
        onDelete={handleDeleteSignal}
        editSignal={editingSignal}
      />
    </div>
  )
}
