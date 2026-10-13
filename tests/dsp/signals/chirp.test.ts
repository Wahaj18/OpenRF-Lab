import { describe, it, expect } from 'vitest'
import { generateChirp } from '../../../src/dsp/signals/chirp'

describe('generateChirp', () => {
  it('generates pulsed chirp with correct length', () => {
    const s = generateChirp({ startFreq: 500, stopFreq: 1500, powerDbm: 0, pulseWidth: 0.01, pri: 0.05, sampleRate: 8192, numSamples: 8192 })
    expect(s.length).toBe(8192)
  })
  it('chirp is zero during off period', () => {
    const s = generateChirp({ startFreq: 500, stopFreq: 1500, powerDbm: 0, pulseWidth: 0.001, pri: 0.5, sampleRate: 8192, numSamples: 8192 })
    const zeroCount = Array.from(s).filter(v => v === 0).length
    expect(zeroCount).toBeGreaterThan(s.length * 0.9)
  })
})
