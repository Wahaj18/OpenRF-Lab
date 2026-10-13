import { useState } from 'react'
import { LinkBudget } from './LinkBudget'
import { FSPLCalc } from './FSPL'
import { UnitConversions } from './UnitConversions'
import { NoiseFigure } from './NoiseFigure'
import { EIRPCalc } from './EIRP'
import { FresnelZone } from './FresnelZone'
import { ThermalNoiseCalc } from './ThermalNoise'
import { WavelengthFreq } from './WavelengthFreq'
import { DbCalculator } from './DbCalculator'

const CALCS = [
  { id: 'link-budget', label: 'Link Budget', component: LinkBudget },
  { id: 'fspl', label: 'FSPL', component: FSPLCalc },
  { id: 'conversions', label: 'Unit Conversions', component: UnitConversions },
  { id: 'noise-figure', label: 'Noise Figure', component: NoiseFigure },
  { id: 'eirp', label: 'EIRP', component: EIRPCalc },
  { id: 'fresnel', label: 'Fresnel Zone', component: FresnelZone },
  { id: 'thermal', label: 'Thermal Noise', component: ThermalNoiseCalc },
  { id: 'wavelength', label: 'Wavelength / Freq', component: WavelengthFreq },
  { id: 'db-calc', label: 'dB Calculator', component: DbCalculator },
] as const

export function CalculatorsTab() {
  const [activeCalc, setActiveCalc] = useState<string>(CALCS[0].id)
  const ActiveComponent = CALCS.find(c => c.id === activeCalc)!.component

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Horizontal scrollable tabs on mobile, vertical sidebar on desktop */}
      <nav
        className="shrink-0 overflow-x-auto md:overflow-y-auto md:w-44 py-2"
        style={{ backgroundColor: 'var(--sf-bg-panel)', borderRight: '1px solid var(--sf-border)', borderBottom: '1px solid var(--sf-border)' }}
      >
        <div className="hidden md:block px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-dim)' }}>
          Calculators
        </div>
        <div className="flex md:flex-col">
          {CALCS.map(calc => (
            <button
              key={calc.id}
              onClick={() => setActiveCalc(calc.id)}
              className="whitespace-nowrap text-left px-3 py-2 text-xs cursor-pointer transition-colors md:w-full"
              style={{
                backgroundColor: activeCalc === calc.id ? 'var(--sf-bg-primary)' : 'transparent',
                color: activeCalc === calc.id ? 'var(--sf-accent-blue)' : 'var(--sf-text-muted)',
                borderLeft: activeCalc === calc.id ? '2px solid var(--sf-accent-blue)' : '2px solid transparent',
              }}
            >
              {calc.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        <ActiveComponent />
      </main>
    </div>
  )
}
