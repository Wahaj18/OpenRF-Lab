import { useState, useCallback, useRef } from 'react'

interface ControlInputProps { label: string; value: string; onChange: (value: string) => void; readOnly?: boolean; dimmed?: boolean }

export function ControlInput({ label, value, onChange, readOnly, dimmed }: ControlInputProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback(() => {
    if (readOnly) return
    setEditValue(value); setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [readOnly, value])

  const commit = useCallback(() => { setEditing(false); onChange(editValue) }, [editValue, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }, [commit])

  return (
    <div>
      <div className="text-[9px] mb-0.5" style={{ color: 'var(--sf-text-dim)' }}>{label}</div>
      {editing ? (
        <input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
          onBlur={commit} onKeyDown={handleKeyDown} autoFocus
          aria-label={label}
          className="w-full rounded text-[11px] px-1.5 py-1 outline-none"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-accent-blue)', color: 'var(--sf-accent-blue)' }} />
      ) : (
        <div onClick={startEdit} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') startEdit() }}
          role="button" tabIndex={readOnly ? -1 : 0} aria-label={`${label}: ${value}`}
          className="rounded text-[11px] px-1.5 py-1 cursor-pointer"
          style={{ backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: dimmed ? 'var(--sf-text-muted)' : 'var(--sf-accent-blue)' }}>
          {value}
        </div>
      )}
    </div>
  )
}
