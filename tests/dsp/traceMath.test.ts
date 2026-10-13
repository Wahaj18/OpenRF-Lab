import { describe, it, expect } from 'vitest'
import { traceMath } from '../../src/dsp/traceModes'

describe('traceMath', () => {
  const a = new Float64Array([-20, -30, -50, 0])
  const b = new Float64Array([-35, -30, -40, -10])
  it('A − B is the dB difference (power ratio)', () => {
    expect(Array.from(traceMath(a, b, 'subtract'))).toEqual([15, 0, -10, 10])
  })
  it('A + B sums linear power', () => {
    const r = traceMath(a, b, 'add')
    expect(r[1]).toBeCloseTo(-30 + 10 * Math.log10(2), 9) // equal powers: +3.01 dB
    expect(r[0]).toBeCloseTo(10 * Math.log10(1e-2 + 10 ** -3.5), 9)
    expect(r[3]).toBeCloseTo(10 * Math.log10(1.1), 9)
  })
  it('uses the shorter length', () => {
    expect(traceMath(a, new Float64Array(2), 'subtract').length).toBe(2)
  })
})
