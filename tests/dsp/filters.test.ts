import { describe, it, expect } from 'vitest'
import { designFIRFilter, computeFrequencyResponse } from '../../src/dsp/filters'

describe('designFIRFilter', () => {
  it('lowpass filter has correct number of taps', () => {
    const h = designFIRFilter('lowpass', 1000, 0, 51, 'hamming', 8192)
    expect(h.length).toBe(51)
  })

  it('lowpass filter passes DC', () => {
    const h = designFIRFilter('lowpass', 1000, 0, 51, 'hamming', 8192)
    const { magnitude } = computeFrequencyResponse(h, 256, 8192)
    expect(magnitude[0]).toBeGreaterThan(-1) // DC should be near 0 dB
  })

  it('lowpass filter attenuates high frequencies', () => {
    const h = designFIRFilter('lowpass', 500, 0, 101, 'hamming', 8192)
    const { magnitude } = computeFrequencyResponse(h, 256, 8192)
    // Check attenuation at Nyquist
    expect(magnitude[255]).toBeLessThan(-20)
  })

  it('highpass filter attenuates DC', () => {
    const h = designFIRFilter('highpass', 2000, 0, 51, 'hamming', 8192)
    const { magnitude } = computeFrequencyResponse(h, 256, 8192)
    expect(magnitude[0]).toBeLessThan(-20)
  })

  it('bandpass filter passes center frequency', () => {
    const h = designFIRFilter('bandpass', 1000, 2000, 101, 'hamming', 8192)
    const { magnitude, frequencies } = computeFrequencyResponse(h, 256, 8192)
    const centerBin = frequencies.findIndex(f => f >= 1500)
    expect(magnitude[centerBin]).toBeGreaterThan(-6)
  })
})
