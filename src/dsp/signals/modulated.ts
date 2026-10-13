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
      // Tone FM with index beta: phase = wc·n + beta·sin(wm·n). Message at
      // bandwidth/4 so Carson's rule 2(beta+1)fm equals the bandwidth at beta = 1.
      const wm = (2 * Math.PI * (bandwidth / 4)) / sampleRate
      for (let n = 0; n < numSamples; n++) samples[n] = amplitude * Math.cos(wc * n + modulationIndex * Math.sin(wm * n))
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
      // Scale the grid to unit average symbol energy so the signal has the set power
      const half = (sqrtOrder - 1) / 2
      const es = (2 * (order - 1)) / 3 / (half * half)
      const scale = 1 / Math.sqrt(es)
      for (let n = 0; n < numSamples; n++) {
        const symbol = pseudoRandomSymbol(Math.floor(n / samplesPerSymbol), order)
        const i = ((symbol % sqrtOrder) - (sqrtOrder - 1) / 2) / ((sqrtOrder - 1) / 2)
        const q = (Math.floor(symbol / sqrtOrder) - (sqrtOrder - 1) / 2) / ((sqrtOrder - 1) / 2)
        samples[n] = amplitude * scale * (i * Math.cos(wc * n) - q * Math.sin(wc * n))
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
