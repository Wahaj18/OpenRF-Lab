import { useState, useMemo } from 'react'
import { cascadedNoiseFigure } from '../../utils/rf-math'

interface Stage { gain: number; nf: number }

export function NoiseFigure() {
  const [stages, setStages] = useState<Stage[]>([
    { gain: 20, nf: 1.5 },
    { gain: 15, nf: 6 },
    { gain: 10, nf: 12 },
  ])

  const updateStage = (idx: number, key: keyof Stage, val: number) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }
  const addStage = () => setStages(prev => [...prev, { gain: 10, nf: 5 }])
  const removeStage = (idx: number) => setStages(prev => prev.filter((_, i) => i !== idx))

  const totalNF = useMemo(() => cascadedNoiseFigure(stages), [stages])
  const noiseTemp = useMemo(() => 290 * (Math.pow(10, totalNF / 10) - 1), [totalNF])

  const cumulativeNFs = useMemo(() => {
    const result: number[] = []
    for (let i = 0; i < stages.length; i++) {
      result.push(cascadedNoiseFigure(stages.slice(0, i + 1)))
    }
    return result
  }, [stages])

  const chartW = 400
  const chartH = 160
  const barW = Math.min(50, (chartW - 60) / stages.length - 8)
  const maxNF = Math.max(...cumulativeNFs, 1)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>Cascaded Noise Figure</h2>

      <div className="flex flex-col gap-2 mb-4">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded"
            style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
            <span className="text-[10px] w-16" style={{ color: 'var(--sf-text-dim)' }}>Stage {i + 1}</span>
            <label className="flex items-center gap-1 text-xs">
              <span style={{ color: 'var(--sf-text-muted)' }}>Gain</span>
              <input type="number" value={stage.gain} step={0.5}
                onChange={e => updateStage(i, 'gain', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
              <span style={{ color: 'var(--sf-text-dim)' }}>dB</span>
            </label>
            <label className="flex items-center gap-1 text-xs">
              <span style={{ color: 'var(--sf-text-muted)' }}>NF</span>
              <input type="number" value={stage.nf} step={0.1}
                onChange={e => updateStage(i, 'nf', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
              <span style={{ color: 'var(--sf-text-dim)' }}>dB</span>
            </label>
            {stages.length > 1 && (
              <button onClick={() => removeStage(i)} className="text-[10px] cursor-pointer ml-auto"
                style={{ color: 'var(--sf-marker-red)' }}>Remove</button>
            )}
          </div>
        ))}
        <button onClick={addStage} className="text-xs py-1.5 px-3 rounded cursor-pointer self-start"
          style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)', backgroundColor: 'var(--sf-bg-control)' }}>
          + Add Stage
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>Cascaded NF</div>
          <div className="text-lg font-mono font-bold" style={{ color: 'var(--sf-accent-blue)' }}>{totalNF.toFixed(2)} dB</div>
        </div>
        <div className="p-2 rounded text-center" style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>System Noise Temp</div>
          <div className="text-lg font-mono font-bold" style={{ color: 'var(--sf-marker-yellow)' }}>{noiseTemp.toFixed(1)} K</div>
        </div>
      </div>

      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-dim)' }}>Cumulative NF per Stage</div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ maxWidth: chartW, height: 'auto' }}>
          {cumulativeNFs.map((nf, i) => {
            const x = 40 + i * (barW + 8)
            const h = (nf / maxNF) * (chartH - 40)
            return (
              <g key={i}>
                <rect x={x} y={chartH - 20 - h} width={barW} height={h} rx={2}
                  fill="var(--sf-accent-blue)" opacity={0.7} />
                <text x={x + barW / 2} y={chartH - 22 - h} textAnchor="middle" fontSize={9} fill="var(--sf-text-primary)">
                  {nf.toFixed(2)}
                </text>
                <text x={x + barW / 2} y={chartH - 6} textAnchor="middle" fontSize={9} fill="var(--sf-text-dim)">
                  S{i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Friis Noise Formula</summary>
        <p className="mb-1">The cascaded noise figure of a multi-stage receiver chain:</p>
        <p className="font-mono text-[10px]">F_total = F1 + (F2-1)/G1 + (F3-1)/(G1*G2) + ...</p>
        <p className="mt-1">The first stage dominates — a low-noise amplifier (LNA) with high gain at the front minimizes system NF.</p>
      </details>
    </div>
  )
}
