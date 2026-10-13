import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'

export type TabId = 'analyzer' | 'calculators' | 'waveform' | 'modulation' | 'filter' | 'channelizer' | 'antenna'
export type RouteId = 'home' | TabId

export interface TabDef {
  id: TabId
  label: string
  icon: string
  description: string
}

export const ALL_TABS: TabDef[] = [
  { id: 'analyzer', label: 'Spectrum Analyzer', icon: '▦', description: 'Spectrum, waterfall, markers and traces.' },
  { id: 'waveform', label: 'Waveform Designer', icon: '∿', description: 'Time and frequency views of common waveforms.' },
  { id: 'modulation', label: 'Modulation Explorer', icon: '◎', description: 'AM, FM and BPSK to 256-QAM.' },
  { id: 'filter', label: 'Filter Designer', icon: '⋈', description: 'Windowed FIR filter design.' },
  { id: 'channelizer', label: 'Polyphase Channelizer', icon: '☰', description: 'Polyphase filter bank channelization.' },
  { id: 'antenna', label: 'Antenna Pattern Viewer', icon: '⊛', description: 'Dipole, patch, horn and array patterns.' },
  { id: 'calculators', label: 'RF Calculators', icon: '⊞', description: 'Link budget, path loss, noise figure, EIRP.' },
]

const ROUTES = new Set<string>(['home', ...ALL_TABS.map(t => t.id)])

function routeFromHash(): RouteId {
  const id = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.has(id) ? (id as RouteId) : 'home'
}

interface TabManagerContextValue {
  activeTab: RouteId
  setActiveTab: (id: RouteId) => void
  /** Kept for modules that link to each other */
  openTab: (id: TabId) => void
}

const TabManagerContext = createContext<TabManagerContextValue>(null!)

export function useTabManager() {
  return useContext(TabManagerContext)
}

export function TabManagerProvider({ children }: { children: ReactNode }) {
  const [activeTab, setRoute] = useState<RouteId>(routeFromHash)

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setActiveTab = useCallback((id: RouteId) => {
    const next = `#/${id === 'home' ? '' : id}`
    if (window.location.hash !== next) window.location.hash = next
  }, [])

  const value = useMemo(() => ({ activeTab, setActiveTab, openTab: setActiveTab }), [activeTab, setActiveTab])
  return <TabManagerContext.Provider value={value}>{children}</TabManagerContext.Provider>
}
