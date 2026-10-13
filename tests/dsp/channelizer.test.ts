import { describe, it, expect } from 'vitest'
import { channelize } from '../../src/dsp/channelizer'

describe('channelize', () => {
  it('produces correct number of channel outputs', () => {
    const input = new Float64Array(1024)
    for (let i = 0; i < 1024; i++) input[i] = Math.sin(2 * Math.PI * 500 * i / 8192)
    const result = channelize(input, { numChannels: 8, prototypeOrder: 64, sampleRate: 8192 })
    expect(result.channelOutputs.length).toBe(8)
    expect(result.channelFrequencies.length).toBe(8)
  })

  it('channel outputs have expected length', () => {
    const input = new Float64Array(1024)
    for (let i = 0; i < 1024; i++) input[i] = Math.sin(2 * Math.PI * 500 * i / 8192)
    const result = channelize(input, { numChannels: 8, prototypeOrder: 64, sampleRate: 8192 })
    // Each channel output is a spectrum of the decimated signal
    for (const ch of result.channelOutputs) {
      expect(ch.length).toBeGreaterThan(0)
    }
  })

  it('polyphase is cheaper than brute force', () => {
    const input = new Float64Array(1024)
    const result = channelize(input, { numChannels: 16, prototypeOrder: 128, sampleRate: 8192 })
    expect(result.complexityPolyphase).toBeLessThan(result.complexityBruteForce)
  })

  it('channel frequencies are evenly spaced', () => {
    const result = channelize(new Float64Array(256), {
      numChannels: 4,
      prototypeOrder: 32,
      sampleRate: 8192,
    })
    expect(result.channelFrequencies).toEqual([0, 2048, 4096, 6144])
  })

  it('prototype response has expected length', () => {
    const result = channelize(new Float64Array(512), {
      numChannels: 8,
      prototypeOrder: 64,
      sampleRate: 8192,
    })
    expect(result.prototypeResponse.length).toBeGreaterThan(0)
  })
})
