import { ALL_TABS, useTabManager } from '../app/TabManager'
import { useTheme } from '../app/ThemeProvider'

export function TabBar() {
  const { openTabs, activeTab, setActiveTab, closeTab } = useTabManager()
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="flex items-center px-2 select-none relative z-50 overflow-x-auto"
      style={{ backgroundColor: 'var(--sf-bg-toolbar)', borderBottom: '1px solid var(--sf-border)' }}
    >
      <div className="flex gap-0.5 py-1.5 shrink-0">
        {openTabs.map(id => {
          const tab = ALL_TABS.find(t => t.id === id)!
          const isActive = id === activeTab
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs whitespace-nowrap transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--sf-bg-primary)' : 'transparent',
                color: isActive ? 'var(--sf-accent-blue)' : 'var(--sf-text-dim)',
                border: isActive ? '1px solid var(--sf-border)' : '1px solid transparent',
                borderBottom: isActive ? '1px solid var(--sf-bg-primary)' : '1px solid transparent',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.closable && (
                <span
                  onClick={e => { e.stopPropagation(); closeTab(id) }}
                  className="ml-1 opacity-50 hover:opacity-100 cursor-pointer text-[10px]"
                >
                  ✕
                </span>
              )}
            </button>
          )
        })}

      </div>

      <div className="ml-auto flex gap-3 items-center text-xs" style={{ color: 'var(--sf-text-dim)' }}>
        <button onClick={toggleTheme} className="cursor-pointer hover:opacity-80" title="Toggle theme" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? '☽' : '☀'}
        </button>
      </div>
    </div>
  )
}
