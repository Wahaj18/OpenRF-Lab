export interface ChirpParams {
  startFreq: number
  stopFreq: number
  powerDbm: number
  pulseWidth: number
  pri: number
  sampleRate: number
  numSamples: number
}

export function generateChirp(params: ChirpParams): Float64Array {
  const { startFreq, stopFreq, powerDbm, pulseWidth, pri, sampleRate, numSamples } = params
  const amplitude = Math.pow(10, powerDbm / 20) * Math.SQRT2
  const samples = new Float64Array(numSamples)
  const pulseSamples = Math.floor(pulseWidth * sampleRate)
  const priSamples = Math.floor(pri * sampleRate)
  const chirpRate = (stopFreq - startFreq) / pulseWidth

  for (let n = 0; n < numSamples; n++) {
    const posInPri = n % priSamples
    if (posInPri < pulseSamples) {
      const t = posInPri / sampleRate
      const phase = 2 * Math.PI * (startFreq * t + 0.5 * chirpRate * t * t)
      samples[n] = amplitude * Math.cos(phase)
    }
  }
  return samples
}
