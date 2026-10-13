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
  const M = (order - 1) / 2
  const window = createWindow(windowType, order)

  switch (type) {
    case 'lowpass':
      return sincLowpass(cutoffLow, order, M, window, sampleRate)
    case 'highpass':
      return spectralInvert(sincLowpass(cutoffLow, order, M, window, sampleRate))
    case 'bandpass': {
      const lp1 = sincLowpass(cutoffHigh, order, M, window, sampleRate)
      const lp2 = sincLowpass(cutoffLow, order, M, window, sampleRate)
      const bp = new Float64Array(order)
      for (let n = 0; n < order; n++) bp[n] = lp1[n] - lp2[n]
      return bp
    }
    case 'bandstop': {
      const lp = sincLowpass(cutoffLow, order, M, window, sampleRate)
      const hp = spectralInvert(sincLowpass(cutoffHigh, order, M, window, sampleRate))
      const bs = new Float64Array(order)
      for (let n = 0; n < order; n++) bs[n] = lp[n] + hp[n]
      return bs
    }
  }
}

/** Windowed sinc lowpass filter */
function sincLowpass(
  cutoff: number,
  order: number,
  M: number,
  window: Float64Array,
  sampleRate: number,
): Float64Array {
  const fc = cutoff / sampleRate // normalized cutoff
  const h = new Float64Array(order)

  for (let n = 0; n < order; n++) {
    const nm = n - M
    if (Math.abs(nm) < 1e-12) {
      h[n] = 2 * fc
    } else {
      h[n] = Math.sin(2 * Math.PI * fc * nm) / (Math.PI * nm)
    }
    h[n] *= window[n]
  }

  // Normalize for unity gain at DC
  let sum = 0
  for (let n = 0; n < order; n++) sum += h[n]
  if (Math.abs(sum) > 1e-12) {
    for (let n = 0; n < order; n++) h[n] /= sum
  }

  return h
}

/** Spectral inversion: converts lowpass to highpass */
function spectralInvert(h: Float64Array): Float64Array {
  const out = new Float64Array(h.length)
  const M = (h.length - 1) / 2
  for (let n = 0; n < h.length; n++) {
    out[n] = -h[n]
  }
  out[Math.round(M)] += 1
  return out
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
 * Compute the group delay of an FIR filter.
 * Group delay = -d(phase)/d(omega), approximated via finite difference.
 *
 * @param coefficients - FIR filter coefficients
 * @param numPoints - Number of frequency points
 * @param sampleRate - Sample rate in Hz
 * @returns Float64Array of group delay in samples
 */
export function computeGroupDelay(
  coefficients: Float64Array,
  numPoints: number,
  sampleRate: number,
): Float64Array {
  const groupDelay = new Float64Array(numPoints)
  const N = coefficients.length
  const deltaOmega = Math.PI / (numPoints * 10)

  for (let k = 0; k < numPoints; k++) {
    const freq = (k / numPoints) * (sampleRate / 2)
    const omega = (2 * Math.PI * freq) / sampleRate

    // Phase at omega and omega + delta
    const phase1 = evalPhase(coefficients, N, omega)
    const phase2 = evalPhase(coefficients, N, omega + deltaOmega)

    // Unwrapped phase difference
    let dPhase = phase2 - phase1
    while (dPhase > Math.PI) dPhase -= 2 * Math.PI
    while (dPhase < -Math.PI) dPhase += 2 * Math.PI

    groupDelay[k] = -dPhase / deltaOmega
  }

  return groupDelay
}

function evalPhase(coefficients: Float64Array, N: number, omega: number): number {
  let realPart = 0
  let imagPart = 0
  for (let n = 0; n < N; n++) {
    realPart += coefficients[n] * Math.cos(omega * n)
    imagPart -= coefficients[n] * Math.sin(omega * n)
  }
  return Math.atan2(imagPart, realPart)
}
