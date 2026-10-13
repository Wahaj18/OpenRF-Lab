import { describe, it, expect } from 'vitest'
import {
  fspl, linkBudget, cascadedNoiseFigure, thermalNoise,
  fresnelRadius, dbmToWatts, wattsToDbm,
} from '../../src/utils/rf-math'

describe('rf-math', () => {
  it('FSPL at 2.4 GHz, 100m is about 80 dB', () => {
    const loss = fspl(2.4e9, 100)
    expect(loss).toBeGreaterThan(78)
    expect(loss).toBeLessThan(82)
  })

  it('link budget computes received power', () => {
    const result = linkBudget({
      txPower: 20, txGain: 6, txLoss: 1,
      frequency: 2.4e9, distance: 100,
      atmosphericLoss: 0, rainLoss: 0,
      rxGain: 2, rxLoss: 1,
    })
    expect(result.receivedPower).toBeGreaterThan(-60)
    expect(result.receivedPower).toBeLessThan(-50)
  })

  it('cascaded NF matches Friis formula', () => {
    const nf = cascadedNoiseFigure([{ gain: 20, nf: 2 }, { gain: 10, nf: 10 }])
    expect(nf).toBeGreaterThan(2)
    expect(nf).toBeLessThan(3)
  })

  it('thermal noise at 290K, 1MHz is about -114 dBm', () => {
    const n = thermalNoise(290, 1e6)
    expect(n).toBeGreaterThan(-115)
    expect(n).toBeLessThan(-113)
  })

  it('dBm/Watts round-trips', () => {
    expect(wattsToDbm(dbmToWatts(20))).toBeCloseTo(20, 6)
  })

  it('Fresnel radius is positive', () => {
    expect(fresnelRadius(1, 2.4e9, 50, 50)).toBeGreaterThan(0)
  })
})
