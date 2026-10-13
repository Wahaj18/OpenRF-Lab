import { describe, it, expect } from 'vitest'
import { generateNoise } from '../../../src/dsp/signals/noise'

describe('generateNoise', () => {
  const N = 8192
  it('generates the correct number of samples', () => {
    expect(generateNoise({ type: 'awgn', powerDbm: -90, numSamples: N }).length).toBe(N)
  })
  it('AWGN has approximately zero mean', () => {
    const samples = generateNoise({ type: 'awgn', powerDbm: -60, numSamples: N })
    const mean = samples.reduce((sum, v) => sum + v, 0) / N
    expect(Math.abs(mean)).toBeLessThan(0.05)
  })
  it('higher power produces larger RMS', () => {
    const loud = generateNoise({ type: 'awgn', powerDbm: -60, numSamples: N })
    const quiet = generateNoise({ type: 'awgn', powerDbm: -90, numSamples: N })
    const rmsLoud = Math.sqrt(loud.reduce((sum, v) => sum + v * v, 0) / N)
    const rmsQuiet = Math.sqrt(quiet.reduce((sum, v) => sum + v * v, 0) / N)
    expect(rmsLoud).toBeGreaterThan(rmsQuiet * 5)
  })
})
