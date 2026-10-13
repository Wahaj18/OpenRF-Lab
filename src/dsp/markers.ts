import { RBW_ENBW_FACTOR } from './sweep'

const pointHz = (spectrum: ArrayLike<number>, span: number) => span / (spectrum.length - 1)

/** Walk uphill from the bin nearest freq to the local peak. */
export function climbToPeak(spectrum: ArrayLike<number>, startBin: number): number {
  let i = Math.max(0, Math.min(spectrum.length - 1, startBin))
  for (;;) {
    const l = i > 0 ? spectrum[i - 1] : -Infinity
    const r = i < spectrum.length - 1 ? spectrum[i + 1] : -Infinity
    if (r > spectrum[i] && r >= l) i++
    else if (l > spectrum[i]) i--
    else return i
  }
}

/**
 * N dB bandwidth of the signal under the marker: climbs to the local peak and
 * returns the distance between the interpolated points N dB below it.
 */
export function computeNdbBandwidth(
  spectrum: ArrayLike<number>, startFreq: number, span: number, markerFreq: number, nDb: number,
): number | null {
  if (spectrum.length < 2) return null
  const df = pointHz(spectrum, span)
  const start = Math.round((markerFreq - startFreq) / df)
  if (start < 0 || start >= spectrum.length) return null
  const peak = climbToPeak(spectrum, start)
  const threshold = spectrum[peak] - nDb
  let left: number | null = null
  for (let i = peak; i > 0; i--) {
    if (spectrum[i - 1] < threshold) { left = i - (spectrum[i] - threshold) / (spectrum[i] - spectrum[i - 1]); break }
  }
  let right: number | null = null
  for (let i = peak; i < spectrum.length - 1; i++) {
    if (spectrum[i + 1] < threshold) { right = i + (spectrum[i] - threshold) / (spectrum[i] - spectrum[i + 1]); break }
  }
  if (left === null || right === null) return null
  return (right - left) * df
}

/**
 * Channel (band) power from a trace: sums the power density at each display
 * point (level ÷ the RBW filter's noise bandwidth) times the point spacing.
 * Accurate with the RMS detector; peak detection over-reads noise.
 */
export function computeBandPower(
  spectrum: ArrayLike<number>, startFreq: number, span: number, centerFreq: number, bandwidthHz: number, rbw: number,
): number | null {
  if (spectrum.length < 2 || bandwidthHz <= 0) return null
  const df = pointHz(spectrum, span)
  const lo = (centerFreq - bandwidthHz / 2 - startFreq) / df
  const hi = (centerFreq + bandwidthHz / 2 - startFreq) / df
  const lowBin = Math.max(0, Math.ceil(lo)), highBin = Math.min(spectrum.length - 1, Math.floor(hi))
  if (lowBin > highBin) return null
  let total = 0
  for (let i = lowBin; i <= highBin; i++) total += Math.pow(10, spectrum[i] / 10)
  return 10 * Math.log10(Math.max((total * df) / (RBW_ENBW_FACTOR * rbw), 1e-15))
}
