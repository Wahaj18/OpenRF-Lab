import { describe, it, expect } from 'vitest'
import { createWindow, type WindowType } from '../../src/dsp/windowing'

describe('createWindow', () => {
  const N = 64
  it('rectangular window is all ones', () => {
    const w = createWindow('rectangular', N)
    expect(w.length).toBe(N)
    for (let i = 0; i < N; i++) expect(w[i]).toBeCloseTo(1, 10)
  })
  it('hann window is zero at endpoints', () => {
    const w = createWindow('hann', N)
    expect(w[0]).toBeCloseTo(0, 8)
    expect(w[N - 1]).toBeCloseTo(0, 8)
  })
  it('hann window peaks at center', () => {
    const w = createWindow('hann', N)
    expect(w[Math.floor(N / 2)]).toBeCloseTo(1, 2)
  })
  it('hamming window has non-zero endpoints', () => {
    const w = createWindow('hamming', N)
    expect(w[0]).toBeGreaterThan(0.05)
    expect(w[0]).toBeLessThan(0.1)
  })
  it('blackman window has lower sidelobes than hann', () => {
    const wB = createWindow('blackman', N)
    const wH = createWindow('hann', N)
    expect(Math.abs(wB[1])).toBeLessThan(Math.abs(wH[1]))
  })
  it('all windows have correct length', () => {
    const types: WindowType[] = ['rectangular', 'hann', 'hamming', 'blackman', 'kaiser', 'flat-top']
    for (const type of types) expect(createWindow(type, N).length).toBe(N)
  })
  it('all window values are in [0, 1] range (except flat-top)', () => {
    const types: WindowType[] = ['rectangular', 'hann', 'hamming', 'blackman', 'kaiser']
    for (const type of types) {
      const w = createWindow(type, N)
      for (let i = 0; i < N; i++) {
        expect(w[i]).toBeGreaterThanOrEqual(-1e-15)
        expect(w[i]).toBeLessThanOrEqual(1.001)
      }
    }
  })
})
