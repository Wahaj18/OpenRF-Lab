import { useChannelizerState } from './useChannelizerState'

const CHANNEL_OPTIONS = [2, 4, 8, 16, 32, 64]
const CHANNEL_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
  '#a855f7', '#0ea5e9', '#22c55e', '#eab308',
]

function colorForChannel(idx: number): string {
  return CHANNEL_COLORS[idx % CHANNEL_COLORS.length]
}

interface SpectrumPlotProps {
  data: Float64Array
  width: number
  height: number
  color?: string
  channelBoundaries?: number[]
  sampleRate?: number
  label?: string
}

function SpectrumPlot({
  data,
  width,
  height,
  color = 'var(--sf-accent-blue, #3b82f6)',
  channelBoundaries,
  sampleRate,
  label,
}: SpectrumPlotProps) {
  if (data.length === 0) return null

  const padding = { top: 10, right: 10, bottom: 20, left: 40 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  let minVal = Infinity
  let maxVal = -Infinity
  for (let i = 0; i < data.length; i++) {
    if (data[i] < minVal) minVal = data[i]
    if (data[i] > maxVal) maxVal = data[i]
  }
  const range = maxVal - minVal || 1

  const points = Array.from(data).map((v, i) => {
    const x = padding.left + (i / (data.length - 1)) * plotW
    const y = padding.top + (1 - (v - minVal) / range) * plotH
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ display: 'block' }}>
      <rect width={width} height={height} fill="var(--sf-bg-primary, #1a1a2e)" rx={4} />

      {/* Channel boundaries */}
      {channelBoundaries && sampleRate && channelBoundaries.map((freq, i) => {
        const binPos = (freq / (sampleRate / 2)) * data.length
        const x = padding.left + (binPos / data.length) * plotW
        if (x < padding.left || x > padding.left + plotW) return null
        return (
          <line
            key={i}
            x1={x} y1={padding.top}
            x2={x} y2={padding.top + plotH}
            stroke="var(--sf-border, #333)"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
        )
      })}

      {/* Spectrum line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Axes */}
      <line
        x1={padding.left} y1={padding.top + plotH}
        x2={padding.left + plotW} y2={padding.top + plotH}
        stroke="var(--sf-text-muted, #888)"
        strokeWidth={1}
      />
      <line
        x1={padding.left} y1={padding.top}
        x2={padding.left} y2={padding.top + plotH}
        stroke="var(--sf-text-muted, #888)"
        strokeWidth={1}
      />

      {/* Labels */}
      <text
        x={padding.left + plotW / 2}
        y={height - 2}
        textAnchor="middle"
        fill="var(--sf-text-muted, #888)"
        fontSize={10}
      >
        Frequency
      </text>
      <text
        x={12}
        y={padding.top + plotH / 2}
        textAnchor="middle"
        fill="var(--sf-text-muted, #888)"
        fontSize={10}
        transform={`rotate(-90, 12, ${padding.top + plotH / 2})`}
      >
        dB
      </text>

      {label && (
        <text
          x={padding.left + 4}
          y={padding.top + 12}
          fill={color}
          fontSize={11}
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </svg>
  )
}

function formatFlops(flops: number): string {
  if (flops >= 1e9) return `${(flops / 1e9).toFixed(1)}G mults`
  if (flops >= 1e6) return `${(flops / 1e6).toFixed(1)}M mults`
  if (flops >= 1e3) return `${(flops / 1e3).toFixed(1)}k mults`
  return `${flops.toFixed(0)} mults`
}

export function ChannelizerFull() {
  const {
    numChannels,
    prototypeOrder,
    sampleRate,
    setNumChannels,
    setPrototypeOrder,
    result,
    inputSpectrum,
  } = useChannelizerState()

  const channelBoundaries = result.channelFrequencies

  const savings = result.complexityBruteForce / result.complexityPolyphase



  return (
    <div style={{ padding: 16, color: 'var(--sf-text-primary, #e0e0e0)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Polyphase Channelizer
      </h2>

      {/* Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        background: 'var(--sf-bg-control, #16213e)',
        borderRadius: 8,
        border: '1px solid var(--sf-border, #333)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          Channels (M):
          <select
            value={numChannels}
            onChange={e => setNumChannels(Number(e.target.value))}
            style={{
              background: 'var(--sf-bg-primary, #1a1a2e)',
              color: 'var(--sf-text-primary, #e0e0e0)',
              border: '1px solid var(--sf-border, #333)',
              borderRadius: 4,
              padding: '4px 8px',
            }}
          >
            {CHANNEL_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          Prototype Order: {prototypeOrder}
          <input
            type="range"
            min={16}
            max={256}
            step={8}
            value={prototypeOrder}
            onChange={e => setPrototypeOrder(Number(e.target.value))}
            style={{ width: 140 }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Main content */}
        <div style={{ flex: 1 }}>
          {/* Wideband input spectrum */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--sf-text-muted, #888)' }}>
              Wideband Input Spectrum
            </h3>
            <SpectrumPlot
              data={inputSpectrum}
              width={640}
              height={180}
              color="var(--sf-accent-blue, #3b82f6)"
              channelBoundaries={channelBoundaries}
              sampleRate={sampleRate}
            />
          </div>

          {/* Channel output grid */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--sf-text-muted, #888)' }}>
              Channel Outputs
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))`,
              gap: 6,
            }}>
              {result.channelOutputs.map((chData, i) => (
                <SpectrumPlot
                  key={i}
                  data={chData}
                  width={150}
                  height={80}
                  color={colorForChannel(i)}
                  label={`Ch ${i}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Complexity comparison sidebar */}
        <div style={{
          width: 220,
          padding: 12,
          background: 'var(--sf-bg-control, #16213e)',
          borderRadius: 8,
          border: '1px solid var(--sf-border, #333)',
          alignSelf: 'flex-start',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Complexity Comparison
          </h3>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--sf-text-muted, #888)' }}>Polyphase</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sf-accent-green, #10b981)' }}>
              {formatFlops(result.complexityPolyphase)}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--sf-text-muted, #888)' }}>Brute Force</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#ef4444' }}>
              {formatFlops(result.complexityBruteForce)}
            </div>
          </div>

          <div style={{
            padding: '8px 0',
            borderTop: '1px solid var(--sf-border, #333)',
            marginTop: 8,
          }}>
            <div style={{ fontSize: 12, color: 'var(--sf-text-muted, #888)' }}>Savings</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sf-accent-green, #10b981)' }}>
              {savings.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      {/* Educational section */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: 'var(--sf-bg-control, #16213e)',
        borderRadius: 8,
        border: '1px solid var(--sf-border, #333)',
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--sf-text-muted, #888)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sf-text-primary, #e0e0e0)', marginBottom: 8 }}>
          How Polyphase Channelizers Work
        </h3>
        <p style={{ marginBottom: 8 }}>
          A <strong style={{ color: 'var(--sf-text-primary, #e0e0e0)' }}>polyphase channelizer</strong> splits
          a wideband signal into M narrowband channels efficiently. Instead of using M separate filters
          (each running at the full sample rate), it decomposes the prototype lowpass filter into M
          polyphase branches and combines them with an M-point FFT.
        </p>
        <p style={{ marginBottom: 8 }}>
          <strong style={{ color: 'var(--sf-text-primary, #e0e0e0)' }}>Why it is efficient:</strong> The
          brute-force approach requires N x M x L multiplications (where L is the filter order). The
          polyphase approach only needs N x (L/M + log2(M)) multiplications -- each branch operates at
          1/M the sample rate, and the FFT replaces M separate frequency shifts.
        </p>
        <p>
          <strong style={{ color: 'var(--sf-text-primary, #e0e0e0)' }}>Prototype filter:</strong> A
          single lowpass filter with cutoff at Fs/(2M) serves as the template. Its coefficients are
          distributed across M branches (polyphase decomposition), where branch k gets every M-th tap
          starting at index k.
        </p>
      </div>
    </div>
  )
}
