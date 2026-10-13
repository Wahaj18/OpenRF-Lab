interface Props {
  onAddMarker: () => void; onAddDelta: () => void; onPeakSearch: () => void
  onMarkerToCenter: () => void; onNdbBw: () => void; onBandPower: () => void; onClearAll: () => void
}

export function MarkerControls({ onAddMarker, onAddDelta, onPeakSearch, onMarkerToCenter, onNdbBw, onBandPower, onClearAll }: Props) {
  const btn = { backgroundColor: 'var(--sf-bg-control)', border: '1px solid var(--sf-border)', color: 'var(--sf-text-muted)' }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1 flex-wrap">
        <button onClick={onAddMarker} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={{ ...btn, borderColor: '#ffcc0044', color: '#ffcc00' }}>+ Marker</button>
        <button onClick={onAddDelta} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={btn}>+ Delta</button>
        <button onClick={onPeakSearch} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={btn}>Peak Search</button>
      </div>
      <div className="flex gap-1 flex-wrap">
        <button onClick={onMarkerToCenter} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={btn}>Mkr→Center</button>
        <button onClick={onNdbBw} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={btn}>N dB BW</button>
        <button onClick={onBandPower} className="rounded text-[10px] px-2 py-1 cursor-pointer" style={btn}>Band Pwr</button>
      </div>
      <button onClick={onClearAll} className="rounded text-[10px] px-2 py-1 cursor-pointer w-full" style={btn}>Clear All Markers</button>
    </div>
  )
}
