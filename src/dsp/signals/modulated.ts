export interface ModulatedParams {
  type: 'am' | 'fm' | 'bpsk' | 'qpsk' | 'qam16' | 'qam64'
  carrierFreq: number
  powerDbm: number
  bandwidth: number
  modulationIndex: number
  sampleRate: number
  numSamples: number
}

export function generateModulated(params: ModulatedParams): Float64Array {
  const { type, carrierFreq, powerDbm, bandwidth, modulationIndex, sampleRate, numSamples } = params
  const amplitude = Math.pow(10, powerDbm / 20) * Math.SQRT2
  const samples = new Float64Array(numSamples)
  const wc = (2 * Math.PI * carrierFreq) / sampleRate

  switch (type) {
    case 'am': {
      const wm = (2 * Math.PI * (bandwidth / 2)) / sampleRate
      for (let n = 0; n < numSamples; n++) samples[n] = amplitude * (1 + modulationIndex * Math.sin(wm * n)) * Math.cos(wc * n)
      break
    }
    case 'fm': {
      const wm = (2 * Math.PI * (bandwidth / 4)) / sampleRate
      let phase = 0
      for (let n = 0; n < numSamples; n++) { phase += wc + modulationIndex * Math.sin(wm * n); samples[n] = amplitude * Math.cos(phase) }
      break
    }
    case 'bpsk': {
      const samplesPerSymbol = Math.max(1, Math.floor(sampleRate / bandwidth))
      for (let n = 0; n < numSamples; n++) {
        const bit = pseudoRandomBit(Math.floor(n / samplesPerSymbol))
        samples[n] = amplitude * Math.cos(wc * n + (bit ? 0 : Math.PI))
      }
      break
    }
    case 'qpsk': {
      const samplesPerSymbol = Math.max(1, Math.floor(sampleRate / (bandwidth / 2)))
      const phases = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
      for (let n = 0; n < numSamples; n++) {
        const symbol = pseudoRandomSymbol(Math.floor(n / samplesPerSymbol), 4)
        samples[n] = amplitude * Math.cos(wc * n + phases[symbol])
      }
      break
    }
    case 'qam16': case 'qam64': {
      const order = type === 'qam16' ? 16 : 64
      const sqrtOrder = Math.sqrt(order)
      const samplesPerSymbol = Math.max(1, Math.floor(sampleRate / (bandwidth / Math.log2(order))))
      for (let n = 0; n < numSamples; n++) {
        const symbol = pseudoRandomSymbol(Math.floor(n / samplesPerSymbol), order)
        const i = ((symbol % sqrtOrder) - (sqrtOrder - 1) / 2) / ((sqrtOrder - 1) / 2)
        const q = (Math.floor(symbol / sqrtOrder) - (sqrtOrder - 1) / 2) / ((sqrtOrder - 1) / 2)
        samples[n] = amplitude * (i * Math.cos(wc * n) - q * Math.sin(wc * n))
      }
      break
    }
  }
  return samples
}

function pseudoRandomBit(index: number): number {
  let x = index + 1; x ^= x << 13; x ^= x >> 17; x ^= x << 5; return x & 1
}
function pseudoRandomSymbol(index: number, order: number): number {
  let x = index + 1; x ^= x << 13; x ^= x >> 17; x ^= x << 5; return ((x >>> 0) % order)
}
