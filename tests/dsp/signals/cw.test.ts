import { describe, it, expect } from 'vitest'
import { generateCW } from '../../../src/dsp/signals/cw'

describe('generateCW', () => {
  const sampleRate = 1024, N = 1024
  it('generates a sine wave at the correct frequency', () => {
    const samples = generateCW({ frequency: 100, powerDbm: 0, phase: 0, sampleRate, numSamples: N })
    expect(samples.length).toBe(N)
    expect(samples[0]).toBeCloseTo(0, 4)
  })
  it('generates correct amplitude for given power', () => {
    const samples = generateCW({ frequency: 100, powerDbm: 0, phase: 0, sampleRate, numSamples: N })
    const peak = Math.max(...Array.from(samples).map(Math.abs))
    // 0 dBm RMS → peak = √2
    expect(peak).toBeCloseTo(Math.SQRT2, 1)
  })
  it('respects phase offset', () => {
    const samples = generateCW({ frequency: 100, powerDbm: 0, phase: Math.PI / 2, sampleRate, numSamples: N })
    expect(samples[0]).toBeCloseTo(Math.SQRT2, 2)
  })
})
