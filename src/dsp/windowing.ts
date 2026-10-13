export type WindowType = 'rectangular' | 'hann' | 'hamming' | 'blackman' | 'kaiser' | 'flat-top'

export function createWindow(type: WindowType, N: number): Float64Array {
  const w = new Float64Array(N)
  switch (type) {
    case 'rectangular':
      w.fill(1)
      break
    case 'hann':
      for (let n = 0; n < N; n++) w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)))
      break
    case 'hamming':
      for (let n = 0; n < N; n++) w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1))
      break
    case 'blackman':
      for (let n = 0; n < N; n++) {
        const a0 = 0.42, a1 = 0.5, a2 = 0.08
        w[n] = a0 - a1 * Math.cos((2 * Math.PI * n) / (N - 1)) + a2 * Math.cos((4 * Math.PI * n) / (N - 1))
      }
      break
    case 'kaiser': {
      const beta = 5.0
      const denom = bessel0(beta)
      for (let n = 0; n < N; n++) {
        const ratio = (2 * n) / (N - 1) - 1
        w[n] = bessel0(beta * Math.sqrt(1 - ratio * ratio)) / denom
      }
      break
    }
    case 'flat-top':
      for (let n = 0; n < N; n++) {
        const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158, a3 = 0.083578947, a4 = 0.006947368
        w[n] = a0 - a1 * Math.cos((2 * Math.PI * n) / (N - 1)) + a2 * Math.cos((4 * Math.PI * n) / (N - 1)) - a3 * Math.cos((6 * Math.PI * n) / (N - 1)) + a4 * Math.cos((8 * Math.PI * n) / (N - 1))
      }
      break
  }
  return w
}

function bessel0(x: number): number {
  let sum = 1, term = 1
  for (let k = 1; k <= 25; k++) {
    term *= (x / (2 * k)) * (x / (2 * k))
    sum += term
    if (term < 1e-12 * sum) break
  }
  return sum
}
