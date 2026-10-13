import type { DetectorType } from './types'

/**
 * Reduce `spectrum` (bins evenly covering the span, first bin at the start
 * frequency, last at the stop frequency) to displayBins points. Point i sits at
 * frequency start + i/(displayBins-1)·span, the same mapping the markers use, so
 * its bucket is centred there. With fewer bins than points every detector
 * linearly interpolates between the two neighbouring bins.
 */
export function applyDetector(spectrum: Float64Array, displayBins: number, detector: DetectorType): Float64Array {
  const output = new Float64Array(displayBins)
  const inputLen = spectrum.length
  const binRatio = inputLen / displayBins
  const step = displayBins > 1 ? (inputLen - 1) / (displayBins - 1) : 0

  for (let i = 0; i < displayBins; i++) {
    const centre = i * step
    if (binRatio <= 1) {
      const lo = Math.min(Math.floor(centre), inputLen - 1)
      const hi = Math.min(lo + 1, inputLen - 1)
      const frac = centre - lo
      output[i] = spectrum[lo] * (1 - frac) + spectrum[hi] * frac
      continue
    }
    const start = Math.max(0, Math.round(centre - binRatio / 2))
    const end = Math.max(start + 1, Math.min(inputLen, Math.round(centre + binRatio / 2)))

    switch (detector) {
      case 'peak': output[i] = maxInRange(spectrum, start, end); break
      case 'neg-peak': output[i] = minInRange(spectrum, start, end); break
      case 'sample': output[i] = spectrum[Math.min(inputLen - 1, Math.round(centre))]; break
      case 'average': output[i] = logAverage(spectrum, start, end); break
      case 'rms': output[i] = rmsInRange(spectrum, start, end); break
      case 'normal': output[i] = rosenfell(spectrum, start, end, i); break
    }
  }
  return output
}

function maxInRange(arr: Float64Array, start: number, end: number): number {
  let max = arr[start]
  for (let i = start + 1; i < end; i++) if (arr[i] > max) max = arr[i]
  return max
}

function minInRange(arr: Float64Array, start: number, end: number): number {
  let min = arr[start]
  for (let i = start + 1; i < end; i++) if (arr[i] < min) min = arr[i]
  return min
}

/** Average detector (log/video average): mean of the dB values. Reads noise about 2.5 dB below RMS. */
function logAverage(arr: Float64Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += arr[i]
  return sum / (end - start)
}

/** RMS (power average) detector: dB → linear power, mean, → dB. */
function rmsInRange(arr: Float64Array, start: number, end: number): number {
  let sumPower = 0
  for (let i = start; i < end; i++) sumPower += Math.pow(10, arr[i] / 10)
  return 10 * Math.log10(sumPower / (end - start))
}

/**
 * Normal (Rosenfell) detector: a bucket that contains a peak (rises then
 * falls) shows the peak; otherwise even buckets show max and odd show min.
 */
function rosenfell(arr: Float64Array, start: number, end: number, bucket: number): number {
  const max = maxInRange(arr, start, end)
  const prev = start > 0 ? arr[start - 1] : arr[start]
  const next = end < arr.length ? arr[end] : arr[end - 1]
  if (max > prev && max > next) return max
  return bucket % 2 === 0 ? max : minInRange(arr, start, end)
}
