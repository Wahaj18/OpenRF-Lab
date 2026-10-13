import { describe, it, expect } from 'vitest'
import ref from './reference.json'
import { generateSamples, computeSpectrum } from '../../src/modules/waveform/useWaveformState'
import { getIdealConstellation, generateNoisyConstellation, generateAnalogSignal, getBitsPerSymbol, type ModulationType } from '../../src/modules/modulation/useModulationState'
import { designFIRFilter, computeFrequencyResponse, computeGroupDelay, type FilterType } from '../../src/dsp/filters'
import type { WindowType } from '../../src/dsp/windowing'
import { channelize } from '../../src/dsp/channelizer'
import { computeDipolePattern, computePatchPattern, computeHornPattern, computeArrayPattern, computeChebyshevWeights, computeTaylorWeights, type TaperType } from '../../src/dsp/antenna'
import { fspl, thermalNoise, cascadedNoiseFigure, fresnelRadius, eirp, freqToWavelength } from '../../src/utils/rf-math'
import { fft } from '../../src/dsp/fft'

const W = ref.waveform
const harmonics = (spec: Float64Array) => Array.from({ length: 8 }, (_, k) => spec[Math.round((k * W.f0 * W.N) / W.fs)])

describe('waveform designer vs scipy', () => {
  const cases: [string, number[]][] = [['square', W.square], ['sawtooth', W.sawtooth], ['triangle', W.triangle], ['sine', W.sine]]
  for (const [type, expected] of cases) {
    it(`${type}: harmonic levels match scipy.signal`, () => {
      const spec = computeSpectrum(generateSamples(type as never, W.f0, 1, 0, 0.5, W.fs, W.N))
      harmonics(spec).forEach((v, k) => { if (k > 0 && expected[k] > -40) expect(v).toBeCloseTo(expected[k], 1) })
    })
  }
  it('pulse 25% duty: DC and sinc harmonics', () => {
    const spec = computeSpectrum(generateSamples('pulse', W.f0, 1, 0, 0.25, W.fs, W.N))
    harmonics(spec).forEach((v, k) => { if (W.pulse25[k] > -60) expect(v).toBeCloseTo(W.pulse25[k], 2) })
    expect(spec[0]).toBeCloseTo(20 * Math.log10(0.25), 2)
  })
  it('Fourier theory: square 1/n odd, sawtooth 1/n, triangle 1/n², within 0.1 dB', () => {
    const sq = harmonics(computeSpectrum(generateSamples('square', W.f0, 1, 0, 0.5, W.fs, W.N)))
    const sw = harmonics(computeSpectrum(generateSamples('sawtooth', W.f0, 1, 0, 0.5, W.fs, W.N)))
    const tr = harmonics(computeSpectrum(generateSamples('triangle', W.f0, 1, 0, 0.5, W.fs, W.N)))
    for (let k = 1; k <= 7; k++) {
      if (W.squareTheory[k - 1] !== null) expect(Math.abs(sq[k] - W.squareTheory[k - 1]!)).toBeLessThan(0.1)
      else expect(sq[k]).toBeLessThan(-60)
      expect(Math.abs(sw[k] - W.sawTheory[k - 1])).toBeLessThan(0.1)
      if (W.triTheory[k - 1] !== null) expect(Math.abs(tr[k] - W.triTheory[k - 1]!)).toBeLessThan(0.1)
    }
  })
  it('period and amplitude', () => {
    const s = generateSamples('sine', W.f0, 0.7, 0, 0.5, W.fs, W.N)
    expect(Math.max(...s)).toBeCloseTo(0.7, 3)
    const period = W.fs / W.f0
    for (let i = 0; i < 64; i++) expect(s[i + period]).toBeCloseTo(s[i], 9)
  })
  it('chirp sweeps f0 → 4·f0 like scipy.signal.chirp, capped at Nyquist', () => {
    const s = generateSamples('chirp', W.chirp.f0, 1, 0, 0.5, W.fs, W.N)
    W.chirp.samples.forEach((v, i) => expect(s[i]).toBeCloseTo(v, 6))
    // with 4·f0 above Nyquist the sweep ends at fs/2: no energy folds back below the start
    const hi = generateSamples('chirp', 1500, 1, 0, 0.5, W.fs, W.N)
    const n = hi.length - 2
    const instF = (Math.acos(Math.max(-1, Math.min(1, (hi[n - 1] + hi[n + 1]) / (2 * hi[n])))) * W.fs) / (2 * Math.PI)
    expect(Number.isFinite(instF)).toBe(true)
    expect(instF).toBeGreaterThan(3000)
  })
})

