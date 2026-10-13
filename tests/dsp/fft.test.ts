import { describe, it, expect } from 'vitest'
import { fft, ifft, magnitudeSpectrum } from '../../src/dsp/fft'

describe('fft', () => {
  it('transforms a DC signal to a single bin', () => {
    const real = new Float64Array([1, 1, 1, 1])
    const imag = new Float64Array([0, 0, 0, 0])
    const { real: outR, imag: outI } = fft(real, imag)
    expect(outR[0]).toBeCloseTo(4, 10)
    expect(outI[0]).toBeCloseTo(0, 10)
    for (let i = 1; i < 4; i++) {
      expect(outR[i]).toBeCloseTo(0, 10)
      expect(outI[i]).toBeCloseTo(0, 10)
    }
  })

  it('transforms a pure cosine to two symmetric bins', () => {
    const N = 8
    const real = new Float64Array(N)
    const imag = new Float64Array(N)
    for (let n = 0; n < N; n++) real[n] = Math.cos((2 * Math.PI * n) / N)
    const { real: outR } = fft(real, imag)
    expect(outR[1]).toBeCloseTo(N / 2, 8)
    expect(outR[N - 1]).toBeCloseTo(N / 2, 8)
  })

  it('round-trips through fft then ifft', () => {
    const N = 16
    const real = new Float64Array(N)
    const imag = new Float64Array(N)
    for (let i = 0; i < N; i++) real[i] = Math.sin((2 * Math.PI * 3 * i) / N)
    const freq = fft(real, imag)
    const time = ifft(freq.real, freq.imag)
    for (let i = 0; i < N; i++) expect(time.real[i]).toBeCloseTo(real[i], 8)
  })

  it('computes magnitude spectrum in dB', () => {
    const N = 8
    const real = new Float64Array(N)
    const imag = new Float64Array(N)
    real[0] = 1
    const { real: outR, imag: outI } = fft(real, imag)
    const mag = magnitudeSpectrum(outR, outI, N)
    expect(mag.length).toBe(N / 2 + 1)
    expect(mag[0]).toBeGreaterThan(-100)
  })
})
