import { describe, it, expect } from 'vitest'
import { applyDetector } from '../../src/dsp/detection'

describe('applyDetector', () => {
  const input = new Float64Array([-10, -20, -30, -15, -50, -40, -25, -35])

  it('peak detector picks the maximum in each bin group', () => {
    const result = applyDetector(input, 4, 'peak')
    expect(result.length).toBe(4)
    expect(result[0]).toBe(-10)
    expect(result[1]).toBe(-15)
    expect(result[2]).toBe(-40)
    expect(result[3]).toBe(-25)
  })

  it('neg-peak detector picks the minimum', () => {
    const result = applyDetector(input, 4, 'neg-peak')
    expect(result[0]).toBe(-20)
    expect(result[1]).toBe(-30)
    expect(result[2]).toBe(-50)
    expect(result[3]).toBe(-35)
  })

  it('sample detector picks the first sample', () => {
    const result = applyDetector(input, 4, 'sample')
    expect(result[0]).toBe(-10)
    expect(result[1]).toBe(-30)
    expect(result[2]).toBe(-50)
    expect(result[3]).toBe(-25)
  })

  it('average detector averages each bin group in linear power', () => {
    const result = applyDetector(input, 4, 'average')
    // Linear power average of -10 dB and -20 dB: 10^(-10/10)=0.1, 10^(-20/10)=0.01 → avg=0.055 → 10*log10(0.055)≈-12.60
    expect(result[0]).toBeCloseTo(-12.596, 1)
    // Linear power average of -30 dB and -15 dB
    const expected1 = 10 * Math.log10((Math.pow(10, -30 / 10) + Math.pow(10, -15 / 10)) / 2)
    expect(result[1]).toBeCloseTo(expected1, 1)
  })

  it('returns same length as displayBins when input same size', () => {
    const result = applyDetector(input, 8, 'peak')
    expect(result.length).toBe(8)
    expect(result[0]).toBe(-10)
  })
})
