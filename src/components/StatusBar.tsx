interface Props {
  isRunning: boolean
  sweepCount: number
  onStart: () => void
  onStop: () => void
  onSingleSweep: () => void
}

const btnStyle: React.CSSProperties = {
  backgroundColor: 'var(--sf-bg-control)',
  border: '1px solid var(--sf-border)',
  color: 'var(--sf-text)',
  cursor: 'pointer',
  padding: '1px 8px',
  borderRadius: 3,
  fontSize: 11,
}

export function StatusBar({ isRunning, sweepCount, onStart, onStop, onSingleSweep }: Props) {
  return (
    <div className="flex gap-2 items-center ml-auto text-[11px] px-2" style={{ color: 'var(--sf-text-dim)' }}>
      {isRunning ? (
        <button style={{ ...btnStyle, color: 'var(--sf-marker-red)' }} onClick={onStop} aria-label="Stop simulation">
          ■ Stop
        </button>
      ) : (
        <button style={{ ...btnStyle, color: 'var(--sf-accent-green)' }} onClick={onStart} aria-label="Start simulation">
          ▶ Run
        </button>
      )}
      <button style={btnStyle} onClick={onSingleSweep} aria-label="Single sweep">
        Single
      </button>
      <span style={{ color: isRunning ? 'var(--sf-accent-green)' : 'var(--sf-marker-red)' }}>●</span>
      <span>{isRunning ? 'Running' : 'Stopped'}</span>
      <span>|</span>
      <span>Sweeps: {sweepCount}</span>
    </div>
  )
}
