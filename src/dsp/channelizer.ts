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
  channelOutputs: Float64Array[]  // M arrays: spectrum (dB) of each channel's baseband output, centred on the channel
  channelPowerDb: number[]        // mean output power of each channel (dB)
  prototypeResponse: Float64Array // prototype filter frequency response
  channelFrequencies: number[]    // center frequency of each channel
  complexityPolyphase: number     // multiplies for polyphase: N·(L/M + log2 M)
  complexityBruteForce: number    // multiplies for brute force: N·M·L
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
 * Compute the frequency response of a filter (magnitude in dB), nfft/2 points from 0 to fs/2.
 */
function filterFrequencyResponse(h: Float64Array, nfft: number): Float64Array {
  const real = new Float64Array(nfft)
  real.set(h)
  const spec = fft(real, new Float64Array(nfft))
  const halfN = nfft >> 1
  const response = new Float64Array(halfN)
  for (let i = 0; i < halfN; i++) {
    const mag = Math.hypot(spec.real[i], spec.imag[i])
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

  // Analysis filter bank. Channel c (centred on c·fs/M) at output m is
  //   y_c[m] = sum_n h[n]·x[mM − n]·e^{+j2πcn/M}
  // which is a mix-down, lowpass and decimate-by-M. Splitting n = pM + k:
  //   v_k[m] = sum_p h_k[p]·x[(m − p)M − k],  y_c[m] = sum_k v_k[m]·e^{+j2πck/M}
  // so each block costs M short branch filters and one M-point FFT.
  const numBlocks = Math.ceil(input.length / M)
  const outRe: Float64Array[] = [], outIm: Float64Array[] = []
  for (let ch = 0; ch < M; ch++) { outRe.push(new Float64Array(numBlocks)); outIm.push(new Float64Array(numBlocks)) }
  const v = new Float64Array(M)
  for (let m = 0; m < numBlocks; m++) {
    for (let k = 0; k < M; k++) {
      let sum = 0
      for (let p = 0; p < branchLen; p++) {
        const idx = (m - p) * M - k
        if (idx >= 0 && idx < input.length) sum += branches[k][p] * input[idx]
      }
      v[k] = sum
    }
    // The forward FFT uses e^{-j}; channel c is FFT bin (M − c) mod M.
    const spec = fft(v, new Float64Array(M))
    for (let ch = 0; ch < M; ch++) {
      const bin = (M - ch) % M
      outRe[ch][m] = spec.real[bin]
      outIm[ch][m] = spec.imag[bin]
    }
  }

  const channelPowerDb: number[] = []
  const channelOutputs: Float64Array[] = []
  for (let ch = 0; ch < M; ch++) {
    let pw = 0
    for (let m = 0; m < numBlocks; m++) pw += outRe[ch][m] ** 2 + outIm[ch][m] ** 2
    channelPowerDb.push(10 * Math.log10(Math.max(pw / numBlocks, 1e-24)))
    // Spectrum of the complex channel output, shifted so the channel centre is in the middle
    const nfft = nextPow2(numBlocks)
    const re = new Float64Array(nfft), im = new Float64Array(nfft)
    re.set(outRe[ch]); im.set(outIm[ch])
    const spec = fft(re, im)
    const out = new Float64Array(nfft)
    for (let i = 0; i < nfft; i++) {
      const src = (i + nfft / 2) % nfft
      out[i] = 20 * Math.log10(Math.max(Math.hypot(spec.real[src], spec.imag[src]) / numBlocks, 1e-12))
    }
    channelOutputs.push(out)
  }

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
    channelPowerDb,
    prototypeResponse,
    channelFrequencies,
    complexityPolyphase,
    complexityBruteForce,
  }
}
