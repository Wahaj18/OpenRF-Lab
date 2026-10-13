import { useState, useMemo } from 'react'
import { fft } from '../../dsp/fft'
import { createWindow } from '../../dsp/windowing'
import { generateNoise } from '../../dsp/signals/noise'

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'chirp' | 'pulse'

export interface WaveformState {
  waveformType: WaveformType
  frequency: number
  amplitude: number
  phase: number
  dutyCycle: number
  noiseLevel: number
  sampleRate: number
  numSamples: number
  samples: Float64Array
  spectrum: Float64Array
  freqAxis: number[]
  setWaveformType: (t: WaveformType) => void
  setFrequency: (f: number) => void
  setAmplitude: (a: number) => void
  setPhase: (p: number) => void
  setDutyCycle: (d: number) => void
  setNoiseLevel: (n: number) => void
}

const SAMPLE_RATE = 8192
const NUM_SAMPLES = 1024

export function generateSamples(
  type: WaveformType,
  frequency: number,
  amplitude: number,
  phase: number,
  dutyCycle: number,
  sampleRate: number,
  numSamples: number,
): Float64Array {
  const samples = new Float64Array(numSamples)
  const twoPi = 2 * Math.PI

  switch (type) {
    case 'sine':
      for (let n = 0; n < numSamples; n++) {
        samples[n] = amplitude * Math.sin(twoPi * frequency * n / sampleRate + phase)
      }
      break

    case 'square':
      for (let n = 0; n < numSamples; n++) {
        const t = ((frequency * n / sampleRate + phase / twoPi) % 1 + 1) % 1
        samples[n] = amplitude * (t < dutyCycle ? 1 : -1)
      }
      break

    case 'sawtooth':
      for (let n = 0; n < numSamples; n++) {
        const t = ((frequency * n / sampleRate + phase / twoPi) % 1 + 1) % 1
        samples[n] = amplitude * (2 * t - 1)
      }
      break

    case 'triangle':
      for (let n = 0; n < numSamples; n++) {
        const t = ((frequency * n / sampleRate + phase / twoPi) % 1 + 1) % 1
        samples[n] = amplitude * (2 * Math.abs(2 * t - 1) - 1)
      }
      break

    case 'chirp': {
      const f0 = frequency
      // Sweep up to 4× the start frequency, stopping at Nyquist so it never aliases
      const f1 = Math.min(4 * frequency, sampleRate / 2)
      const duration = numSamples / sampleRate
      for (let n = 0; n < numSamples; n++) {
        const t = n / sampleRate
        samples[n] = amplitude * Math.sin(twoPi * (f0 * t + 0.5 * (f1 - f0) * t * t / duration) + phase)
      }
      break
    }

    case 'pulse':
      for (let n = 0; n < numSamples; n++) {
        const t = ((frequency * n / sampleRate + phase / twoPi) % 1 + 1) % 1
        samples[n] = amplitude * (t < dutyCycle ? 1 : 0)
      }
      break
  }

  return samples
}

function addNoise(samples: Float64Array, noiseLevel: number): Float64Array {
  if (noiseLevel <= -100) return samples
  const noise = generateNoise({ type: 'awgn', powerDbm: noiseLevel, numSamples: samples.length })
  const result = new Float64Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    result[i] = samples[i] + noise[i]
  }
  return result
}

/**
 * One-sided amplitude spectrum in dB (Hann window, coherent gain removed):
 * a sine of amplitude A reads 20·log10(A) at its frequency, DC reads 20·log10(|mean|).
 */
export function computeSpectrum(samples: Float64Array): Float64Array {
  const N = samples.length
  const w = createWindow('hann', N + 1) // periodic Hann
  let wSum = 0
  const x = new Float64Array(N)
  for (let i = 0; i < N; i++) { x[i] = samples[i] * w[i]; wSum += w[i] }
  const { real, imag } = fft(x, new Float64Array(N))
  const out = new Float64Array(N / 2 + 1)
  for (let k = 0; k <= N / 2; k++) {
    const amp = (Math.hypot(real[k], imag[k]) / wSum) * (k === 0 || k === N / 2 ? 1 : 2)
    out[k] = amp > 1e-8 ? 20 * Math.log10(amp) : -160
  }
  return out
}

function buildFreqAxis(numSamples: number, sampleRate: number): number[] {
  const numBins = numSamples / 2 + 1
  const axis: number[] = new Array(numBins)
  for (let i = 0; i < numBins; i++) {
    axis[i] = (i * sampleRate) / numSamples
  }
  return axis
}

export function useWaveformState(): WaveformState {
  const [waveformType, setWaveformType] = useState<WaveformType>('sine')
  const [frequency, setFrequency] = useState(1000)
  const [amplitude, setAmplitude] = useState(1.0)
  const [phase, setPhase] = useState(0)
  const [dutyCycle, setDutyCycle] = useState(0.5)
  const [noiseLevel, setNoiseLevel] = useState(-100)

  const samples = useMemo(() => {
    const raw = generateSamples(waveformType, frequency, amplitude, phase, dutyCycle, SAMPLE_RATE, NUM_SAMPLES)
    return addNoise(raw, noiseLevel)
  }, [waveformType, frequency, amplitude, phase, dutyCycle, noiseLevel])

  const spectrum = useMemo(() => computeSpectrum(samples), [samples])

  const freqAxis = useMemo(() => buildFreqAxis(NUM_SAMPLES, SAMPLE_RATE), [])

  return {
    waveformType,
    frequency,
    amplitude,
    phase,
    dutyCycle,
    noiseLevel,
    sampleRate: SAMPLE_RATE,
    numSamples: NUM_SAMPLES,
    samples,
    spectrum,
    freqAxis,
    setWaveformType,
    setFrequency,
    setAmplitude,
    setPhase,
    setDutyCycle,
    setNoiseLevel,
  }
}
