export function fft(realIn: Float64Array, imagIn: Float64Array): { real: Float64Array; imag: Float64Array } {
  const N = realIn.length
  const real = new Float64Array(realIn)
  const imag = new Float64Array(imagIn)

  const bits = Math.log2(N)
  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, bits)
    if (j > i) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]]
    }
  }

  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2
    const angleStep = (-2 * Math.PI) / size
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j
        const twiddleR = Math.cos(angle)
        const twiddleI = Math.sin(angle)
        const evenIdx = i + j
        const oddIdx = i + j + halfSize
        const tR = twiddleR * real[oddIdx] - twiddleI * imag[oddIdx]
        const tI = twiddleR * imag[oddIdx] + twiddleI * real[oddIdx]
        real[oddIdx] = real[evenIdx] - tR
        imag[oddIdx] = imag[evenIdx] - tI
        real[evenIdx] = real[evenIdx] + tR
        imag[evenIdx] = imag[evenIdx] + tI
      }
    }
  }
  return { real, imag }
}

export function ifft(realIn: Float64Array, imagIn: Float64Array): { real: Float64Array; imag: Float64Array } {
  const N = realIn.length
  const conjImag = new Float64Array(N)
  for (let i = 0; i < N; i++) conjImag[i] = -imagIn[i]
  const result = fft(realIn, conjImag)
  for (let i = 0; i < N; i++) {
    result.real[i] /= N
    result.imag[i] = -result.imag[i] / N
  }
  return result
}

export function magnitudeSpectrum(real: Float64Array, imag: Float64Array, N: number): Float64Array {
  const numBins = N / 2 + 1
  const mag = new Float64Array(numBins)
  const norm = 1 / N
  for (let i = 0; i < numBins; i++) {
    const re = real[i] * norm
    const im = imag[i] * norm
    const powerLinear = re * re + im * im
    mag[i] = powerLinear > 0 ? 10 * Math.log10(powerLinear) : -150
  }
  return mag
}

function bitReverse(x: number, bits: number): number {
  let result = 0
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1)
    x >>= 1
  }
  return result
}
