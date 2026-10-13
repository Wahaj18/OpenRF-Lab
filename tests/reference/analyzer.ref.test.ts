import { describe, it, expect } from 'vitest'
import ref from './reference.json'
import { computeSweep, planSweep, DISPLAY_BINS, applyRbwFilter } from '../../src/dsp/sweep'
import { applyDetector } from '../../src/dsp/detection'
import { applyTraceMode, newTraceBuffer, traceMath } from '../../src/dsp/traceModes'
import { computeBandPower, computeNdbBandwidth } from '../../src/dsp/markers'
import type { AnalyzerConfig, DetectorType, SignalConfig } from '../../src/dsp/types'

const A = ref.analyzer
const cfg = (over: Partial<AnalyzerConfig> = {}): AnalyzerConfig => ({
  centerFreq: A.center, span: A.span, rbw: A.rbw, vbw: A.rbw, refLevel: 0, scale: 10, fftSize: 0,
  sampleRate: A.span * 2.5, windowType: 'hann', detectorType: 'peak', sweepMode: 'continuous',
  traces: [{ index: 0, mode: 'clear-write', enabled: true }], ...over,
})
const cw = (f: number, p: number): SignalConfig => ({ id: `cw${f}`, enabled: true, type: 'cw', params: { frequency: f, powerDbm: p, phase: 0 } })
const noise = (p: number): SignalConfig => ({ id: 'n', enabled: true, type: 'noise', params: { noiseType: 'awgn', powerDbm: p } })
const start = A.center - A.span / 2
const freqAt = (i: number) => start + (i / (DISPLAY_BINS - 1)) * A.span
const mean = (a: ArrayLike<number>) => Array.from(a).reduce((s, v) => s + v, 0) / a.length

describe('spectrum analyzer vs numpy reference', () => {
  const trace = computeSweep(cfg(), A.tones.map(t => cw(t.freq, t.powerDbm)))

  it('reads each tone at its power and frequency across the span', () => {
    for (const t of A.tones) {
      const lo = Math.round(((t.freq - 2 * A.rbw - start) / A.span) * (DISPLAY_BINS - 1))
      const hi = Math.round(((t.freq + 2 * A.rbw - start) / A.span) * (DISPLAY_BINS - 1))
      let best = lo
      for (let i = lo; i <= hi; i++) if (trace[i] > trace[best]) best = i
      expect(trace[best]).toBeCloseTo(t.peakDbm, 1)
      expect(Math.abs(trace[best] - t.powerDbm)).toBeLessThan(0.1)
      expect(Math.abs(freqAt(best) - t.freq)).toBeLessThan(A.span / (DISPLAY_BINS - 1))
    }
  })

  it('matches the numpy trace bin by bin before detection', () => {
    const plan = planSweep(cfg())
    expect(plan.rbw).toBe(A.rbw)
    // an impulse in the bin powers reproduces the Gaussian RBW shape: -3 dB at ±RBW/2
    const p = new Float64Array(plan.fftSize / 2 + 1); p[plan.firstBin + 1000] = 1
    const out = applyRbwFilter(p, plan.firstBin, plan.lastBin, plan.rbw / plan.binHz)
    const rbwBins = plan.rbw / plan.binHz
    expect(out[1000]).toBeCloseTo(0, 6)
    for (const j of [1, 5, Math.round(rbwBins / 2), 12]) expect(out[1000 + j]).toBeCloseTo(-10 * Math.log10(2) * (2 * j / rbwBins) ** 2, 6)
  })

  it('N dB bandwidth of a CW equals the RBW (3 dB)', () => {
    const R = ref.analyzerNdb
    const tr = computeSweep(cfg({ span: R.span, centerFreq: R.center, rbw: R.rbw, vbw: R.rbw, detectorType: 'sample' }), [cw(R.tone, -30)])
    const bw = computeNdbBandwidth(tr, R.center - R.span / 2, R.span, R.center, 3)!
    expect(Math.abs(bw - R.bw3dB) / R.bw3dB).toBeLessThan(0.01)
    expect(Math.abs(bw - R.rbw) / R.rbw).toBeLessThan(0.02)
  })

  it('band power of a CW reads its power; of noise reads total in-band noise', () => {
    const rms = computeSweep(cfg({ detectorType: 'rms' }), [cw(2.42e9, -30)])
    expect(computeBandPower(rms, start, A.span, 2.42e9, 5e6, A.rbw)!).toBeCloseTo(-30, 0)
    // -60 dBm over 0..fs/2 = 125 MHz → a 10 MHz band holds -60 + 10log(10/125); averaged over 16 sweeps
    const bp = mean(Array.from({ length: 16 }, () => 10 ** (computeBandPower(computeSweep(cfg({ detectorType: 'rms', rbw: 1e6, vbw: 1e6 }), [noise(-60)]), start, A.span, A.center, 10e6, 1e6)! / 10)))
    expect(Math.abs(10 * Math.log10(bp) - (-60 + 10 * Math.log10(10 / 125)))).toBeLessThan(0.4)
  })

  it('RBW moves the noise floor by 10·log10(RBW ratio) and matches density × ENBW', () => {
    const levels = ref.analyzerNoise.cases.map(c => {
      const runs = Array.from({ length: 4 }, () => mean(computeSweep(cfg({ rbw: c.rbw, vbw: c.rbw, detectorType: 'rms' }), [noise(-60)])))
      return mean(runs)
    })
    ref.analyzerNoise.cases.forEach((c, i) => expect(Math.abs(levels[i] - c.rmsDbm)).toBeLessThan(0.5))
    expect(levels[2] - levels[0]).toBeGreaterThan(9.3)
    expect(levels[2] - levels[0]).toBeLessThan(10.7)
  })

  it('detector ordering on the same noisy trace: peak ≥ rms ≥ average ≥ neg-peak', () => {
    const nz = Float64Array.from({ length: 4000 }, () => -80 + 10 * Math.log10(-Math.log(Math.random())))
    const [pk, rms, avg, neg] = (['peak', 'rms', 'average', 'neg-peak'] as DetectorType[]).map(d => applyDetector(nz, DISPLAY_BINS, d))
    for (let i = 0; i < DISPLAY_BINS; i++) { expect(pk[i]).toBeGreaterThanOrEqual(rms[i]); expect(rms[i]).toBeGreaterThanOrEqual(avg[i] - 1e-9); expect(avg[i]).toBeGreaterThanOrEqual(neg[i]) }
    // exponential (Rayleigh-power) noise: log average sits 2.51 dB under the power mean
    expect(mean(rms) - mean(avg)).toBeGreaterThan(1.8); expect(mean(rms) - mean(avg)).toBeLessThan(3.0)
  })

  it('with fewer FFT bins than display points the trace is smooth (no zig-zag)', () => {
    const R = ref.analyzerNdb
    const tr = computeSweep(cfg({ span: R.span, centerFreq: R.center, rbw: R.rbw, vbw: R.rbw }), [cw(R.tone, -30)])
    const pk = Array.from(tr).indexOf(Math.max(...tr))
    for (let i = 1; i < pk; i++) expect(tr[i]).toBeGreaterThanOrEqual(tr[i - 1] - 1e-9)
  })
})

