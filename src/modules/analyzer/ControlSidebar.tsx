import { useEffect, useState, type ReactNode } from 'react'
import { CONTROLS_EVENT } from '../../tour/Tour'
import { FrequencyControls } from './FrequencyControls'
import { AmplitudeControls } from './AmplitudeControls'
import { BandwidthControls } from './BandwidthControls'
import { TraceControls } from './TraceControls'
import { MarkerControls } from './MarkerControls'
import { SignalSimControls } from './SignalSimControls'
import type { AnalyzerStateValues } from '../../hooks/useAnalyzerState'
import type { TraceState } from '../../hooks/useTraces'
import type { TraceMode, SignalConfig } from '../../dsp/types'

interface Props {
  analyzerState: AnalyzerStateValues; traces: TraceState[]
  setTraceMode: (index: number, mode: TraceMode) => void; signals: SignalConfig[]
  onToggleSignal: (id: string) => void; onAddSignal: () => void; onEditSignal: (id: string) => void; onLoadPreset: () => void
  onAddMarker: () => void; onAddDelta: () => void; onPeakSearch: () => void
  onMarkerToCenter: () => void; onNdbBw: () => void; onBandPower: () => void; onClearAllMarkers: () => void
}

function Section({ title, color, children, tour, defaultOpen = true }: { title: string; color?: string; children: ReactNode; tour?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div data-tour={tour} style={{ borderBottom: '1px solid var(--sf-border)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold tracking-wider cursor-pointer"
        style={{ backgroundColor: 'var(--sf-bg-toolbar)', color: color ?? 'var(--sf-accent-blue)', border: 'none' }}>
        {title} <span style={{ color: 'var(--sf-text-dim)' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export function ControlSidebar(props: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onTour = (e: Event) => setOpen((e as CustomEvent<boolean>).detail)
    window.addEventListener(CONTROLS_EVENT, onTour)
    return () => window.removeEventListener(CONTROLS_EVENT, onTour)
  }, [])
  return (
    <>
      {/* Mobile toggle button — positioned below tab bar, not overlapping it */}
      <button onClick={() => setOpen(!open)}
        className="md:hidden fixed right-2 top-14 z-50 px-4 min-h-11 rounded-full text-xs font-semibold shadow-lg"
        style={{ backgroundColor: 'var(--sf-accent-blue)', color: 'var(--sf-bg-primary)', border: 'none' }}>
        {open ? '✕ Close' : '☰ Controls'}
      </button>
      {open && (
        <button onClick={() => setOpen(false)} aria-label="Close controls"
          className="md:hidden fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: 'none' }} />
      )}
      <div className={`flex-col overflow-y-auto text-[11px] pb-72 md:pb-0 ${open ? 'fixed left-0 right-0 bottom-0 z-40 flex' : 'hidden'} md:relative md:flex md:top-auto md:inset-auto`}
        style={{ top: 48, width: 230, maxWidth: '85vw', backgroundColor: 'var(--sf-bg-panel)', borderRight: '1px solid var(--sf-border)' }}>
      <Section title="FREQUENCY" tour="frequency"><FrequencyControls state={props.analyzerState} /></Section>
      <Section title="AMPLITUDE"><AmplitudeControls state={props.analyzerState} /></Section>
      <Section title="BW / SWEEP" tour="bandwidth"><BandwidthControls state={props.analyzerState} /></Section>
      <Section title="TRACES" tour="traces"><TraceControls traces={props.traces} setTraceMode={props.setTraceMode} /></Section>
      <Section title="MARKERS" tour="markers">
        <MarkerControls onAddMarker={props.onAddMarker} onAddDelta={props.onAddDelta} onPeakSearch={props.onPeakSearch}
          onMarkerToCenter={props.onMarkerToCenter} onNdbBw={props.onNdbBw} onBandPower={props.onBandPower} onClearAll={props.onClearAllMarkers} />
      </Section>
      <Section title="SIGNAL SIMULATOR" color="var(--sf-accent-green)" tour="signals">
        <SignalSimControls signals={props.signals} onToggleSignal={props.onToggleSignal}
          onAddSignal={props.onAddSignal} onEditSignal={props.onEditSignal} onLoadPreset={props.onLoadPreset} />
      </Section>
    </div>
    </>
  )
}
