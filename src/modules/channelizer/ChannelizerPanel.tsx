import { useChannelizerState } from './useChannelizerState'

const CHANNEL_OPTIONS = [2, 4, 8, 16, 32, 64]

function formatFlops(flops: number): string {
  if (flops >= 1e9) return `${(flops / 1e9).toFixed(1)}G mults`
  if (flops >= 1e6) return `${(flops / 1e6).toFixed(1)}M mults`
  if (flops >= 1e3) return `${(flops / 1e3).toFixed(1)}k mults`
  return `${flops.toFixed(0)} mults`
}

function MiniSpectrum({ data }: { data: Float64Array }) {
  if (data.length === 0) return null

  const width = 248
  const height = 80

  let minVal = Infinity
  let maxVal = -Infinity
  for (let i = 0; i < data.length; i++) {
    if (data[i] < minVal) minVal = data[i]
    if (data[i] > maxVal) maxVal = data[i]
  }
  const range = maxVal - minVal || 1

  const points = Array.from(data).map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = (1 - (v - minVal) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block', borderRadius: 4 }}>
      <rect width={width} height={height} fill="var(--sf-bg-primary, #1a1a2e)" />
      <polyline points={points} fill="none" stroke="var(--sf-accent-blue, #3b82f6)" strokeWidth={1.5} />
    </svg>
  )
}

export function ChannelizerPanel() {
  const {
    numChannels,
    setNumChannels,
    result,
    inputSpectrum,
  } = useChannelizerState()

  const savings = result.complexityBruteForce / result.complexityPolyphase

  return (
    <div style={{
      width: 280,
      padding: 12,
      color: 'var(--sf-text-primary, #e0e0e0)',
      background: 'var(--sf-bg-control, #16213e)',
      borderRadius: 8,
      border: '1px solid var(--sf-border, #333)',
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
        Channelizer
      </h3>

      {/* Channel selector */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
        Channels:
        <select
          value={numChannels}
          onChange={e => setNumChannels(Number(e.target.value))}
          style={{
            background: 'var(--sf-bg-primary, #1a1a2e)',
            color: 'var(--sf-text-primary, #e0e0e0)',
            border: '1px solid var(--sf-border, #333)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 13,
          }}
        >
          {CHANNEL_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      {/* Mini spectrum */}
      <div style={{ marginBottom: 10 }}>
        <MiniSpectrum data={inputSpectrum} />
      </div>

      {/* Complexity comparison */}
      <div style={{ fontSize: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--sf-text-muted, #888)' }}>Polyphase:</span>
          <span style={{ color: 'var(--sf-accent-green, #10b981)', fontWeight: 600 }}>
            {formatFlops(result.complexityPolyphase)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--sf-text-muted, #888)' }}>Brute Force:</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>
            {formatFlops(result.complexityBruteForce)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span style={{ color: 'var(--sf-text-muted, #888)' }}>Savings:</span>
          <span style={{ color: 'var(--sf-accent-green, #10b981)' }}>
            {savings.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Placeholder button */}
      <button
        disabled
        style={{
          width: '100%',
          padding: '6px 0',
          fontSize: 12,
          background: 'var(--sf-bg-primary, #1a1a2e)',
          color: 'var(--sf-text-muted, #888)',
          border: '1px solid var(--sf-border, #333)',
          borderRadius: 4,
          cursor: 'not-allowed',
          opacity: 0.6,
        }}
      >
        Feed from Analyzer
      </button>
    </div>
  )
}