describe('modulation explorer vs numpy', () => {
  const M = ref.modulation
  const es = (p: { i: number; q: number }[]) => p.reduce((s, x) => s + x.i * x.i + x.q * x.q, 0) / p.length
  it('every constellation has unit average energy; points match numpy', () => {
    for (const t of ['bpsk', 'qpsk', '8psk', '16qam', '64qam', '256qam'] as ModulationType[]) expect(es(getIdealConstellation(t))).toBeCloseTo(1, 9)
    const q16 = getIdealConstellation('16qam')
    M.qam16.forEach(([i, q]) => expect(q16.some(p => Math.abs(p.i - i) < 1e-9 && Math.abs(p.q - q) < 1e-9)).toBe(true))
    const c64 = getIdealConstellation('64qam').at(-1)!; expect(c64.i).toBeCloseTo(M.qam64Corner[0], 9)
    const c256 = getIdealConstellation('256qam').at(-1)!; expect(c256.i).toBeCloseTo(M.qam256Corner[0], 9)
  })
  it('spectral efficiency is log2(M)', () => {
    const m: [ModulationType, number][] = [['bpsk', 2], ['qpsk', 4], ['8psk', 8], ['16qam', 16], ['64qam', 64], ['256qam', 256]]
    for (const [t, order] of m) expect(getBitsPerSymbol(t)).toBe(Math.log2(order))
  })
  it('noise spread (EVM) follows 1/sqrt(SNR)', () => {
    for (const { snr, evmRms } of M.evmVsSnr) {
      const ideal = getIdealConstellation('16qam')
      const pts = generateNoisyConstellation(ideal, 20000, snr)
      const err = pts.map(p => Math.min(...ideal.map(r => (p.i - r.i) ** 2 + (p.q - r.q) ** 2)))
      const evm = Math.sqrt(err.reduce((a, b) => a + b, 0) / err.length)
      expect(Math.abs(evm - evmRms) / evmRms).toBeLessThan(snr <= 10 ? 0.25 : 0.05)
    }
  })
  it('FM tone: Bessel sidebands and Carson bandwidth', () => {
    const fs = 8192, fc = 1000, beta = 2
    const sig = Float64Array.from(generateAnalogSignal('fm', fc, beta, fs, fs, Infinity))
    const { real, imag } = fft(sig, new Float64Array(fs))
    const amp = (f: number) => (2 * Math.hypot(real[f], imag[f])) / fs
    M.fmBessel.forEach((j, k) => expect(amp(fc + k * 100)).toBeCloseTo(j, 3))
    let inBand = 0, total = 0
    for (let f = 0; f < fs / 2; f++) { const p = amp(f) ** 2; total += p; if (Math.abs(f - fc) <= M.carson.bw / 2) inBand += p }
    expect(inBand / total).toBeCloseTo(M.carsonPowerFraction, 3)
  })
  it('AM: carrier and sidebands at m/2', () => {
    const fs = 8192, fc = 1000, m = 0.6
    const sig = Float64Array.from(generateAnalogSignal('am', fc, m, fs, fs, Infinity))
    const { real, imag } = fft(sig, new Float64Array(fs))
    const amp = (f: number) => (2 * Math.hypot(real[f], imag[f])) / fs
    expect(amp(fc)).toBeCloseTo(1, 6); expect(amp(fc + 100)).toBeCloseTo(m / 2, 6); expect(amp(fc - 100)).toBeCloseTo(m / 2, 6)
  })
})

