import { useMemo } from 'react'
import { useModulationState, type ModulationType } from './useModulationState'
import { useTabManager } from '../../app/TabManager'

const ALL_TYPES: { id: ModulationType; label: string }[] = [
  { id: 'am', label: 'AM' },
  { id: 'fm', label: 'FM' },
  { id: 'bpsk', label: 'BPSK' },
  { id: 'qpsk', label: 'QPSK' },
  { id: '8psk', label: '8PSK' },
  { id: '16qam', label: '16-QAM' },
  { id: '64qam', label: '64-QAM' },
  { id: '256qam', label: '256-QAM' },
]

function MiniConstellation({
  width, height, idealPoints, noisyPoints,
}: {
  width: number; height: number
  idealPoints: { i: number; q: number }[]
  noisyPoints: { i: number; q: number }[]
}) {
  const pad = 16
  const plotW = width - 2 * pad
  const plotH = height - 2 * pad
  const maxRange = useMemo(() => {
    let max = 1
    for (const p of [...idealPoints, ...noisyPoints]) {
      max = Math.max(max, Math.abs(p.i), Math.abs(p.q))
    }
    return max * 1.3
  }, [idealPoints, noisyPoints])

  const toX = (v: number) => pad + ((v + maxRange) / (2 * maxRange)) * plotW
  const toY = (v: number) => pad + ((maxRange - v) / (2 * maxRange)) * plotH

  return (
    <svg width={width} height={height} style={{ backgroundColor: 'var(--sf-bg-control)' }}>
      <line x1={toX(-maxRange)} y1={toY(0)} x2={toX(maxRange)} y2={toY(0)}
        stroke="var(--sf-border)" strokeWidth={0.5} />
      <line x1={toX(0)} y1={toY(-maxRange)} x2={toX(0)} y2={toY(maxRange)}
        stroke="var(--sf-border)" strokeWidth={0.5} />
      {noisyPoints.map((p, idx) => (
        <circle key={idx} cx={toX(p.i)} cy={toY(p.q)} r={1}
          fill="var(--sf-accent-blue)" opacity={0.35} />
      ))}
      {idealPoints.map((p, idx) => (
        <circle key={`i-${idx}`} cx={toX(p.i)} cy={toY(p.q)} r={3.5}
          fill="none" stroke="var(--sf-accent-green)" strokeWidth={1.5} />
      ))}
    </svg>
  )
}

export function ModulationPanel() {
  const state = useModulationState()
  const { openTab } = useTabManager()

  return (
    <div className="flex flex-col gap-3 p-3"
      style={{
        width: 280,
        backgroundColor: 'var(--sf-bg-panel)',
        borderRight: '1px solid var(--sf-border)',
      }}>
      {/* Header */}
      <div className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--sf-text-dim)' }}>
        Modulation Explorer
      </div>

      {/* Type dropdown */}
      <div>
        <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>
          Modulation Type
        </div>
        <select
          value={state.modulationType}
          onChange={e => state.setModulationType(e.target.value as ModulationType)}
          className="w-full rounded text-[11px] px-1.5 py-1.5 outline-none cursor-pointer"
          style={{
            backgroundColor: 'var(--sf-bg-control)',
            border: '1px solid var(--sf-border)',
            color: 'var(--sf-accent-blue)',
          }}
        >
          {ALL_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Mini constellation */}
      <div className="rounded overflow-hidden"
        style={{ border: '1px solid var(--sf-border)' }}>
        {state.isDigital ? (
          <MiniConstellation
            width={250} height={200}
            idealPoints={state.idealPoints}
            noisyPoints={state.constellationPoints}
          />
        ) : (
          <svg width={250} height={200} style={{ backgroundColor: 'var(--sf-bg-control)' }}>
            <text x={125} y={100} fill="var(--sf-text-dim)" fontSize={10}
              textAnchor="middle" dominantBaseline="middle">
              Analog - no constellation
            </text>
          </svg>
        )}
      </div>

      {/* SNR slider */}
      <div>
        <div className="text-[9px] mb-0.5 flex justify-between"
          style={{ color: 'var(--sf-text-dim)' }}>
          <span>SNR</span>
          <span style={{ color: 'var(--sf-accent-blue)' }}>{state.snr} dB</span>
        </div>
        <input type="range" min={0} max={40} step={1} value={state.snr}
          onChange={e => state.setSnr(Number(e.target.value))}
          className="w-full accent-[var(--sf-accent-blue)]" />
      </div>

      {/* Info line */}
      {state.isDigital && (
        <div className="text-[10px] flex justify-between"
          style={{ color: 'var(--sf-text-muted)' }}>
          <span>{state.bitsPerSymbol} bits/sym</span>
          <span>{state.idealPoints.length} points</span>
        </div>
      )}

      {/* Send to Analyzer */}
      <button
        className="mt-auto rounded py-1.5 text-[11px] font-medium transition-colors"
        style={{
          backgroundColor: 'var(--sf-bg-control)',
          border: '1px solid var(--sf-border)',
          color: 'var(--sf-text-muted)',
        }}
        onClick={() => openTab('analyzer')}
      >
        Send to Analyzer
      </button>
    </div>
  )
}
