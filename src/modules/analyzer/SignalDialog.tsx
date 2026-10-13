import { useState, useEffect, useCallback, useRef } from 'react'
import type { SignalConfig, SignalType } from '../../dsp/types'

interface SignalDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signal: SignalConfig) => void
  onDelete?: (id: string) => void
  editSignal?: SignalConfig | null
}

const SIGNAL_TYPES: { value: SignalType; label: string }[] = [
  { value: 'cw', label: 'CW' },
  { value: 'noise', label: 'Noise' },
  { value: 'am', label: 'AM' },
  { value: 'fm', label: 'FM' },
  { value: 'bpsk', label: 'BPSK' },
  { value: 'qpsk', label: 'QPSK' },
  { value: 'qam16', label: 'QAM-16' },
  { value: 'qam64', label: 'QAM-64' },
  { value: 'chirp', label: 'Chirp' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'fhss', label: 'FHSS' },
]

const NOISE_TYPES = ['awgn', 'pink', 'brown'] as const
const FHSS_PATTERNS = ['sequential', 'random'] as const

function parseFrequency(input: string): number {
  const trimmed = input.trim()
  const match = trimmed.match(/^([\d.]+)\s*(GHz|MHz|kHz|Hz)?$/i)
  if (!match) {
    const num = parseFloat(trimmed)
    return isNaN(num) ? 0 : num
  }
  const value = parseFloat(match[1])
  if (isNaN(value)) return 0
  const unit = (match[2] || 'Hz').toLowerCase()
  switch (unit) {
    case 'ghz': return value * 1e9
    case 'mhz': return value * 1e6
    case 'khz': return value * 1e3
    default: return value
  }
}

