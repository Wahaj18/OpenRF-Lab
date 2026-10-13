import type { DetectorType } from './types'

export function applyDetector(spectrum: Float64Array, displayBins: number, detector: DetectorType): Float64Array {
  const output = new Float64Array(displayBins)
  const inputLen = spectrum.length
  const binRatio = inputLen / displayBins

  for (let i = 0; i < displayBins; i++) {
    const start = Math.floor(i * binRatio)
    const end = Math.min(Math.floor((i + 1) * binRatio), inputLen)

    if (end - start === 0) {
      // Interpolate from neighboring source bins instead of fabricating -150 dB
      const exactPos = (i + 0.5) * binRatio
      const lo = Math.floor(exactPos)
      const hi = Math.min(lo + 1, inputLen - 1)
      const frac = exactPos - lo
      output[i] = spectrum[lo] * (1 - frac) + spectrum[hi] * frac
      continue
    }

    switch (detector) {
      case 'peak': output[i] = maxInRange(spectrum, start, end); break
      case 'neg-peak': output[i] = minInRange(spectrum, start, end); break
      case 'sample': output[i] = spectrum[start]; break
      case 'average': output[i] = avgInRangeLinear(spectrum, start, end); break
      case 'rms': output[i] = rmsInRange(spectrum, start, end); break
      case 'normal': output[i] = i % 2 === 0 ? maxInRange(spectrum, start, end) : spectrum[start]; break
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

/** Average dB values in linear power domain: dB → linear, average, → dB */
function avgInRangeLinear(arr: Float64Array, start: number, end: number): number {
  let sumLinear = 0
  for (let i = start; i < end; i++) sumLinear += Math.pow(10, arr[i] / 10)
  return 10 * Math.log10(sumLinear / (end - start))
}

function rmsInRange(arr: Float64Array, start: number, end: number): number {
  let sumPower = 0
  for (let i = start; i < end; i++) sumPower += Math.pow(10, arr[i] / 10)
  return 10 * Math.log10(sumPower / (end - start))
}
