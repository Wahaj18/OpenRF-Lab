import { fft } from './fft'
import { createWindow } from './windowing'
import { applyDetector } from './detection'
import { generateCW } from './signals/cw'
import { generateNoise } from './signals/noise'
import { generateModulated } from './signals/modulated'
import { generateChirp } from './signals/chirp'
import { generateFHSS, type FHSSState } from './signals/hopper'
import type { AnalyzerConfig, SignalConfig } from './types'

export const DISPLAY_BINS = 800
const MAX_FFT = 1 << 16

/**
 * Signals are synthesised as real samples on an IF so the one-sided FFT
 * covers [startFreq, stopFreq] exactly. The IF places startFreq at
 * GUARD * span above 0 Hz, which keeps every in-span signal clear of DC and
 * of Nyquist (fs/2 = 1.25 span).
 */
const GUARD = 0.1

export interface SweepPlan { fftSize: number; sampleRate: number; ifOrigin: number; firstBin: number; lastBin: number; binHz: number; rbw: number }

/** FFT bins per RBW: keeps the RBW filter much wider than the window's main lobe so a CW reads its full power. */
const BINS_PER_RBW = 8

/**
 * Gaussian RBW filter, -3 dB at ±RBW/2. Its equivalent noise bandwidth is
 * RBW·sqrt(pi / (4 ln 2)) ≈ 1.0645·RBW, so noise reads 10·log10(1.0645·RBW·N0).
 */
export const RBW_ENBW_FACTOR = Math.sqrt(Math.PI / (4 * Math.LN2))

/** The RBW the engine actually applies for this span (narrow RBWs are limited by the FFT size cap). */
export function effectiveRbw(span: number, rbw: number): number {
  return planSweep({ span, rbw, centerFreq: span } as AnalyzerConfig).rbw
}

export function planSweep(config: AnalyzerConfig): SweepPlan {
  const sampleRate = config.span * 2.5
  const wanted = Math.max(256, (BINS_PER_RBW * sampleRate) / Math.max(config.rbw, 1e-9))
  const fftSize = Math.min(MAX_FFT, Math.pow(2, Math.ceil(Math.log2(wanted))))
  const binHz = sampleRate / fftSize
  const startFreq = config.centerFreq - config.span / 2
  const ifOrigin = startFreq - GUARD * config.span
  const firstBin = Math.round((GUARD * config.span) / binHz)
  const lastBin = Math.round(((GUARD + 1) * config.span) / binHz)
  // The FFT size is capped, so very narrow RBWs are limited to BINS_PER_RBW bins.
  const rbw = Math.max(config.rbw, BINS_PER_RBW * binHz)
  return { fftSize, sampleRate, ifOrigin, firstBin, lastBin, binHz, rbw }
}

/** One detected sweep across the analyzer span, DISPLAY_BINS points in dBm. */
export function computeSweep(config: AnalyzerConfig, signals: SignalConfig[], fhssStates: Map<string, FHSSState> = new Map()): Float64Array {
  const plan = planSweep(config)
  const N = plan.fftSize
  const composite = new Float64Array(N)
  for (const sig of signals) {
    if (!sig.enabled) continue
    const generated = generateSignal(sig, plan.sampleRate, N, plan.ifOrigin, fhssStates)
    for (let i = 0; i < N; i++) composite[i] += generated[i]
  }
  const window = createWindow(config.windowType, N)
  const windowed = new Float64Array(N)
  let w2 = 0
  for (let i = 0; i < N; i++) { windowed[i] = composite[i] * window[i]; w2 += window[i] * window[i] }
  const freq = fft(windowed, new Float64Array(N))
  // One-sided power per bin, normalised so the bins of any signal sum to its
  // power (Parseval). A CW then reads its power once the RBW filter is applied
  // and noise reads its density times the filter's noise bandwidth.
  const half = N / 2
  const binPower = new Float64Array(half + 1)
  const norm = 2 / (N * w2)
  for (let k = 0; k <= half; k++) binPower[k] = (freq.real[k] * freq.real[k] + freq.imag[k] * freq.imag[k]) * norm
  const inSpan = applyRbwFilter(binPower, plan.firstBin, plan.lastBin, plan.rbw / plan.binHz)
  return applyVbwSmoothing(applyDetector(inSpan, DISPLAY_BINS, config.detectorType), config.vbw, config.rbw)
}

