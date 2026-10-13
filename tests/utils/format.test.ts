import { describe, it, expect } from 'vitest'
import { formatFrequency, formatAmplitude } from '../../src/utils/format'

describe('formatFrequency', () => {
  it('formats Hz', () => { expect(formatFrequency(500)).toBe('500.0 Hz') })
  it('formats kHz', () => { expect(formatFrequency(1500)).toBe('1.500 kHz') })
  it('formats MHz', () => { expect(formatFrequency(2.437e6)).toBe('2.437 MHz') })
  it('formats GHz', () => { expect(formatFrequency(2.437e9)).toBe('2.437 GHz') })
})

describe('formatAmplitude', () => {
  it('formats dBm with 1 decimal', () => { expect(formatAmplitude(-22.4)).toBe('-22.4 dBm') })
  it('formats positive dBm', () => { expect(formatAmplitude(10)).toBe('10.0 dBm') })
})
