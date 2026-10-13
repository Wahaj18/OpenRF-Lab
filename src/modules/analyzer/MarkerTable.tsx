import { useState } from 'react'
import { formatFrequency, formatAmplitude } from '../../utils/format'
import type { Marker } from '../../hooks/useMarkers'
import { computeBandPower, computeNdbBandwidth } from '../../dsp/markers'

interface Props {
  markers: Marker[]
  onRemoveMarker?: (id: string) => void
  spectrumData?: Map<number, Float32Array>
  startFreq?: number
  span?: number
  rbw?: number
}

export function MarkerTable({ markers, onRemoveMarker, spectrumData, startFreq, span, rbw }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  if (markers.length === 0) return null

  return (
    <div style={{ backgroundColor: 'var(--sf-bg-panel)', borderTop: '1px solid var(--sf-border)' }}>
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex justify-between px-3 py-1 text-[9px] font-semibold tracking-wider cursor-pointer"
        style={{ color: 'var(--sf-text-dim)', backgroundColor: 'transparent', border: 'none' }}>
        MARKER TABLE ({markers.length}) <span>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 overflow-x-auto">
          <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: 'var(--sf-text-dim)' }}>
              <th className="text-left px-1.5 py-1">Marker</th><th className="text-left px-1.5 py-1">Type</th>
              <th className="text-left px-1.5 py-1">Trace</th><th className="text-left px-1.5 py-1">Frequency</th>
              <th className="text-left px-1.5 py-1">Amplitude</th><th className="text-left px-1.5 py-1">Δ Freq</th>
              <th className="text-left px-1.5 py-1">Δ Ampl</th><th className="text-left px-1.5 py-1">Function</th>
              {onRemoveMarker && <th className="text-left px-1.5 py-1"></th>}
            </tr></thead>
            <tbody>{markers.map(m => {
              const ref = m.refMarkerId ? markers.find(r => r.id === m.refMarkerId) : null
              const dF = ref ? m.frequency - ref.frequency : null
              const dA = ref ? m.amplitude - ref.amplitude : null
              const typeColor = m.type === 'normal' ? '#ffcc00' : m.type === 'delta' ? '#ff8c00' : m.type === 'band-power' ? '#00e5ff' : '#ff6b6b'
              return (
                <tr key={m.id} style={{ borderTop: '1px solid var(--sf-bg-toolbar)' }}>
                  <td className="px-1.5 py-1 font-semibold" style={{ color: typeColor }}>{m.id}</td>
                  <td className="px-1.5 py-1" style={{ color: 'var(--sf-text-muted)' }}>{m.type}</td>
                  <td className="px-1.5 py-1">T{m.traceIndex + 1}</td>
                  <td className="px-1.5 py-1" style={{ color: 'var(--sf-accent-blue)' }}>{formatFrequency(m.frequency)}</td>
                  <td className="px-1.5 py-1" style={{ color: 'var(--sf-accent-blue)' }}>{formatAmplitude(m.amplitude)}</td>
                  <td className="px-1.5 py-1" style={{ color: dF !== null ? '#ff8c00' : 'var(--sf-text-dim)' }}>{dF !== null ? `${dF < 0 ? '−' : '+'}${formatFrequency(Math.abs(dF))}` : '—'}</td>
                  <td className="px-1.5 py-1" style={{ color: dA !== null ? '#ff6b6b' : 'var(--sf-text-dim)' }}>{dA !== null ? `${dA >= 0 ? '+' : ''}${dA.toFixed(1)} dB` : '—'}</td>
                  <td className="px-1.5 py-1" style={{ color: 'var(--sf-text-muted)' }}>
                    {m.type === 'delta' && m.refMarkerId ? `Ref: ${m.refMarkerId}` : ''}
                    {m.type === 'band-power' && m.bandwidthHz && spectrumData && startFreq !== undefined && span ? (() => {
                      const spectrum = spectrumData.get(m.traceIndex)
                      if (!spectrum) return `BW: ${formatFrequency(m.bandwidthHz)}`
                      const power = computeBandPower(spectrum, startFreq, span, m.frequency, m.bandwidthHz, rbw ?? span / 100)
                      return `${formatAmplitude(power ?? -999)} over ${formatFrequency(m.bandwidthHz)}`
                    })() : m.type === 'band-power' && m.bandwidthHz ? `BW: ${formatFrequency(m.bandwidthHz)}` : ''}
                    {m.type === 'ndb-bw' && spectrumData && startFreq !== undefined && span ? (() => {
                      const spectrum = spectrumData.get(m.traceIndex)
                      if (!spectrum) return `${m.nDb ?? 3}dB BW`
                      const bw = computeNdbBandwidth(spectrum, startFreq, span, m.frequency, m.nDb ?? 3)
                      return bw !== null ? `${m.nDb ?? 3}dB BW: ${formatFrequency(bw)}` : `${m.nDb ?? 3}dB BW: —`
                    })() : m.type === 'ndb-bw' ? `${m.nDb ?? 3}dB BW` : ''}
                  </td>
                  {onRemoveMarker && (
                    <td className="px-1.5 py-1">
                      <button onClick={() => onRemoveMarker(m.id)} aria-label={`Delete marker ${m.id}`}
                        className="opacity-40 hover:opacity-100 cursor-pointer text-[10px]"
                        style={{ color: 'var(--sf-text-muted)', background: 'none', border: 'none' }}>✕</button>
                    </td>
                  )}
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
