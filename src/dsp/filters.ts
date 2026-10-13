import { createWindow, type WindowType } from './windowing'

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'bandstop'

/**
 * Design an FIR filter using the windowed sinc method.
 *
 * @param type - Filter type
 * @param cutoffLow - Lower cutoff frequency in Hz (used by all types)
 * @param cutoffHigh - Upper cutoff frequency in Hz (used by bandpass/bandstop)
 * @param order - Filter order (number of taps)
 * @param windowType - Window function to apply
 * @param sampleRate - Sample rate in Hz
 * @returns Float64Array of filter coefficients
 */
export function designFIRFilter(
  type: FilterType,
  cutoffLow: number,
  cutoffHigh: number,
  order: number,
  windowType: WindowType,
  sampleRate: number,
): Float64Array {
  // Highpass and bandstop need gain at Nyquist, which an even tap count cannot give.
  const taps = (type === 'highpass' || type === 'bandstop') && order % 2 === 0 ? order + 1 : order
  const nyq = sampleRate / 2
  const lo = cutoffLow / nyq, hi = cutoffHigh / nyq
  // Passbands as fractions of Nyquist, and where each design is scaled to unity gain
  const bands: [number, number][] =
    type === 'lowpass' ? [[0, lo]] :
    type === 'highpass' ? [[lo, 1]] :
    type === 'bandpass' ? [[lo, hi]] : [[0, lo], [hi, 1]]
  const scaleAt = type === 'lowpass' || type === 'bandstop' ? 0 : type === 'highpass' ? 1 : (lo + hi) / 2
  const window = createWindow(windowType, taps)
  const M = (taps - 1) / 2
  const h = new Float64Array(taps)
  for (let n = 0; n < taps; n++) {
    const m = n - M
    let v = 0
    for (const [l, r] of bands) v += r * sinc(r * m) - l * sinc(l * m)
    h[n] = v * window[n]
  }
  let s = 0
  for (let n = 0; n < taps; n++) s += h[n] * Math.cos(Math.PI * (n - M) * scaleAt)
  if (Math.abs(s) > 1e-12) for (let n = 0; n < taps; n++) h[n] /= s
  return h
}

function sinc(x: number): number {
  if (Math.abs(x) < 1e-12) return 1
  const px = Math.PI * x
  return Math.sin(px) / px
}

export interface FrequencyResponse {
  magnitude: Float64Array
  phase: Float64Array
  frequencies: Float64Array
}

/**
 * Compute the frequency response H(e^jw) of an FIR filter.
 *
 * @param coefficients - FIR filter coefficients
 * @param numPoints - Number of frequency points to evaluate
 * @param sampleRate - Sample rate in Hz
 * @returns magnitude (dB), phase (radians), and frequencies (Hz)
 */
export function computeFrequencyResponse(
  coefficients: Float64Array,
  numPoints: number,
  sampleRate: number,
): FrequencyResponse {
  const magnitude = new Float64Array(numPoints)
  const phase = new Float64Array(numPoints)
  const frequencies = new Float64Array(numPoints)
  const N = coefficients.length

  for (let k = 0; k < numPoints; k++) {
    const freq = (k / numPoints) * (sampleRate / 2)
    frequencies[k] = freq
    const omega = (2 * Math.PI * freq) / sampleRate

    let realPart = 0
    let imagPart = 0
    for (let n = 0; n < N; n++) {
      realPart += coefficients[n] * Math.cos(omega * n)
      imagPart -= coefficients[n] * Math.sin(omega * n)
    }

    const mag = Math.sqrt(realPart * realPart + imagPart * imagPart)
    magnitude[k] = mag > 0 ? 20 * Math.log10(mag) : -150
    phase[k] = Math.atan2(imagPart, realPart)
  }

  return { magnitude, phase, frequencies }
}

/**
 * Group delay in samples: Re{ sum(n·h[n]·e^-jwn) / sum(h[n]·e^-jwn) }.
 * At exact response zeros it is undefined; there the linear-phase value (N-1)/2 is used.
 */
export function computeGroupDelay(
  coefficients: Float64Array,
  numPoints: number,
  sampleRate: number,
): Float64Array {
  const groupDelay = new Float64Array(numPoints)
  const N = coefficients.length
  for (let k = 0; k < numPoints; k++) {
    const omega = (2 * Math.PI * ((k / numPoints) * (sampleRate / 2))) / sampleRate
    let hr = 0, hi = 0, nr = 0, ni = 0
    for (let n = 0; n < N; n++) {
      const c = Math.cos(omega * n), s = Math.sin(omega * n)
      hr += coefficients[n] * c; hi -= coefficients[n] * s
      nr += n * coefficients[n] * c; ni -= n * coefficients[n] * s
    }
    const den = hr * hr + hi * hi
    groupDelay[k] = den > 1e-20 ? (nr * hr + ni * hi) / den : (N - 1) / 2
  }
  return groupDelay
}
