export interface NoiseParams {
  type: 'awgn' | 'pink' | 'brown'
  powerDbm: number
  numSamples: number
}

export function generateNoise(params: NoiseParams): Float64Array {
  const { type, powerDbm, numSamples } = params
  const rms = Math.pow(10, powerDbm / 20)
  const samples = new Float64Array(numSamples)
  switch (type) {
    case 'awgn':
      for (let i = 0; i < numSamples; i++) samples[i] = rms * gaussianRandom()
      break
    case 'pink': generatePinkNoise(samples, rms); break
    case 'brown': generateBrownNoise(samples, rms); break
  }
  return samples
}

function gaussianRandom(): number {
  let u1 = 0, u2 = 0
  while (u1 === 0) u1 = Math.random()
  while (u2 === 0) u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function generatePinkNoise(samples: Float64Array, rms: number): void {
  const numRows = 16
  const rows = new Float64Array(numRows)
  let runningSum = 0
  for (let i = 0; i < numRows; i++) { rows[i] = gaussianRandom(); runningSum += rows[i] }
  for (let i = 0; i < samples.length; i++) {
    const rowToChange = ctz(i) % numRows
    runningSum -= rows[rowToChange]
    rows[rowToChange] = gaussianRandom()
    runningSum += rows[rowToChange]
    samples[i] = rms * (runningSum / numRows + gaussianRandom()) * 0.5
  }
}

function generateBrownNoise(samples: Float64Array, rms: number): void {
  let value = 0
  for (let i = 0; i < samples.length; i++) {
    value += gaussianRandom() * 0.02
    value = Math.max(-1, Math.min(1, value))
    samples[i] = rms * value
  }
  const actualRms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length)
  if (actualRms > 0) {
    const scale = rms / actualRms
    for (let i = 0; i < samples.length; i++) samples[i] *= scale
  }
}

function ctz(n: number): number {
  if (n === 0) return 32
  let count = 0
  while ((n & 1) === 0) { n >>= 1; count++ }
  return count
}
