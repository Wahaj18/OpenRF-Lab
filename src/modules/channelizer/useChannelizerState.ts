import { useState, useMemo } from 'react'
import { channelize, type ChannelizerConfig, type ChannelizerResult } from '../../dsp/channelizer'
import { fft, magnitudeSpectrum } from '../../dsp/fft'

export interface ChannelizerState {
  numChannels: number
  prototypeOrder: number
  sampleRate: number
  setNumChannels: (n: number) => void
  setPrototypeOrder: (n: number) => void
  result: ChannelizerResult
  inputSpectrum: Float64Array
}

/**
 * Generate a wideband test signal: sum of M/2 tones spread across the band + noise.
 */
function generateTestSignal(sampleRate: number, numChannels: number, length: number): Float64Array {
  const signal = new Float64Array(length)
  const numTones = Math.max(Math.floor(numChannels / 2), 1)

  for (let t = 0; t < numTones; t++) {
    // Place tones at various channel centers
    const channelIdx = Math.floor((t * 2 + 1) * numChannels / (numTones * 2))
    const freq = (channelIdx * sampleRate) / numChannels + sampleRate / (numChannels * 4)

    for (let i = 0; i < length; i++) {
      signal[i] += Math.sin((2 * Math.PI * freq * i) / sampleRate)
    }
  }

  // Add noise
  for (let i = 0; i < length; i++) {
    signal[i] += 0.1 * (Math.random() * 2 - 1)
  }

  return signal
}

const INPUT_LENGTH = 1024

export function useChannelizerState(): ChannelizerState {
  const [numChannels, setNumChannels] = useState(8)
  const [prototypeOrder, setPrototypeOrder] = useState(64)
  const sampleRate = 8192

  const input = useMemo(
    () => generateTestSignal(sampleRate, numChannels, INPUT_LENGTH),
    [numChannels, sampleRate]
  )

  const inputSpectrum = useMemo(() => {
    const imag = new Float64Array(input.length)
    const { real, imag: imagOut } = fft(input, imag)
    return magnitudeSpectrum(real, imagOut, input.length)
  }, [input])

  const config: ChannelizerConfig = useMemo(
    () => ({ numChannels, prototypeOrder, sampleRate }),
    [numChannels, prototypeOrder, sampleRate]
  )

  const result = useMemo(() => channelize(input, config), [input, config])

  return {
    numChannels,
    prototypeOrder,
    sampleRate,
    setNumChannels,
    setPrototypeOrder,
    result,
    inputSpectrum,
  }
}
