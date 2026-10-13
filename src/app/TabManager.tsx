import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type TabId = 'analyzer' | 'calculators' | 'waveform' | 'modulation' | 'filter' | 'channelizer' | 'antenna'

export interface TabDef {
  id: TabId
  label: string
  icon: string
  closable: boolean
}

export const ALL_TABS: TabDef[] = [
  { id: 'analyzer', label: 'Spectrum Analyzer', icon: '▦', closable: false },
  { id: 'calculators', label: 'RF Calculators', icon: '⊞', closable: true },
  { id: 'waveform', label: 'Waveform Designer', icon: '∿', closable: true },
  { id: 'modulation', label: 'Modulation Explorer', icon: '◎', closable: true },
  { id: 'filter', label: 'Filter Designer', icon: '⋈', closable: true },
  { id: 'channelizer', label: 'Channelizer Demo', icon: '⫼', closable: true },
  { id: 'antenna', label: 'Antenna Pattern', icon: '⊛', closable: true },
]

interface TabManagerContextValue {
  openTabs: TabId[]
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  openTab: (id: TabId) => void
  closeTab: (id: TabId) => void
}

const TabManagerContext = createContext<TabManagerContextValue>(null!)

export function useTabManager() {
  return useContext(TabManagerContext)
}

export function TabManagerProvider({ children }: { children: ReactNode }) {
  const [openTabs, setOpenTabs] = useState<TabId[]>(ALL_TABS.map(t => t.id))
  const [activeTab, setActiveTab] = useState<TabId>('analyzer')

  const openTab = useCallback((id: TabId) => {
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id])
    setActiveTab(id)
  }, [])

  const closeTab = useCallback((id: TabId) => {
    const def = ALL_TABS.find(t => t.id === id)
    if (!def?.closable) return
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== id)
      setActiveTab(current => current === id ? next[next.length - 1] : current)
      return next
    })
  }, [])

  return (
    <TabManagerContext.Provider value={{ openTabs, activeTab, setActiveTab, openTab, closeTab }}>
      {children}
    </TabManagerContext.Provider>
  )
}
