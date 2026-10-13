import { describe, it, expect } from 'vitest'
import { applyDetector } from '../../src/dsp/detection'

describe('applyDetector', () => {
  // 9 bins → 3 points: point i is centred on bin 4i, bucket = 3 bins around it (clipped at the edges)
  const input = new Float64Array([-10, -20, -30, -15, -50, -40, -25, -35, -45])

  it('peak / neg-peak / sample use the bucket centred on each point', () => {
    expect(Array.from(applyDetector(input, 3, 'peak'))).toEqual([-10, -15, -35])
    expect(Array.from(applyDetector(input, 3, 'neg-peak'))).toEqual([-20, -50, -45])
    expect(Array.from(applyDetector(input, 3, 'sample'))).toEqual([-10, -50, -45])
  })

  it('average detector is the log (dB) average; rms is the power average', () => {
    expect(applyDetector(input, 3, 'average')[1]).toBeCloseTo(-35, 9)
    expect(applyDetector(input, 3, 'rms')[0]).toBeCloseTo(-12.596, 2)
  })

  it('returns the input unchanged when sizes match', () => {
    expect(Array.from(applyDetector(input, 9, 'peak'))).toEqual(Array.from(input))
  })
})