describe('filter designer vs scipy.signal.firwin / freqz', () => {
  for (const r of ref.filters) {
    it(`${r.type} ${r.window}`, () => {
      const [lo, hi] = r.type === 'lowpass' || r.type === 'highpass' ? [1000, 2000] : [1000, 2000]
      const h = designFIRFilter(r.type as FilterType, lo, hi, r.taps, r.window as WindowType, 8192)
      r.h.forEach((v, i) => expect(h[i]).toBeCloseTo(v, 10))
      const resp = computeFrequencyResponse(h, 512, 8192)
      r.magDb.forEach((v, i) => { if (v > -100) expect(resp.magnitude[i]).toBeCloseTo(v, 6) })
      r.phase.forEach((v, i) => {
        if (r.magDb[i] > -60) { const d = Math.abs(((resp.phase[i] - v + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); expect(d).toBeLessThan(1e-6) }
      })
      const gd = computeGroupDelay(h, 512, 8192)
      gd.forEach((v, i) => { if (resp.magnitude[i] > -120) expect(v).toBeCloseTo((r.taps - 1) / 2, 3) })
    })
  }
  it('even tap counts are made odd for highpass and bandstop', () => {
    expect(designFIRFilter('highpass', 1000, 2000, 50, 'hamming', 8192).length).toBe(51)
    const r = computeFrequencyResponse(designFIRFilter('highpass', 1000, 2000, 50, 'hamming', 8192), 512, 8192)
    expect(r.magnitude[511]).toBeGreaterThan(-0.1)
  })
  it('-6 dB at the cutoff and stopband attenuation per window', () => {
    for (const [win, v] of Object.entries(ref.filterWindows)) {
      const h = designFIRFilter('lowpass', 1000, 2000, 101, win as WindowType, 8192)
      const r = computeFrequencyResponse(h, 8192, 8192)
      let i = 0; while (r.magnitude[i] >= -6.0206) i++
      const f6 = r.frequencies[i - 1] + (r.frequencies[i] - r.frequencies[i - 1]) * (-6.0206 - r.magnitude[i - 1]) / (r.magnitude[i] - r.magnitude[i - 1])
      expect(f6).toBeCloseTo(v.f6dB, 3)
      let stop = -Infinity
      for (let k = 0; k < 8192; k++) if (r.frequencies[k] >= 1600) stop = Math.max(stop, r.magnitude[k])
      expect(-stop).toBeCloseTo(v.stopbandAttenDb, 2)
    }
  })
})

describe('polyphase channelizer vs scipy brute force (mix, lfilter, decimate)', () => {
  const C = ref.channelizer
  const res = channelize(Float64Array.from(C.input), { numChannels: C.M, prototypeOrder: C.L, sampleRate: C.fs })
  it('per-channel output power matches', () => {
    C.channelPowerDb.forEach((v, i) => expect(res.channelPowerDb[i]).toBeCloseTo(v, 6))
  })
  it('prototype response matches freqz', () => {
    C.protoMagDb.forEach((v, i) => { if (v > -100) expect(res.prototypeResponse[i]).toBeCloseTo(v, 6) })
  })
  it('multiply counts', () => {
    expect(res.complexityPolyphase).toBeCloseTo(C.multPoly, 6)
    expect(res.complexityBruteForce).toBe(C.multBrute)
  })
})

describe('antenna pattern viewer vs numeric integration', () => {
  const A = ref.antenna
  it('dipole (half-wave): HPBW 78°, 2.15 dBi', () => {
    const r = computeDipolePattern()
    expect(r.beamwidthDeg).toBeCloseTo(A.dipole.hpbw, 0); expect(r.directivity).toBeCloseTo(A.dipole.directivity, 2)
  })
  it('patch and horn', () => {
    const p = computePatchPattern(); expect(Math.abs(p.beamwidthDeg - A.patch.hpbw)).toBeLessThan(0.5); expect(p.directivity).toBeCloseTo(A.patch.directivity, 2)
    const h = computeHornPattern(20); expect(Math.abs(h.beamwidthDeg - A.horn.hpbw)).toBeLessThan(0.3); expect(h.directivity).toBeCloseTo(A.horn.directivity, 2)
  })
  for (const a of A.arrays) {
    it(`array N=${a.n} ${a.taper} SLL ${a.sll} scan ${a.scan}°`, () => {
      if (a.taper === 'chebyshev') computeChebyshevWeights(a.n, a.sll).forEach((w, i) => expect(w).toBeCloseTo(a.weights[i], 9))
      if (a.taper === 'taylor') computeTaylorWeights(a.n, a.sll).forEach((w, i) => expect(w).toBeCloseTo(a.weights[i], 9))
      const r = computeArrayPattern({ numElements: a.n, spacing: a.spacing, taperType: a.taper as TaperType, scanAngleDeg: a.scan, sidelobeLevel: a.sll })
      const peak = r.angles[Array.from(r.pattern).indexOf(Math.max(...r.pattern.slice(90, 271)), 90)]
      expect(Math.abs(peak - a.peakDeg)).toBeLessThanOrEqual(1)
      expect(Math.abs(r.beamwidthDeg - a.hpbw)).toBeLessThan(0.3)
      expect(Math.abs(r.sidelobeLevel - a.sllDb!)).toBeLessThan(0.5)
      expect(r.directivity).toBeCloseTo(a.directivity, 2)
    })
  }
})

describe('calculators spot checks vs numpy', () => {
  const K = ref.calculators
  it('FSPL, thermal noise, cascaded NF, Fresnel, EIRP, wavelength', () => {
    expect(fspl(2.4e9, 1000)).toBeCloseTo(K.fspl_2p4GHz_1km, 9)
    expect(thermalNoise(290, 1e6)).toBeCloseTo(K.thermal_290K_1MHz, 9)
    expect(cascadedNoiseFigure([{ gain: 15, nf: 2 }, { gain: 10, nf: 5 }, { gain: 20, nf: 10 }])).toBeCloseTo(K.nf_cascade, 9)
    expect(fresnelRadius(1, 2.4e9, 500, 500)).toBeCloseTo(K.fresnel1_2p4GHz_1km_mid, 9)
    expect(eirp(20, 6, 2)).toBe(K.eirp)
    expect(freqToWavelength(915e6)).toBeCloseTo(K.wavelength_915MHz, 12)
  })
})
