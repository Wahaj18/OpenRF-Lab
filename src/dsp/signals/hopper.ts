export interface FHSSParams {
  hopFrequencies: number[]
  dwellTime: number
  powerDbm: number
  pattern: 'sequential' | 'random'
  sampleRate: number
  numSamples: number
}

export interface FHSSState {
  hopOrder: number[]
  hopIndex: number
  lastHopTime: number
  phase: number
}

export function createFHSSState(params: FHSSParams): FHSSState {
  const hopOrder = params.pattern === 'sequential'
    ? params.hopFrequencies
    : shuffleArray(params.hopFrequencies)
  return { hopOrder, hopIndex: 0, lastHopTime: Date.now(), phase: 0 }
}

export function generateFHSS(params: FHSSParams, state?: FHSSState): { samples: Float64Array; state: FHSSState } {
  const { powerDbm, sampleRate, numSamples } = params
  const amplitude = Math.pow(10, powerDbm / 20) * Math.SQRT2
  const samples = new Float64Array(numSamples)

  if (!state) {
    state = createFHSSState(params)
  }

  const now = Date.now()
  const elapsed = (now - state.lastHopTime) / 1000
  const dwellTime = params.dwellTime
  if (elapsed >= dwellTime) {
    const hopsElapsed = Math.floor(elapsed / dwellTime)
    state.hopIndex = (state.hopIndex + hopsElapsed) % state.hopOrder.length
    state.lastHopTime = now
  }

  const currentFreq = state.hopOrder[state.hopIndex]
  let phase = state.phase
  for (let n = 0; n < numSamples; n++) {
    phase += (2 * Math.PI * currentFreq) / sampleRate
    samples[n] = amplitude * Math.cos(phase)
  }
  // Wrap phase to prevent precision loss
  state.phase = phase % (2 * Math.PI)

  return { samples, state }
}

function shuffleArray(arr: number[]): number[] {
  const result = [...arr]
  let seed = 42
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const j = seed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
