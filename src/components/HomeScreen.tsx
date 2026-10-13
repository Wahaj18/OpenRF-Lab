import { ALL_TABS } from '../app/TabManager'

export function HomeScreen() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--sf-accent-blue)' }}>OpenRF-Lab</h1>
      <p className="mt-3 text-sm sm:text-base max-w-2xl leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>
        RF and DSP lessons on simulated signals. No hardware needed.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_TABS.map(t => (
          <a key={t.id} href={`#/${t.id}`}
            className="group flex gap-3 p-4 rounded-lg transition-colors hover:brightness-125"
            style={{ backgroundColor: 'var(--sf-bg-panel)', border: '1px solid var(--sf-border)' }}>
            <span aria-hidden className="text-2xl w-10 h-10 shrink-0 flex items-center justify-center rounded-md"
              style={{ backgroundColor: 'var(--sf-bg-control)', color: 'var(--sf-accent-blue)' }}>{t.icon}</span>
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--sf-text-primary)' }}>{t.label}</span>
              <span className="block mt-1 text-xs leading-relaxed" style={{ color: 'var(--sf-text-muted)' }}>{t.description}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
