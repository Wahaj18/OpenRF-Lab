import { describe, it, expect } from 'vitest'
import { amplitudeToColor } from '../../src/utils/color-maps'

describe('amplitudeToColor', () => {
  it('returns dark blue for very low amplitude', () => {
    const [r, g, b] = amplitudeToColor(-120, -100, 0)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })
  it('returns bright color for high amplitude', () => {
    const [r, g, b] = amplitudeToColor(-10, -100, 0)
    expect(r + g + b).toBeGreaterThan(300)
  })
  it('returns RGB values in 0-255 range', () => {
    for (const val of [-120, -80, -40, -10, 0]) {
      const [r, g, b] = amplitudeToColor(val, -100, 0)
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(255)
    }
  })
})
