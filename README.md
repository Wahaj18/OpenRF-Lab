# OpenRF-Lab

OpenRF-Lab is a browser-based tool for learning RF engineering and signal processing. It combines a simulated spectrum analyzer with small interactive modules on waveforms, modulation, filters, channelizers and antennas, plus a set of RF calculators. Each module has a "Learn" section that explains the math behind it.

All signal processing runs in the browser, in a Web Worker, so there is no server and no hardware to set up.

## What it teaches

- How a swept spectrum analyzer behaves: span, RBW, VBW, reference level, detectors, trace hold modes and markers
- How common signals look in frequency and over time: CW, noise, AM/FM, PSK/QAM, chirps, pulses and frequency hoppers
- How modulation schemes compare, and how noise affects constellations
- How windowed-sinc FIR filters are designed, and what their magnitude, phase and group delay look like
- How a polyphase filter bank splits a wideband signal into channels, and why it costs less than doing it by brute force
- How antenna patterns, array factor, tapering and beam steering work
- The basic RF arithmetic: link budgets, path loss, noise figure, EIRP, Fresnel zones, thermal noise and decibels

## Modules

| Module | What you can do |
|--------|-----------------|
| Spectrum Analyzer | Add simulated signals and watch them on a spectrum display and a waterfall. Up to 6 traces (clear/write, max/min hold, average, view, trace math). Normal, delta, band power and N dB bandwidth markers. Peak, sample, average, normal, negative-peak and RMS detectors. |
| Waveform Designer | Generate sine, square, sawtooth, triangle, chirp and pulse waveforms and compare the time and frequency views. |
| Modulation Explorer | Constellations from BPSK to 256-QAM, AM/FM waveforms, adjustable SNR and spectral efficiency. |
| Filter Designer | Lowpass, highpass, bandpass and bandstop FIR filters with Hamming, Hann, Blackman, Kaiser or flat-top windows. Shows magnitude, phase, group delay and impulse response. |
| Polyphase Channelizer | Change the channel count and prototype filter order, and compare the cost against a brute-force filter bank. |
| Antenna Pattern Viewer | Polar patterns for a dipole, a patch, a horn and N-element arrays, with spacing, Taylor/Chebyshev taper and scan angle. Reports beamwidth, sidelobe level and directivity. |
| RF Calculators | Link budget (with WiFi, LTE, 5G, satellite, LoRa and radar presets), FSPL, unit conversions, cascaded noise figure, EIRP against FCC/ETSI limits, Fresnel zone, thermal noise, wavelength/frequency and dB arithmetic. |

Each module except the calculators can be opened as its own tab or as a small panel docked inside the analyzer.

## Running it

You need Node.js 20 or newer.

```bash
git clone https://github.com/Wahaj18/OpenRF-Lab.git
cd OpenRF-Lab
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` | Type check and production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npx vitest run` | Run the tests |
| `npm run lint` | Run ESLint |

### Desktop app (Windows)

There is also an Electron build. You can build a desktop installer yourself:

```bash
npm run electron:dev             # build and launch locally
npm run electron:build           # NSIS installer in release/
npm run electron:build:portable  # portable .exe
npm run electron:build:dir       # unpacked folder in release/win-unpacked/
```

## How the code is organised

```
src/
  app/          tab manager and theme
  components/   shared UI
  modules/      one folder per module (analyzer, waveform, modulation,
                filter, channelizer, antenna, calculators)
  dsp/          FFT, windows, detectors, FIR design, channelizer,
                antenna math, signal generators and the Web Worker engine
  hooks/        analyzer, trace, marker and signal-engine state
  utils/        RF math, unit conversions, colour maps, formatting
tests/          Vitest tests for the DSP code, hooks and utilities
```

The spectrum and waterfall are drawn on a canvas, and the markers are an SVG layer on top so they can be dragged. The FFT is a plain radix-2 Cooley-Tukey implementation in `src/dsp/fft.ts`, which is short enough to read alongside a textbook.

Built with React, TypeScript, Vite, Tailwind CSS, D3 and mathjs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Corrections to the math or the explanations are especially welcome.

## License

MIT. See [LICENSE](LICENSE).
