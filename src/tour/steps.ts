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
    { title: 'Welcome to the analyzer', body: 'The screen starts empty: there is nothing to measure until you add a signal. This short tour walks through the controls you will use most.' },
    { target: 'signals', controls: true, title: 'Add a signal', body: 'Use “+ Signal” to add a tone, noise, a modulated carrier, a chirp or a hopper, or “Presets” to load a few tones and a noise floor at once.' },
    { target: 'frequency', controls: true, title: 'Frequency and span', body: 'Center frequency is the middle of the screen and span is the width shown. Start and stop update together with them.' },
    { target: 'bandwidth', controls: true, title: 'Resolution bandwidth', body: 'RBW sets how finely the analyzer separates nearby signals. A narrower RBW resolves close tones and lowers the noise floor, at the cost of a slower, larger FFT.' },
    { target: 'traces', controls: true, title: 'Max hold and averaging', body: 'Switch a trace to Max Hold to catch intermittent signals, or to Average to smooth noise and reveal weak, steady ones.' },
    { target: 'markers', controls: true, title: 'Place a marker', body: 'Tap the spectrum or use “+ Marker” / “Peak Search” to read a frequency and level. Drag a marker to move it.' },
    { target: 'markers', controls: true, title: 'Read a delta marker', body: '“+ Delta” adds a marker measured relative to the previous one. The marker table below the display shows the Δ frequency and Δ amplitude.' },
    { target: 'spectrum', title: 'The spectrum display', body: 'Frequency runs left to right and power bottom to top, using the reference level and dB/div you set under Amplitude.' },
    { target: 'waterfall', title: 'Use the waterfall', body: 'Each new sweep is a row at the top, coloured by power. Hopping or pulsed signals show up here as patterns over time that a single sweep would miss.' },
  ],
  waveform: [
    { title: 'Waveform Designer', body: 'Pick a waveform and change its parameters. The time-domain plot and its spectrum update side by side, so you can see how shape affects harmonics.' },
    { title: 'Try this', body: 'Compare a sine with a square wave at the same frequency and look at the odd harmonics that appear in the spectrum.' },
  ],
  modulation: [
    { title: 'Modulation Explorer', body: 'Choose a scheme from BPSK up to 256-QAM, or AM and FM, and see its constellation or waveform.' },
    { title: 'Try this', body: 'Lower the SNR and watch the constellation points spread until neighbouring symbols overlap. That overlap is what causes bit errors.' },
  ],
  filter: [
    { title: 'Filter Designer', body: 'Design a windowed FIR filter by choosing its type, cut-off, order and window, then inspect magnitude, phase, group delay and impulse response.' },
    { title: 'Try this', body: 'Keep the order fixed and switch windows: notice the trade-off between a sharp transition band and low sidelobes.' },
  ],
  channelizer: [
    { title: 'Polyphase Channelizer', body: 'A polyphase filter bank splits one wide band into many channels using a single shared filter and an FFT.' },
    { title: 'Try this', body: 'Increase the channel count and compare the cost against a brute-force bank of separate filters.' },
  ],
  antenna: [
    { title: 'Antenna Pattern Viewer', body: 'Pick an antenna type to draw its radiation pattern and read beamwidth, sidelobe level and directivity.' },
    { title: 'Try this', body: 'Build an array, add tapering to lower the sidelobes, then steer the beam and watch the main lobe move and widen.' },
  ],
  calculators: [
    { title: 'RF Calculators', body: 'Pick a calculator: link budget, path loss, noise figure, EIRP, Fresnel zone, thermal noise or unit conversions. Presets fill in typical WiFi, LTE, 5G, satellite, LoRa and radar values.' },
  ],
}
