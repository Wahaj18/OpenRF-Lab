import { ThemeProvider } from './app/ThemeProvider'
import { TabManagerProvider, useTabManager } from './app/TabManager'
import { SignalEngineProvider } from './hooks/useSignalEngine'
import { TabBar } from './components/TabBar'
import { AnalyzerTab } from './modules/analyzer/AnalyzerTab'
import { CalculatorsTab } from './modules/calculators/CalculatorsTab'
import { WaveformFull } from './modules/waveform/WaveformFull'
import { ModulationFull } from './modules/modulation/ModulationFull'
import { FilterFull } from './modules/filter/FilterFull'
import { ChannelizerFull } from './modules/channelizer/ChannelizerFull'
import AntennaFull from './modules/antenna/AntennaFull'

function AppContent() {
  const { activeTab } = useTabManager()

  return (
    <div className="h-screen flex flex-col" style={{
      backgroundColor: 'var(--sf-bg-primary)',
      border: '1px solid var(--sf-border)',
      boxSizing: 'border-box',
    }}>
      <TabBar />
      {activeTab === 'analyzer' ? (
        <AnalyzerTab />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'calculators' ? (
            <CalculatorsTab />
          ) : activeTab === 'waveform' ? (
            <WaveformFull />
          ) : activeTab === 'modulation' ? (
            <ModulationFull />
          ) : activeTab === 'filter' ? (
            <FilterFull />
          ) : activeTab === 'channelizer' ? (
            <ChannelizerFull />
          ) : activeTab === 'antenna' ? (
            <AntennaFull />
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--sf-text-muted)' }}>
              <span className="text-sm">{activeTab}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <TabManagerProvider>
        <SignalEngineProvider>
          <AppContent />
        </SignalEngineProvider>
      </TabManagerProvider>
    </ThemeProvider>
  )
}
