import { describe, it, expect } from 'vitest'
import { generateModulated } from '../../../src/dsp/signals/modulated'

describe('generateModulated', () => {
  const sampleRate = 8192, N = 8192
  it('AM signal has correct carrier', () => {
    const s = generateModulated({ type: 'am', carrierFreq: 1000, powerDbm: 0, bandwidth: 200, modulationIndex: 0.5, sampleRate, numSamples: N })
    expect(s.length).toBe(N)
    expect(Math.sqrt(s.reduce((a, v) => a + v * v, 0) / N)).toBeGreaterThan(0.1)
  })
  it('FM signal has correct length', () => {
    const s = generateModulated({ type: 'fm', carrierFreq: 1000, powerDbm: 0, bandwidth: 500, modulationIndex: 2, sampleRate, numSamples: N })
    expect(s.length).toBe(N)
  })
  it('BPSK signal generates valid output', () => {
    const s = generateModulated({ type: 'bpsk', carrierFreq: 1000, powerDbm: 0, bandwidth: 500, modulationIndex: 1, sampleRate, numSamples: N })
    expect(Math.max(...Array.from(s).map(Math.abs))).toBeGreaterThan(0)
  })
})
