export interface CWParams {
  frequency: number
  powerDbm: number
  phase: number
  sampleRate: number
  numSamples: number
}

export function generateCW(params: CWParams): Float64Array {
  const { frequency, powerDbm, phase, sampleRate, numSamples } = params
  // dBm is an RMS power quantity; peak amplitude of a sinusoid = RMS × √2
  const amplitude = Math.pow(10, powerDbm / 20) * Math.SQRT2
  const samples = new Float64Array(numSamples)
  const angularFreq = (2 * Math.PI * frequency) / sampleRate
  for (let n = 0; n < numSamples; n++) {
    samples[n] = amplitude * Math.sin(angularFreq * n + phase)
  }
  return samples
}
