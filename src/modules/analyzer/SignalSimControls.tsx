import type { SignalConfig } from '../../dsp/types'

interface Props {
  signals: SignalConfig[]; onToggleSignal: (id: string) => void
  onAddSignal: () => void; onEditSignal: (id: string) => void; onLoadPreset: () => void
}

export function SignalSimControls({ signals, onToggleSignal, onAddSignal, onEditSignal, onLoadPreset }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {signals.map(sig => (
        <div key={sig.id} className="flex items-center gap-1.5 rounded px-1.5 py-1"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sig.enabled ? 'var(--sf-accent-green)' : 'var(--sf-marker-red)' }} />
          <button onClick={() => onToggleSignal(sig.id)} className="flex-1 text-left text-[10px] cursor-pointer bg-transparent border-none"
            style={{ color: sig.enabled ? 'var(--sf-text-primary)' : 'var(--sf-text-dim)' }}>
            {sig.type.toUpperCase()} — {sig.params.frequency ? `${((sig.params.frequency as number) / 1e6).toFixed(1)} MHz` : sig.type}
          </button>
          <button onClick={() => onEditSignal(sig.id)} className="text-[10px] cursor-pointer bg-transparent border-none" style={{ color: 'var(--sf-text-dim)' }}>✎</button>
        </div>
      ))}
      <div className="flex gap-1">
        <button onClick={onAddSignal} className="flex-1 rounded text-[10px] px-2 py-1 cursor-pointer"
          style={{ backgroundColor: 'var(--sf-accent-green)', color: '#000', border: '1px solid var(--sf-accent-green)' }}>+ Signal</button>
        <button onClick={onLoadPreset} className="rounded text-[10px] px-2 py-1 cursor-pointer"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-text-muted)' }}>Presets</button>
      </div>
    </div>
  )
}
