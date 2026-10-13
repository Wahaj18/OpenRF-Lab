import { describe, it, expect } from 'vitest'
import { generateFHSS, createFHSSState } from '../../../src/dsp/signals/hopper'

describe('generateFHSS', () => {
  const baseParams = { hopFrequencies: [1000, 1500, 2000, 2500], dwellTime: 0.01, powerDbm: 0, pattern: 'sequential' as const, sampleRate: 8192, numSamples: 8192 }

  it('generates signal with correct length', () => {
    const result = generateFHSS(baseParams)
    expect(result.samples.length).toBe(8192)
  })
  it('signal has non-zero energy', () => {
    const params = { ...baseParams, hopFrequencies: [500, 1000, 1500], dwellTime: 0.05 }
    const result = generateFHSS(params)
    expect(Math.sqrt(result.samples.reduce((a, v) => a + v * v, 0) / result.samples.length)).toBeGreaterThan(0.1)
  })
  it('returns state that can be passed to subsequent calls', () => {
    const result1 = generateFHSS(baseParams)
    expect(result1.state).toBeDefined()
    expect(result1.state.hopOrder).toEqual(baseParams.hopFrequencies)
    const result2 = generateFHSS(baseParams, result1.state)
    expect(result2.samples.length).toBe(8192)
  })
  it('createFHSSState initializes correctly', () => {
    const state = createFHSSState(baseParams)
    expect(state.hopIndex).toBe(0)
    expect(state.hopOrder).toEqual(baseParams.hopFrequencies)
  })
})
