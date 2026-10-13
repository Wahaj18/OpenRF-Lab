import { describe, it, expect } from 'vitest'
import { traceLevelAt, withLiveLevels, type Marker } from '../../src/hooks/useMarkers'

const spectrum = new Float32Array([-100, -90, -20, -90, -100])
const m = (frequency: number, type: Marker['type'] = 'normal'): Marker =>
  ({ id: 'M1', type, frequency, amplitude: -30, traceIndex: 0, locked: false })

describe('marker levels', () => {
  it('reads the trace at the marker frequency', () => {
    expect(traceLevelAt(spectrum, 0, 4, 2)).toBe(-20)
    expect(traceLevelAt(spectrum, 0, 4, 0.9)).toBe(-90)
  })
  it('returns null off-screen or without a trace', () => {
    expect(traceLevelAt(spectrum, 0, 4, 9)).toBeNull()
    expect(traceLevelAt(undefined, 0, 4, 2)).toBeNull()
  })
  it('replaces the drop-point level with the live trace level', () => {
    const live = withLiveLevels([m(2), m(2, 'band-power'), m(99)], new Map([[0, spectrum]]), 0, 4)
    expect(live.map(x => x.amplitude)).toEqual([-20, -30, -30])
  })
})
