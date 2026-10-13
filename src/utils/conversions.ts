export interface ConversionPair {
  name: string
  fromLabel: string
  toLabel: string
  forward: (val: number) => number
  reverse: (val: number) => number
}

export const CONVERSIONS: ConversionPair[] = [
  {
    name: 'dBm ↔ mW', fromLabel: 'dBm', toLabel: 'mW',
    forward: v => Math.pow(10, v / 10),
    reverse: v => 10 * Math.log10(v),
  },
  {
    name: 'dBm ↔ W', fromLabel: 'dBm', toLabel: 'W',
    forward: v => Math.pow(10, (v - 30) / 10),
    reverse: v => 10 * Math.log10(v) + 30,
  },
  {
    name: 'dBi ↔ Linear', fromLabel: 'dBi', toLabel: 'Linear',
    forward: v => Math.pow(10, v / 10),
    reverse: v => 10 * Math.log10(v),
  },
  {
    name: 'dBW ↔ dBm', fromLabel: 'dBW', toLabel: 'dBm',
    forward: v => v + 30,
    reverse: v => v - 30,
  },
  {
    name: 'Freq ↔ Wavelength', fromLabel: 'Hz', toLabel: 'm',
    forward: v => 299792458 / v,
    reverse: v => 299792458 / v,
  },
  {
    name: 'dBuV ↔ V', fromLabel: 'dBuV', toLabel: 'V',
    forward: v => Math.pow(10, (v - 120) / 20),
    reverse: v => 20 * Math.log10(v) + 120,
  },
]
