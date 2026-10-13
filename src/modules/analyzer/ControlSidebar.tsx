import { useState, type ReactNode } from 'react'
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

function Section({ title, color, children, defaultOpen = true }: { title: string; color?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--sf-border)' }}>
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
  return (
    <>
      {/* Mobile toggle button — positioned below tab bar, not overlapping it */}
      <button onClick={() => setOpen(!open)}
        className="md:hidden fixed left-2 z-50 px-2 py-1 rounded text-[10px] font-semibold"
        style={{ top: 44, backgroundColor: 'var(--sf-accent-blue)', color: 'var(--sf-bg-primary)', border: 'none' }}>
        {open ? '✕ Close' : '☰ Controls'}
      </button>
      {open && (
        <button onClick={() => setOpen(false)} aria-label="Close controls"
          className="md:hidden fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: 'none' }} />
      )}
      <div className={`flex-col overflow-y-auto text-[11px] ${open ? 'fixed left-0 right-0 bottom-0 z-40 flex' : 'hidden'} md:relative md:flex md:top-auto md:inset-auto`}
        style={{ top: 40, width: 230, maxWidth: '85vw', backgroundColor: 'var(--sf-bg-panel)', borderRight: '1px solid var(--sf-border)' }}>
      <Section title="FREQUENCY"><FrequencyControls state={props.analyzerState} /></Section>
      <Section title="AMPLITUDE"><AmplitudeControls state={props.analyzerState} /></Section>
      <Section title="BW / SWEEP"><BandwidthControls state={props.analyzerState} /></Section>
      <Section title="TRACES"><TraceControls traces={props.traces} setTraceMode={props.setTraceMode} /></Section>
      <Section title="MARKERS">
        <MarkerControls onAddMarker={props.onAddMarker} onAddDelta={props.onAddDelta} onPeakSearch={props.onPeakSearch}
          onMarkerToCenter={props.onMarkerToCenter} onNdbBw={props.onNdbBw} onBandPower={props.onBandPower} onClearAll={props.onClearAllMarkers} />
      </Section>
      <Section title="SIGNAL SIMULATOR" color="var(--sf-accent-green)">
        <SignalSimControls signals={props.signals} onToggleSignal={props.onToggleSignal}
          onAddSignal={props.onAddSignal} onEditSignal={props.onEditSignal} onLoadPreset={props.onLoadPreset} />
      </Section>
    </div>
    </>
  )
}
