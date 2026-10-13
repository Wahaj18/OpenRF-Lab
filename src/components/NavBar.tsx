import { useEffect, useState } from 'react'
import { ALL_TABS, useTabManager, type RouteId } from '../app/TabManager'
import { useTheme } from '../app/ThemeProvider'
import { REPLAY_EVENT } from '../tour/Tour'

const NAV: { id: RouteId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  ...ALL_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon })),
]

export function NavBar() {
  const { activeTab } = useTabManager()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the drawer on any navigation, including the back button
  useEffect(() => {
    const close = () => setMenuOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  const linkStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--sf-bg-primary)' : 'transparent',
    color: active ? 'var(--sf-accent-blue)' : 'var(--sf-text-muted)',
    border: `1px solid ${active ? 'var(--sf-border)' : 'transparent'}`,
  })

  return (
    <header className="relative z-50 shrink-0"
      style={{ backgroundColor: 'var(--sf-bg-toolbar)', borderBottom: '1px solid var(--sf-border)' }}>
      <div className="flex items-center gap-2 px-2 h-12">
        <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
          className="lg:hidden w-11 h-11 flex items-center justify-center text-xl rounded cursor-pointer"
          style={{ color: 'var(--sf-text-primary)' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
        <a href="#/" className="font-semibold text-sm whitespace-nowrap px-1" style={{ color: 'var(--sf-accent-blue)' }}>
          OpenRF-Lab
        </a>

        <nav aria-label="Modules" className="hidden lg:flex gap-0.5 ml-3 min-w-0 overflow-x-auto">
          {NAV.map(n => (
            <a key={n.id} href={`#/${n.id === 'home' ? '' : n.id}`} aria-current={activeTab === n.id ? 'page' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs whitespace-nowrap transition-colors"
              style={linkStyle(activeTab === n.id)}>
              <span aria-hidden>{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>

        <span className="lg:hidden text-xs truncate" style={{ color: 'var(--sf-text-muted)' }}>
          {activeTab !== 'home' && NAV.find(n => n.id === activeTab)?.label}
        </span>

        {activeTab !== 'home' && (
          <button onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))} title="Tutorial" aria-label="Replay tutorial"
            className="ml-auto shrink-0 min-w-11 h-11 px-2 flex items-center justify-center gap-1 rounded cursor-pointer text-xs"
            style={{ color: 'var(--sf-text-muted)', border: '1px solid var(--sf-border)' }}>
            ?<span className="hidden sm:inline">Tutorial</span>
          </button>
        )}
        <button onClick={toggleTheme} title="Toggle theme" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className={`${activeTab === 'home' ? 'ml-auto ' : ''}shrink-0 w-11 h-11 flex items-center justify-center rounded cursor-pointer hover:opacity-80`}
          style={{ color: 'var(--sf-text-dim)' }}>
          {theme === 'dark' ? '☽' : '☀'}
        </button>
      </div>

      {menuOpen && (
        <>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-12 cursor-default" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <nav aria-label="Modules" className="lg:hidden fixed left-0 top-12 bottom-0 w-72 max-w-[85vw] overflow-y-auto py-2"
            style={{ backgroundColor: 'var(--sf-bg-panel)', borderRight: '1px solid var(--sf-border)' }}>
            {NAV.map(n => (
              <a key={n.id} href={`#/${n.id === 'home' ? '' : n.id}`} aria-current={activeTab === n.id ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 mx-2 px-3 min-h-11 rounded-md text-sm"
                style={linkStyle(activeTab === n.id)}>
                <span aria-hidden className="w-5 text-center">{n.icon}</span>{n.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </header>
  )
}
