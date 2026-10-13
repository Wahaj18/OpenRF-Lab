import { useState } from 'react'
import { formatFrequency, formatAmplitude } from '../../utils/format'
import type { Marker } from '../../hooks/useMarkers'

interface Props {
  markers: Marker[]
  onRemoveMarker?: (id: string) => void
  spectrumData?: Map<number, Float32Array>
  startFreq?: number
  span?: number
}

function computeNdbBandwidth(
  spectrum: Float32Array, startFreq: number, span: number, peakFreq: number, nDb: number,
): number | null {
  if (spectrum.length === 0) return null
  const binWidth = span / (spectrum.length - 1)
  const peakBin = Math.round((peakFreq - startFreq) / binWidth)
  if (peakBin < 0 || peakBin >= spectrum.length) return null
  const threshold = spectrum[peakBin] - nDb

  let leftFreq = startFreq
  for (let i = peakBin; i >= 0; i--) {
    if (spectrum[i] < threshold) {
      leftFreq = startFreq + i * binWidth
      break
    }
  }
  let rightFreq = startFreq + span
  for (let i = peakBin; i < spectrum.length; i++) {
    if (spectrum[i] < threshold) {
      rightFreq = startFreq + i * binWidth
      break
    }
  }
  return rightFreq - leftFreq
}

function computeBandPower(
  spectrum: Float32Array, startFreq: number, span: number, centerFreq: number, bandwidthHz: number,
): number | null {
  if (spectrum.length === 0) return null
  const binWidth = span / (spectrum.length - 1)
  const lowBin = Math.max(0, Math.floor((centerFreq - bandwidthHz / 2 - startFreq) / binWidth))
  const highBin = Math.min(spectrum.length - 1, Math.ceil((centerFreq + bandwidthHz / 2 - startFreq) / binWidth))
  if (lowBin >= highBin) return null

  let totalLinear = 0
  for (let i = lowBin; i <= highBin; i++) {
    totalLinear += Math.pow(10, spectrum[i] / 10)
  }
  return 10 * Math.log10(Math.max(totalLinear, 1e-15))
}

export function MarkerTable({ markers, onRemoveMarker, spectrumData, startFreq, span }: Props) {
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
                  <td className="px-1.5 py-1" style={{ color: dF ? '#ff8c00' : 'var(--sf-text-dim)' }}>{dF ? formatFrequency(Math.abs(dF)) : '—'}</td>
                  <td className="px-1.5 py-1" style={{ color: dA ? '#ff6b6b' : 'var(--sf-text-dim)' }}>{dA ? `${dA.toFixed(1)} dB` : '—'}</td>
                  <td className="px-1.5 py-1" style={{ color: 'var(--sf-text-muted)' }}>
                    {m.type === 'delta' && m.refMarkerId ? `Ref: ${m.refMarkerId}` : ''}
                    {m.type === 'band-power' && m.bandwidthHz && spectrumData && startFreq !== undefined && span ? (() => {
                      const spectrum = spectrumData.get(m.traceIndex)
                      if (!spectrum) return `BW: ${formatFrequency(m.bandwidthHz)}`
                      const power = computeBandPower(spectrum, startFreq, span, m.frequency, m.bandwidthHz)
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
