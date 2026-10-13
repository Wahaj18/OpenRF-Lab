import { useState, useMemo } from 'react'
import { powerRatioToDb, dbToPowerRatio, voltageRatioToDb, dbToVoltageRatio } from '../../utils/rf-math'

interface DbEntry { id: number; value: number; sign: '+' | '-' }

let nextId = 1

export function DbCalculator() {
  const [entries, setEntries] = useState<DbEntry[]>([
    { id: nextId++, value: 20, sign: '+' },
    { id: nextId++, value: 3, sign: '+' },
    { id: nextId++, value: 6, sign: '-' },
  ])

  const [powerRatio, setPowerRatio] = useState(100)
  const [powerDb, setPowerDb] = useState(20)
  const [voltageRatio, setVoltageRatio] = useState(10)
  const [voltageDb, setVoltageDb] = useState(20)

  const dbSum = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.sign === '+' ? e.value : -e.value), 0)
  }, [entries])

  const updateEntry = (id: number, key: 'value' | 'sign', val: number | '+' | '-') => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [key]: val } : e))
  }
  const addEntry = () => setEntries(prev => [...prev, { id: nextId++, value: 0, sign: '+' }])
  const removeEntry = (id: number) => setEntries(prev => prev.filter(e => e.id !== id))

  const handlePowerRatio = (v: number) => {
    setPowerRatio(v)
    if (v > 0) setPowerDb(powerRatioToDb(v))
  }
  const handlePowerDb = (v: number) => {
    setPowerDb(v)
    setPowerRatio(dbToPowerRatio(v))
  }
  const handleVoltageRatio = (v: number) => {
    setVoltageRatio(v)
    if (v > 0) setVoltageDb(voltageRatioToDb(v))
  }
  const handleVoltageDb = (v: number) => {
    setVoltageDb(v)
    setVoltageRatio(dbToVoltageRatio(v))
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary)' }}>dB Calculator</h2>

      {/* Add/subtract section */}
      <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Add / Subtract dB Values</div>
        <div className="flex flex-col gap-1.5 mb-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              {i > 0 && (
                <select value={entry.sign}
                  onChange={e => updateEntry(entry.id, 'sign', e.target.value as '+' | '-')}
                  className="w-10 px-1 py-1 rounded text-xs outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: entry.sign === '+' ? 'var(--sf-accent-green)' : 'var(--sf-marker-red)' }}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
              )}
              {i === 0 && <span className="w-10 text-center text-xs" style={{ color: 'var(--sf-text-dim)' }}>&nbsp;</span>}
              <input type="number" value={entry.value} step={0.5}
                onChange={e => updateEntry(entry.id, 'value', parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--sf-text-dim)' }}>dB</span>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(entry.id)} className="text-[10px] cursor-pointer"
                  style={{ color: 'var(--sf-marker-red)' }}>x</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addEntry} className="text-xs py-1 px-3 rounded cursor-pointer"
            style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)', backgroundColor: 'var(--sf-bg-control)' }}>
            + Add
          </button>
          <span className="text-xs" style={{ color: 'var(--sf-text-dim)' }}>=</span>
          <span className="text-sm font-mono font-bold" style={{ color: 'var(--sf-accent-blue)' }}>{dbSum.toFixed(1)} dB</span>
          <span className="text-[10px]" style={{ color: 'var(--sf-text-dim)' }}>
            (power ratio: {dbToPowerRatio(dbSum).toFixed(4)})
          </span>
        </div>
      </div>

      {/* Power ratio */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Power Ratio ↔ dB</div>
          <div className="flex items-center gap-3">
            <label className="flex flex-col gap-1 text-xs flex-1">
              <span style={{ color: 'var(--sf-text-muted)' }}>Ratio</span>
              <input type="number" value={powerRatio} step="any"
                onChange={e => handlePowerRatio(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
            </label>
            <span className="text-sm mt-4" style={{ color: 'var(--sf-text-dim)' }}>⇄</span>
            <label className="flex flex-col gap-1 text-xs flex-1">
              <span style={{ color: 'var(--sf-text-muted)' }}>dB</span>
              <input type="number" value={powerDb} step="any"
                onChange={e => handlePowerDb(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
            </label>
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--sf-text-dim)' }}>dB = 10 * log10(ratio)</div>
        </div>

        {/* Voltage ratio */}
        <div className="p-3 rounded" style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-dim)' }}>Voltage Ratio ↔ dB</div>
          <div className="flex items-center gap-3">
            <label className="flex flex-col gap-1 text-xs flex-1">
              <span style={{ color: 'var(--sf-text-muted)' }}>Ratio</span>
              <input type="number" value={voltageRatio} step="any"
                onChange={e => handleVoltageRatio(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
            </label>
            <span className="text-sm mt-4" style={{ color: 'var(--sf-text-dim)' }}>⇄</span>
            <label className="flex flex-col gap-1 text-xs flex-1">
              <span style={{ color: 'var(--sf-text-muted)' }}>dB</span>
              <input type="number" value={voltageDb} step="any"
                onChange={e => handleVoltageDb(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 rounded text-xs outline-none"
                style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-accent-blue)' }} />
            </label>
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--sf-text-dim)' }}>dB = 20 * log10(ratio)</div>
        </div>
      </div>

      <details className="text-xs" style={{ color: 'var(--sf-text-muted)' }}>
        <summary className="cursor-pointer mb-1" style={{ color: 'var(--sf-accent-blue)' }}>Learn: Decibels</summary>
        <p className="mb-1">Decibels express ratios on a logarithmic scale, making it easy to add gains and losses:</p>
        <ul className="list-disc ml-4 text-[10px] space-y-0.5">
          <li>Power: dB = 10 * log10(P2/P1)</li>
          <li>Voltage: dB = 20 * log10(V2/V1)</li>
          <li>+3 dB = double power, +6 dB = double voltage</li>
          <li>+10 dB = 10x power, +20 dB = 100x power</li>
        </ul>
      </details>
    </div>
  )
}
