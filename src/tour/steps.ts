import type { RouteId } from '../app/TabManager'

export interface TourStep {
  title: string
  body: string
  /** value of a data-tour attribute to highlight; omit for a centred card */
  target?: string
  /** the step points into the analyzer controls drawer */
  controls?: boolean
}

export const TOURS: Partial<Record<RouteId, TourStep[]>> = {
  analyzer: [
    { title: 'Spectrum analyzer', body: 'Add a signal, then explore the controls.' },
    { target: 'signals', controls: true, title: 'Add a signal', body: '“+ Signal” adds one source. “Presets” loads three tones and a noise floor.' },
    { target: 'frequency', controls: true, title: 'Frequency and span', body: 'Center is the middle of the screen; span is the width shown.' },
    { target: 'bandwidth', controls: true, title: 'Resolution bandwidth', body: 'Narrower RBW separates close tones and lowers the noise floor.' },
    { target: 'traces', controls: true, title: 'Traces', body: 'Max Hold catches intermittent signals; Average smooths noise.' },
    { target: 'traces', controls: true, title: 'Trace math', body: 'Set a result trace to A − B (dB difference) or A + B (power sum).' },
    { target: 'markers', controls: true, title: 'Markers', body: 'Tap the spectrum or use Peak Search. Drag to move a marker.' },
    { target: 'markers', controls: true, title: 'Delta marker', body: '“+ Delta” reads Δ frequency and Δ level against the previous marker.' },
    { target: 'spectrum', title: 'Spectrum', body: 'Frequency left to right, power bottom to top.' },
    { target: 'waterfall', title: 'Waterfall', body: 'Each sweep adds a row at the top, coloured by power.' },
  ],
  waveform: [{ title: 'Waveform Designer', body: 'Pick a waveform; time and spectrum views update together.' }],
  modulation: [{ title: 'Modulation Explorer', body: 'Pick a scheme and lower the SNR to see symbols spread.' }],
  filter: [{ title: 'Filter Designer', body: 'Set type, cut-off, order and window; compare windows at a fixed order.' }],
  channelizer: [{ title: 'Polyphase Channelizer', body: 'Change the channel count and compare cost against a brute-force bank.' }],
  antenna: [{ title: 'Antenna Pattern Viewer', body: 'Pick an antenna; for arrays, try tapering and steering.' }],
  calculators: [{ title: 'RF Calculators', body: 'Pick a calculator; presets fill in typical values.' }],
}