function formatFrequency(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(3)} kHz`
  return `${hz} Hz`
}

function getDefaultParams(type: SignalType): Record<string, number | string | number[]> {
  switch (type) {
    case 'cw':
      return { frequency: 2.437e9, powerDbm: -20, phase: 0 }
    case 'noise':
      return { noiseType: 'awgn', powerDbm: -80 }
    case 'am': case 'fm':
      return { carrierFreq: 2.437e9, powerDbm: -20, bandwidth: 10e6, modulationIndex: 1 }
    case 'bpsk': case 'qpsk': case 'qam16': case 'qam64':
      return { carrierFreq: 2.437e9, powerDbm: -20, bandwidth: 10e6, modulationIndex: 1 }
    case 'chirp': case 'pulse':
      return { startFreq: 2.4e9, stopFreq: 2.5e9, powerDbm: -20, pulseWidth: 0.001, pri: 0.01 }
    case 'fhss':
      return { hopFrequencies: [2.412e9, 2.437e9, 2.462e9], dwellTime: 0.001, powerDbm: -20, pattern: 'sequential' }
    default:
      return { powerDbm: -20 }
  }
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--sf-bg-control)',
  border: '1px solid var(--sf-border)',
  color: 'var(--sf-text-primary)',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  color: 'var(--sf-text-muted)',
  fontSize: 11,
  marginBottom: 2,
  display: 'block',
}

export function SignalDialog({ isOpen, onClose, onSave, onDelete, editSignal }: SignalDialogProps) {
  const [signalType, setSignalType] = useState<SignalType>('cw')
  const [params, setParams] = useState<Record<string, number | string | number[]>>({})
  const [freqInputs, setFreqInputs] = useState<Record<string, string>>({})
  const [hopFreqInput, setHopFreqInput] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  const isEditing = !!editSignal

  useEffect(() => {
    if (!isOpen) return
    if (editSignal) {
      setSignalType(editSignal.type)
      setParams({ ...editSignal.params })
      const freqs: Record<string, string> = {}
      for (const [key, val] of Object.entries(editSignal.params)) {
        if ((key === 'frequency' || key === 'carrierFreq' || key === 'startFreq' || key === 'stopFreq') && typeof val === 'number') {
          freqs[key] = formatFrequency(val)
        }
      }
      setFreqInputs(freqs)
      if (Array.isArray(editSignal.params.hopFrequencies)) {
        setHopFreqInput((editSignal.params.hopFrequencies as number[]).map(f => formatFrequency(f)).join(', '))
      }
    } else {
      setSignalType('cw')
      const defaults = getDefaultParams('cw')
      setParams(defaults)
      setFreqInputs({ frequency: formatFrequency(defaults.frequency as number) })
      setHopFreqInput('')
    }
  }, [isOpen, editSignal])

  const handleTypeChange = useCallback((type: SignalType) => {
    setSignalType(type)
    const defaults = getDefaultParams(type)
    setParams(defaults)
    const freqs: Record<string, string> = {}
    for (const [key, val] of Object.entries(defaults)) {
      if ((key === 'frequency' || key === 'carrierFreq' || key === 'startFreq' || key === 'stopFreq') && typeof val === 'number') {
        freqs[key] = formatFrequency(val)
      }
    }
    setFreqInputs(freqs)
    if (Array.isArray(defaults.hopFrequencies)) {
      setHopFreqInput((defaults.hopFrequencies as number[]).map(f => formatFrequency(f)).join(', '))
    } else {
      setHopFreqInput('')
    }
  }, [])

  const updateParam = useCallback((key: string, value: number | string | number[]) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleFreqChange = useCallback((key: string, text: string) => {
    setFreqInputs(prev => ({ ...prev, [key]: text }))
  }, [])

  const handleFreqBlur = useCallback((key: string) => {
    const hz = parseFrequency(freqInputs[key] || '0')
    updateParam(key, hz)
    setFreqInputs(prev => ({ ...prev, [key]: formatFrequency(hz) }))
  }, [freqInputs, updateParam])

  const handleSave = useCallback(() => {
    // Parse any pending frequency inputs
    const finalParams = { ...params }
    for (const [key, text] of Object.entries(freqInputs)) {
      finalParams[key] = parseFrequency(text)
    }
    if (signalType === 'fhss') {
      finalParams.hopFrequencies = hopFreqInput
        .split(',')
        .map(s => parseFrequency(s.trim()))
        .filter(f => f > 0)
    }

    const signal: SignalConfig = {
      id: editSignal?.id || `sig-${Date.now()}`,
      enabled: editSignal?.enabled ?? true,
      type: signalType,
      params: finalParams,
    }
    onSave(signal)
    onClose()
  }, [params, freqInputs, hopFreqInput, signalType, editSignal, onSave, onClose])

  const handleDelete = useCallback(() => {
    if (editSignal && onDelete) {
      onDelete(editSignal.id)
      onClose()
    }
  }, [editSignal, onDelete, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const renderFreqInput = (key: string, label: string) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        value={freqInputs[key] || ''}
        onChange={e => handleFreqChange(key, e.target.value)}
        onBlur={() => handleFreqBlur(key)}
        placeholder="e.g. 2.437 GHz"
      />
    </div>
  )

  const renderNumberInput = (key: string, label: string, step?: number) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        style={inputStyle}
        value={typeof params[key] === 'number' ? params[key] : 0}
        step={step || 1}
        onChange={e => updateParam(key, parseFloat(e.target.value) || 0)}
      />
    </div>
  )

  const renderSelectInput = (key: string, label: string, options: readonly string[]) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        style={inputStyle}
        value={(params[key] as string) || options[0]}
        onChange={e => updateParam(key, e.target.value)}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt.toUpperCase()}</option>
        ))}
      </select>
    </div>
  )

  const renderParams = () => {
    const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

    switch (signalType) {
      case 'cw':
        return (
          <div style={grid}>
            {renderFreqInput('frequency', 'Frequency')}
            {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
            <div>
              <label style={labelStyle}>Phase (degrees)</label>
              <input
                type="number"
                style={inputStyle}
                value={typeof params.phase === 'number' ? Math.round(params.phase * 180 / Math.PI) : 0}
                step={1}
                onChange={e => updateParam('phase', (parseFloat(e.target.value) || 0) * Math.PI / 180)}
              />
            </div>
          </div>
        )

      case 'noise':
        return (
          <div style={grid}>
            {renderSelectInput('noiseType', 'Noise Type', NOISE_TYPES)}
            {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
          </div>
        )

      case 'am': case 'fm':
        return (
          <div style={grid}>
            {renderFreqInput('carrierFreq', 'Carrier Frequency')}
            {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
            {renderFreqInput('bandwidth', 'Bandwidth')}
            {renderNumberInput('modulationIndex', 'Modulation Index', 0.1)}
          </div>
        )

      case 'bpsk': case 'qpsk': case 'qam16': case 'qam64':
        return (
          <div style={grid}>
            {renderFreqInput('carrierFreq', 'Carrier Frequency')}
            {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
            {renderFreqInput('bandwidth', 'Bandwidth')}
          </div>
        )

      case 'chirp': case 'pulse':
        return (
          <div style={grid}>
            {renderFreqInput('startFreq', 'Start Frequency')}
            {renderFreqInput('stopFreq', 'Stop Frequency')}
            {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
            <div>
              <label style={labelStyle}>Pulse Width (ms)</label>
              <input
                type="number"
                style={inputStyle}
                value={typeof params.pulseWidth === 'number' ? params.pulseWidth * 1000 : 1}
                step={0.1}
                onChange={e => updateParam('pulseWidth', (parseFloat(e.target.value) || 0) / 1000)}
              />
            </div>
            <div>
              <label style={labelStyle}>PRI (ms)</label>
              <input
                type="number"
                style={inputStyle}
                value={typeof params.pri === 'number' ? params.pri * 1000 : 10}
                step={0.1}
                onChange={e => updateParam('pri', (parseFloat(e.target.value) || 0) / 1000)}
              />
            </div>
          </div>
        )

      case 'fhss':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Hop Frequencies (comma-separated, e.g. 2.412 GHz, 2.437 GHz)</label>
              <input
                style={inputStyle}
                value={hopFreqInput}
                onChange={e => setHopFreqInput(e.target.value)}
                placeholder="2.412 GHz, 2.437 GHz, 2.462 GHz"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Dwell Time (ms)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={typeof params.dwellTime === 'number' ? params.dwellTime * 1000 : 1}
                  step={0.1}
                  onChange={e => updateParam('dwellTime', (parseFloat(e.target.value) || 0) / 1000)}
                />
              </div>
              {renderNumberInput('powerDbm', 'Power (dBm)', 1)}
              {renderSelectInput('pattern', 'Pattern', FHSS_PATTERNS)}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit Signal' : 'Add Signal'}
        style={{
          backgroundColor: 'var(--sf-bg-panel)',
          border: '1px solid var(--sf-border)',
          borderRadius: 8,
          width: 450,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--sf-border)',
        }}>
          <span style={{ color: 'var(--sf-text-primary)', fontSize: 14, fontWeight: 600 }}>
            {isEditing ? 'Edit Signal' : 'Add Signal'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--sf-text-muted)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Signal type selector */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sf-border)' }}>
          <label style={labelStyle}>Signal Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {SIGNAL_TYPES.map(st => (
              <button
                key={st.value}
                onClick={() => handleTypeChange(st.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: signalType === st.value ? 'var(--sf-accent-blue)' : 'var(--sf-border)',
                  backgroundColor: signalType === st.value ? 'var(--sf-accent-blue)' : 'var(--sf-bg-control)',
                  color: signalType === st.value ? '#000' : 'var(--sf-text-muted)',
                  cursor: 'pointer',
                  fontWeight: signalType === st.value ? 600 : 400,
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter form */}
        <div style={{ padding: '16px' }}>
          {renderParams()}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '1px solid var(--sf-border)',
        }}>
          <div>
            {isEditing && onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: '1px solid var(--sf-marker-red)',
                  backgroundColor: 'transparent',
                  color: 'var(--sf-marker-red)',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--sf-border)',
                backgroundColor: 'var(--sf-bg-control)',
                color: 'var(--sf-text-muted)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--sf-accent-blue)',
                backgroundColor: 'var(--sf-accent-blue)',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