/** Convolve the bin powers with a Gaussian RBW filter of rbwBins (-3 dB width, in bins); returns dBm for bins first..last. */
export function applyRbwFilter(binPower: Float64Array, first: number, last: number, rbwBins: number): Float64Array {
  const reach = Math.ceil(2 * rbwBins)
  const kernel = new Float64Array(2 * reach + 1)
  for (let j = -reach; j <= reach; j++) kernel[j + reach] = Math.pow(2, -Math.pow((2 * j) / rbwBins, 2))
  const out = new Float64Array(last - first + 1)
  const maxBin = binPower.length - 1
  for (let k = first; k <= last; k++) {
    let acc = 0
    const lo = Math.max(0, k - reach), hi = Math.min(maxBin, k + reach)
    for (let j = lo; j <= hi; j++) acc += binPower[j] * kernel[j - k + reach]
    out[k - first] = acc > 1e-15 ? 10 * Math.log10(acc) : -150
  }
  return out
}

export function generateSignal(sig: SignalConfig, sampleRate: number, numSamples: number, centerFreq: number, fhssStates: Map<string, FHSSState>): Float64Array {
  const p = sig.params
  switch (sig.type) {
    case 'cw': return generateCW({ frequency: ((p.frequency as number) ?? 1000) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, phase: (p.phase as number) ?? 0, sampleRate, numSamples })
    case 'noise': return generateNoise({ type: (p.noiseType as 'awgn' | 'pink' | 'brown') ?? 'awgn', powerDbm: (p.powerDbm as number) ?? -90, numSamples })
    case 'am': case 'fm': case 'bpsk': case 'qpsk': case 'qam16': case 'qam64':
      return generateModulated({ type: sig.type, carrierFreq: ((p.carrierFreq as number) ?? 1000) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, bandwidth: (p.bandwidth as number) ?? 500, modulationIndex: (p.modulationIndex as number) ?? 1, sampleRate, numSamples })
    case 'chirp': case 'pulse':
      return generateChirp({ startFreq: ((p.startFreq as number) ?? 500) - centerFreq, stopFreq: ((p.stopFreq as number) ?? 1500) - centerFreq, powerDbm: (p.powerDbm as number) ?? -20, pulseWidth: (p.pulseWidth as number) ?? 0.01, pri: (p.pri as number) ?? 0.05, sampleRate, numSamples })
    case 'fhss': {
      const rawHops = (p.hopFrequencies as number[]) ?? [500, 1000, 1500, 2000]
      const basebandHops = rawHops.map(f => f - centerFreq)
      const fhssParams = { hopFrequencies: basebandHops, dwellTime: (p.dwellTime as number) ?? 0.01, powerDbm: (p.powerDbm as number) ?? -20, pattern: (p.pattern as 'sequential' | 'random') ?? 'sequential', sampleRate, numSamples }
      const existingState = fhssStates.get(sig.id)
      const result = generateFHSS(fhssParams, existingState)
      fhssStates.set(sig.id, result.state)
      return result.samples
    }
    default: return new Float64Array(numSamples)
  }
}

/** VBW smoothing: when VBW < RBW, apply exponential moving average to smooth the trace */
function applyVbwSmoothing(spectrum: Float64Array, vbw: number, rbw: number): Float64Array {
  if (vbw >= rbw) return spectrum
  const ratio = vbw / rbw
  // Smoothing kernel width inversely proportional to VBW/RBW ratio
  const kernelWidth = Math.max(1, Math.round(1 / ratio))
  if (kernelWidth <= 1) return spectrum

  const smoothed = new Float64Array(spectrum.length)
  const alpha = 2 / (kernelWidth + 1)
  smoothed[0] = spectrum[0]
  // Forward pass
  for (let i = 1; i < spectrum.length; i++) {
    smoothed[i] = alpha * spectrum[i] + (1 - alpha) * smoothed[i - 1]
  }
  // Backward pass for zero-phase smoothing
  for (let i = spectrum.length - 2; i >= 0; i--) {
    smoothed[i] = alpha * smoothed[i] + (1 - alpha) * smoothed[i + 1]
  }
  return smoothed
}

