import { describe, it, expect } from 'vitest'
import { computeSweep, DISPLAY_BINS } from '../../src/dsp/sweep'
import type { AnalyzerConfig, SignalConfig } from '../../src/dsp/types'

const cfg: AnalyzerConfig = {
  centerFreq: 2.437e9, span: 100e6, rbw: 100e3, vbw: 100e3, refLevel: 0, scale: 10,
  fftSize: 1024, sampleRate: 125e6, windowType: 'hann', detectorType: 'peak',
  sweepMode: 'continuous', traces: [{ index: 0, mode: 'clear-write', enabled: true }],
}
const cw = (frequency: number, powerDbm = -20): SignalConfig =>
  ({ id: `cw-${frequency}`, enabled: true, type: 'cw', params: { frequency, powerDbm, phase: 0 } })
const peakBin = (s: Float64Array) => s.indexOf(Math.max(...s))
const binOf = (f: number) => ((f - (cfg.centerFreq - cfg.span / 2)) / cfg.span) * (DISPLAY_BINS - 1)

describe('computeSweep', () => {
  it('shows a CW added at the centre frequency (default new signal) in the middle of the screen', () => {
    const s = computeSweep(cfg, [cw(cfg.centerFreq)])
    expect(s.length).toBe(DISPLAY_BINS)
    expect(Math.max(...s)).toBeGreaterThan(-30)
    expect(Math.abs(peakBin(s) - DISPLAY_BINS / 2)).toBeLessThan(4)
  })

  it('places tones below and above centre at their own frequencies', () => {
    for (const f of [2.412e9, 2.462e9, 2.400e9]) {
      expect(Math.abs(peakBin(computeSweep(cfg, [cw(f)])) - binOf(f))).toBeLessThan(4)
    }
  })

  it('reports roughly the configured power', () => {
    expect(Math.max(...computeSweep(cfg, [cw(2.45e9, -30)]))).toBeGreaterThan(-37)
    expect(Math.max(...computeSweep(cfg, [cw(2.45e9, -30)]))).toBeLessThan(-27)
  })

  it('ignores disabled signals and is flat with no signals', () => {
    const s = computeSweep(cfg, [{ ...cw(cfg.centerFreq), enabled: false }])
    expect(Math.max(...s)).toBeLessThan(-100)
  })

  it('shows a modulated signal at its carrier', () => {
    const am: SignalConfig = { id: 'am', enabled: true, type: 'am', params: { carrierFreq: 2.42e9, powerDbm: -20, bandwidth: 10e6, modulationIndex: 1 } }
    expect(Math.abs(peakBin(computeSweep(cfg, [am])) - binOf(2.42e9))).toBeLessThan(45)
  })
})
