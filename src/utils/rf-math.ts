const C = 299792458

export function fspl(frequencyHz: number, distanceM: number): number {
  return 20 * Math.log10(distanceM) + 20 * Math.log10(frequencyHz) + 20 * Math.log10(4 * Math.PI / C)
}

export function linkBudget(params: {
  txPower: number; txGain: number; txLoss: number
  frequency: number; distance: number; atmosphericLoss: number; rainLoss: number
  rxGain: number; rxLoss: number
}): { receivedPower: number; pathLoss: number } {
  const pathLoss = fspl(params.frequency, params.distance) + params.atmosphericLoss + params.rainLoss
  const receivedPower = params.txPower + params.txGain - params.txLoss - pathLoss + params.rxGain - params.rxLoss
  return { receivedPower, pathLoss }
}

export function cascadedNoiseFigure(stages: { gain: number; nf: number }[]): number {
  if (stages.length === 0) return 0
  let fTotal = Math.pow(10, stages[0].nf / 10)
  let gCumulative = Math.pow(10, stages[0].gain / 10)
  for (let i = 1; i < stages.length; i++) {
    const fi = Math.pow(10, stages[i].nf / 10)
    fTotal += (fi - 1) / gCumulative
    gCumulative *= Math.pow(10, stages[i].gain / 10)
  }
  return 10 * Math.log10(fTotal)
}

export function thermalNoise(temperatureK: number, bandwidthHz: number): number {
  const k = 1.380649e-23
  const noiseWatts = k * temperatureK * bandwidthHz
  return 10 * Math.log10(noiseWatts) + 30
}

export function fresnelRadius(n: number, frequencyHz: number, d1: number, d2: number): number {
  const lambda = C / frequencyHz
  return Math.sqrt(n * lambda * d1 * d2 / (d1 + d2))
}

export function eirp(txPowerDbm: number, antennaGainDbi: number, lossesDb: number): number {
  return txPowerDbm + antennaGainDbi - lossesDb
}

export function dbmToWatts(dbm: number): number { return Math.pow(10, (dbm - 30) / 10) }
export function wattsToDbm(watts: number): number { return 10 * Math.log10(watts) + 30 }
export function dbmToMilliwatts(dbm: number): number { return Math.pow(10, dbm / 10) }
export function dbiToLinear(dbi: number): number { return Math.pow(10, dbi / 10) }
export function linearToDbi(linear: number): number { return 10 * Math.log10(linear) }
export function freqToWavelength(hz: number): number { return C / hz }
export function wavelengthToFreq(m: number): number { return C / m }

export function powerRatioToDb(ratio: number): number { return 10 * Math.log10(ratio) }
export function dbToPowerRatio(db: number): number { return Math.pow(10, db / 10) }
export function voltageRatioToDb(ratio: number): number { return 20 * Math.log10(ratio) }
export function dbToVoltageRatio(db: number): number { return Math.pow(10, db / 20) }
