/**
 * Polyphase channelizer implementation.
 *
 * Splits a wideband signal into M narrowband channels using
 * polyphase decomposition + M-point FFT, which is significantly
 * more efficient than M separate filter-decimate chains.
 */

import { fft } from './fft'
import { createWindow } from './windowing'

export interface ChannelizerConfig {
  numChannels: number     // M channels (power of 2, default 8)
  prototypeOrder: number  // prototype filter length (default 64)
  sampleRate: number
}

export interface ChannelizerResult {
  channelOutputs: Float64Array[]  // M arrays of channel magnitudes (dB)
  prototypeResponse: Float64Array // prototype filter frequency response
  channelFrequencies: number[]    // center frequency of each channel
  complexityPolyphase: number     // FLOPS for polyphase
  complexityBruteForce: number    // FLOPS for brute-force
}

/**
 * Design a lowpass prototype filter using windowed-sinc method.
 * Cutoff is normalized to sampleRate / (2 * M).
 */
function designPrototypeFilter(order: number, numChannels: number): Float64Array {
  const h = new Float64Array(order)
  const fc = 1 / (2 * numChannels) // normalized cutoff (relative to Fs)
  const mid = (order - 1) / 2
  const window = createWindow('hamming', order)

  for (let i = 0; i < order; i++) {
    const n = i - mid
    if (Math.abs(n) < 1e-12) {
      h[i] = 2 * fc
    } else {
      h[i] = Math.sin(2 * Math.PI * fc * n) / (Math.PI * n)
    }
    h[i] *= window[i]
  }

  return h
}

/**
 * Compute the frequency response of a filter (magnitude in dB).
 */
function filterFrequencyResponse(h: Float64Array, nfft: number): Float64Array {
  const real = new Float64Array(nfft)
  const imag = new Float64Array(nfft)
  real.set(h)

  fft(real, imag)

  const halfN = nfft >> 1
  const response = new Float64Array(halfN)
  for (let i = 0; i < halfN; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
    response[i] = 20 * Math.log10(Math.max(mag, 1e-12))
  }
  return response
}

/**
 * Find the smallest power of 2 >= n.
 */
function nextPow2(n: number): number {
  let v = 1
  while (v < n) v <<= 1
  return v
}

/**
 * Channelize a wideband input signal into M narrowband channels
 * using the polyphase filter bank approach.
 */
export function channelize(input: Float64Array, config: ChannelizerConfig): ChannelizerResult {
  const { numChannels: M, prototypeOrder, sampleRate } = config

  // Design prototype lowpass filter
  const prototype = designPrototypeFilter(prototypeOrder, M)

  // Pad prototype to be a multiple of M
  const paddedLen = Math.ceil(prototypeOrder / M) * M
  const paddedProto = new Float64Array(paddedLen)
  paddedProto.set(prototype)

  const branchLen = paddedLen / M // taps per polyphase branch

  // Build polyphase branches: h_k[n] = h[nM + k]
  const branches: Float64Array[] = []
  for (let k = 0; k < M; k++) {
    const branch = new Float64Array(branchLen)
    for (let n = 0; n < branchLen; n++) {
      branch[n] = paddedProto[n * M + k]
    }
    branches.push(branch)
  }

  // Process input in blocks of M samples
  // Pad input to a multiple of M
  const inputPadLen = Math.ceil(input.length / M) * M
  const paddedInput = new Float64Array(inputPadLen)
  paddedInput.set(input)

  const numBlocks = inputPadLen / M
  // Each channel accumulates output blocks; gather magnitude per channel
  const channelAccum: Float64Array[] = []
  for (let ch = 0; ch < M; ch++) {
    channelAccum.push(new Float64Array(numBlocks))
  }

  // For each block, apply polyphase filter + M-point FFT
  for (let b = 0; b < numBlocks; b++) {
    const fftReal = new Float64Array(M)
    const fftImag = new Float64Array(M)

    for (let k = 0; k < M; k++) {
      // Polyphase filtering: convolve branch k with decimated input
      let sum = 0
      for (let n = 0; n < branchLen; n++) {
        const inputIdx = b * M + k - n * M
        if (inputIdx >= 0 && inputIdx < inputPadLen) {
          sum += branches[k][n] * paddedInput[inputIdx]
        }
      }
      fftReal[k] = sum
    }

    // M-point FFT across branches
    fft(fftReal, fftImag)

    // Store magnitude for each channel
    for (let ch = 0; ch < M; ch++) {
      channelAccum[ch][b] = Math.sqrt(
        fftReal[ch] * fftReal[ch] + fftImag[ch] * fftImag[ch]
      )
    }
  }

  // Convert channel outputs to dB magnitude spectrum
  const channelOutputs: Float64Array[] = channelAccum.map(acc => {
    const nfft = nextPow2(acc.length)
    const real = new Float64Array(nfft)
    const imag = new Float64Array(nfft)
    real.set(acc)
    fft(real, imag)

    const halfN = Math.max(nfft >> 1, 1)
    const spectrum = new Float64Array(halfN)
    for (let i = 0; i < halfN; i++) {
      const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / nfft
      spectrum[i] = 20 * Math.log10(Math.max(mag, 1e-12))
    }
    return spectrum
  })

  // Prototype filter frequency response
  const protoNfft = nextPow2(Math.max(prototypeOrder, 256))
  const prototypeResponse = filterFrequencyResponse(prototype, protoNfft)

  // Channel center frequencies
  const channelFrequencies: number[] = []
  for (let ch = 0; ch < M; ch++) {
    channelFrequencies.push((ch * sampleRate) / M)
  }

  // Computational complexity (in multiplies for N input samples)
  const N = input.length
  const log2M = Math.log2(M)
  const complexityPolyphase = N * (prototypeOrder / M + log2M)
  const complexityBruteForce = N * M * prototypeOrder

  return {
    channelOutputs,
    prototypeResponse,
    channelFrequencies,
    complexityPolyphase,
    complexityBruteForce,
  }
}
