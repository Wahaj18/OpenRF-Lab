import { useCallback, useRef } from 'react'
import type { Marker } from '../../hooks/useMarkers'

interface MarkerOverlayProps {
  width: number
  height: number
  markers: Marker[]
  startFreq: number
  stopFreq: number
  refLevel: number
  totalDbRange: number
  onMoveMarker: (id: string, frequency: number, amplitude: number) => void
  onContextMenu?: (id: string, x: number, y: number) => void
}

export function MarkerOverlay({
  width, height, markers, startFreq, stopFreq, refLevel, totalDbRange,
  onMoveMarker, onContextMenu,
}: MarkerOverlayProps) {
  const draggingRef = useRef<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const freqToX = (freq: number) => ((freq - startFreq) / (stopFreq - startFreq)) * width
  const dbToY = (db: number) => ((refLevel - db) / totalDbRange) * height
  const xToFreq = (x: number) => startFreq + (x / width) * (stopFreq - startFreq)
  const yToDb = (y: number) => refLevel - (y / height) * totalDbRange

  const handleMouseDown = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault(); draggingRef.current = id
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    onMoveMarker(draggingRef.current, xToFreq(e.clientX - rect.left), yToDb(e.clientY - rect.top))
  }, [onMoveMarker, xToFreq, yToDb])

  const handleMouseUp = useCallback(() => { draggingRef.current = null }, [])

  const handleRightClick = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault(); onContextMenu?.(id, e.clientX, e.clientY)
  }, [onContextMenu])

  const markerColor = (m: Marker) => {
    switch (m.type) {
      case 'normal': return '#ffcc00'
      case 'delta': return '#ff8c00'
      case 'band-power': return '#00e5ff'
      case 'ndb-bw': return '#ff6b6b'
    }
  }

  return (
    <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0"
      style={{ pointerEvents: 'none' }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {markers.map(m => {
        const x = freqToX(m.frequency)
        const y = dbToY(m.amplitude)
        const color = markerColor(m)
        if (x < 0 || x > width) return null

        return (
          <g key={m.id} style={{ pointerEvents: 'all', cursor: 'grab' }}>
            <line x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />

            {m.type === 'band-power' && m.bandwidthHz && (
              <rect x={freqToX(m.frequency - m.bandwidthHz / 2)} y={0}
                width={freqToX(m.frequency + m.bandwidthHz / 2) - freqToX(m.frequency - m.bandwidthHz / 2)}
                height={height} fill={color} opacity={0.05} stroke={color} strokeWidth={0.5} strokeOpacity={0.3} />
            )}

            <polygon points={`${x},${y} ${x - 5},${y - 10} ${x + 5},${y - 10}`} fill={color}
              onMouseDown={handleMouseDown(m.id)} onContextMenu={handleRightClick(m.id)} />

            <g transform={`translate(${x + 8}, ${Math.max(15, y - 5)})`}>
              <rect x={-2} y={-10} width={65} height={14} rx={2} fill="rgba(0,0,0,0.7)" stroke={color} strokeWidth={0.5} />
              <text x={2} y={0} fill={color} fontSize={9} fontWeight="bold">{m.id}</text>
              <text x={22} y={0} fill="#8892a4" fontSize={9}>{m.amplitude.toFixed(1)}</text>
            </g>

            {m.type === 'delta' && m.refMarkerId && (() => {
              const ref = markers.find(rm => rm.id === m.refMarkerId)
              if (!ref) return null
              return <line x1={freqToX(ref.frequency)} y1={dbToY(ref.amplitude)} x2={x} y2={y}
                stroke={color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.6} />
            })()}
          </g>
        )
      })}
    </svg>
  )
}