describe('detectors vs numpy', () => {
  const D = ref.detectors
  const input = Float64Array.from(D.input)
  const close = (a: Float64Array, b: number[]) => b.forEach((v, i) => expect(a[i]).toBeCloseTo(v, 9))
  it('peak, neg-peak, sample, average (log), rms (power)', () => {
    close(applyDetector(input, 6, 'peak'), D.peak)
    close(applyDetector(input, 6, 'neg-peak'), D.negPeak)
    close(applyDetector(input, 6, 'sample'), D.sample)
    close(applyDetector(input, 6, 'average'), D.average)
    close(applyDetector(input, 6, 'rms'), D.rms)
  })
  it('normal (Rosenfell) shows peaks, else alternates max/min', () => {
    const out = applyDetector(input, 6, 'normal')
    out.forEach((v, i) => expect(v === D.peak[i] || v === D.negPeak[i]).toBe(true))
    // a single tone inside an odd bucket shows its peak, not the minimum
    const tone = new Float64Array(24).fill(-90); tone[5] = -10
    expect(applyDetector(tone, 6, 'normal')[1]).toBe(-10)
    // a monotonic ramp: odd buckets show their minimum, even their maximum
    const ramp = Float64Array.from({ length: 24 }, (_, i) => -90 + i)
    expect(applyDetector(ramp, 6, 'normal')[1]).toBe(Math.min(...applyDetector(ramp, 6, 'neg-peak').slice(1, 2)))
    expect(applyDetector(ramp, 6, 'normal')[2]).toBe(applyDetector(ramp, 6, 'peak')[2])
  })
})

describe('trace modes and trace math vs numpy', () => {
  const T = ref.traceModes
  const sweeps = T.sweeps.map(s => Float64Array.from(s))
  const run = (mode: 'max-hold' | 'min-hold' | 'average') => {
    const b = newTraceBuffer(); let r = new Float64Array()
    for (const s of sweeps) r = applyTraceMode(s, b, mode)
    return r
  }
  it('max hold, min hold, power average', () => {
    T.maxHold.forEach((v, i) => expect(run('max-hold')[i]).toBeCloseTo(v, 9))
    T.minHold.forEach((v, i) => expect(run('min-hold')[i]).toBeCloseTo(v, 9))
    T.average.forEach((v, i) => expect(run('average')[i]).toBeCloseTo(v, 9))
  })
  it('add (power) and subtract (dB)', () => {
    T.add.forEach((v, i) => expect(traceMath(sweeps[0], sweeps[1], 'add')[i]).toBeCloseTo(v, 9))
    T.subtract.forEach((v, i) => expect(traceMath(sweeps[0], sweeps[1], 'subtract')[i]).toBeCloseTo(v, 9))
  })
  it('waterfall row equals the clear-write trace', () => {
    const det = computeSweep(cfg(), [cw(2.41e9, -30)])
    const shown = applyTraceMode(det, newTraceBuffer(), 'clear-write')
    expect(Array.from(shown)).toEqual(Array.from(det))
  })
})
