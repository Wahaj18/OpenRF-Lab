import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { TourStep } from './steps'

const PAD = 6
const storageKey = (id: string) => `openrf-tour:${id}`

/** Opens/closes the analyzer controls drawer on small screens so a step can point at it. */
export const CONTROLS_EVENT = 'openrf:controls'
/** Fired by the menu's "?" button to replay the tour for the current module. */
export const REPLAY_EVENT = 'openrf:tour-replay'

function readProgress(id: string): number | 'done' {
  try {
    const v = localStorage.getItem(storageKey(id))
    if (v === 'done') return 'done'
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 ? n : 0
  } catch { return 0 }
}

function saveProgress(id: string, v: number | 'done') {
  try { localStorage.setItem(storageKey(id), String(v)) } catch { /* storage unavailable */ }
}

export function Tour({ id, steps }: { id: string; steps: TourStep[] }) {
  const [index, setIndex] = useState<number | null>(() => {
    const p = readProgress(id)
    return p === 'done' ? null : Math.min(p, steps.length - 1)
  })
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = index === null ? null : steps[index]

  useEffect(() => {
    const replay = () => { saveProgress(id, 0); setIndex(0) }
    window.addEventListener(REPLAY_EVENT, replay)
    return () => window.removeEventListener(REPLAY_EVENT, replay)
  }, [id])

  // Open the controls drawer when a step needs it (no-op on desktop where it is always visible)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CONTROLS_EVENT, { detail: !!step?.controls }))
  }, [step])

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return }
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    const r = el?.getBoundingClientRect()
    setRect(r && r.width > 0 && r.height > 0 ? r : null)
  }, [step])

  useLayoutEffect(() => {
    if (!step) return
    const reveal = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
      el?.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'center' })
      measure()
    }
    const raf = requestAnimationFrame(reveal)
    const t = setTimeout(reveal, 250) // after the drawer has opened
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [step, measure])

  const go = (next: number | 'done') => {
    saveProgress(id, next)
    setIndex(next === 'done' ? null : next)
  }

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') go('done') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!step || index === null) return null
  const last = index === steps.length - 1
  const vw = window.innerWidth, vh = window.innerHeight
  const narrow = vw < 640

  // Card placement: docked to the bottom on phones, otherwise next to the target
  let cardStyle: React.CSSProperties
  // Phones: dock to the bottom, or to the top when the target sits in the lower part of the screen
  if (narrow) cardStyle = rect && rect.bottom > vh - 200 && rect.top > 240 ? { left: 8, right: 8, top: 56 } : { left: 8, right: 8, bottom: 8 }
  else if (!rect) cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 360 }
  else {
    const left = Math.min(Math.max(8, rect.left), vw - 368)
    if (rect.right + 380 < vw) cardStyle = { left: rect.right + 16, top: Math.min(Math.max(8, rect.top), vh - 220), width: 340 }
    else if (rect.bottom + 220 < vh) cardStyle = { left, top: rect.bottom + 12, width: 360 }
    else cardStyle = { left, top: Math.max(8, rect.top - 220), width: 360 }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      {rect ? (
        <div className="absolute rounded-md pointer-events-none transition-all duration-200"
          style={{
            left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', outline: '2px solid var(--sf-accent-blue)',
          }} />
      ) : <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />}

      <div className="absolute rounded-lg p-4 shadow-2xl" style={{ ...cardStyle, backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-accent-blue)' }}>
        <div className="text-[11px] tracking-wider" style={{ color: 'var(--sf-text-dim)' }}>STEP {index + 1} OF {steps.length}</div>
        <h2 className="mt-1 text-sm font-semibold" style={{ color: 'var(--sf-accent-blue)' }}>{step.title}</h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--sf-text-primary)' }}>{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => go('done')} className="min-h-11 px-3 text-xs rounded cursor-pointer" style={{ color: 'var(--sf-text-muted)' }}>Skip</button>
          <button onClick={() => go(index - 1)} disabled={index === 0}
            className="ml-auto min-h-11 px-4 text-xs rounded cursor-pointer disabled:opacity-30"
            style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-text-primary)' }}>Back</button>
          <button onClick={() => go(last ? 'done' : index + 1)} className="min-h-11 px-4 text-xs font-semibold rounded cursor-pointer"
            style={{ backgroundColor: 'var(--sf-accent-blue)', color: 'var(--sf-bg-primary)' }}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
