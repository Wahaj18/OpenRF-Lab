import type { AntennaType } from '../../dsp/antenna';
import { useAntennaState } from './useAntennaState';

const ANTENNA_OPTIONS: { value: AntennaType; label: string }[] = [
  { value: 'dipole', label: 'Dipole' },
  { value: 'patch', label: 'Patch' },
  { value: 'horn', label: 'Horn' },
  { value: 'array', label: 'Array' },
];

interface MiniPolarPlotProps {
  pattern: Float64Array;
  angles: Float64Array;
  size: number;
}

function MiniPolarPlot({ pattern, angles, size }: MiniPolarPlotProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 24;
  const maxDb = 0;
  const minDb = -40;

  function dbToRadius(db: number): number {
    const normalized = (db - minDb) / (maxDb - minDb);
    return Math.max(0, normalized) * radius;
  }

  const points: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const db = Math.max(pattern[i], minDb);
    const r = dbToRadius(db);
    const angleRad = ((angles[i] - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  points.push('Z');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block mx-auto"
      role="img"
      aria-label="Antenna pattern mini polar plot"
    >
      <circle cx={cx} cy={cy} r={radius} fill="var(--sf-bg-primary, #0a0f1a)" stroke="var(--sf-border, #2a3040)" strokeWidth="1" />
      {[-10, -20, -30].map((db) => (
        <circle
          key={db}
          cx={cx}
          cy={cy}
          r={dbToRadius(db)}
          fill="none"
          stroke="var(--sf-border, #2a3040)"
          strokeWidth="0.5"
          strokeDasharray="3,3"
        />
      ))}
      <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="var(--sf-border, #2a3040)" strokeWidth="0.5" />
      <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="var(--sf-border, #2a3040)" strokeWidth="0.5" />
      <path
        d={points.join('')}
        fill="rgba(59, 130, 246, 0.15)"
        stroke="var(--sf-accent-blue, #3b82f6)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function AntennaPanel() {
  const state = useAntennaState();
  const { result } = state;

  return (
    <div
      className="flex flex-col gap-3 p-3 w-[280px]"
      style={{ color: 'var(--sf-text-primary, #e2e8f0)' }}
    >
      {/* Antenna type dropdown */}
      <label className="flex flex-col gap-1 text-sm">
        <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Antenna Type</span>
        <select
          value={state.antennaType}
          onChange={(e) => state.setAntennaType(e.target.value as AntennaType)}
          className="rounded px-2 py-1 text-sm"
          style={{
            backgroundColor: 'var(--sf-bg-control, #1e2536)',
            border: '1px solid var(--sf-border, #2a3040)',
            color: 'var(--sf-text-primary, #e2e8f0)',
          }}
        >
          {ANTENNA_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {/* Mini polar plot */}
      <MiniPolarPlot pattern={result.pattern} angles={result.angles} size={240} />

      {/* Metrics */}
      <div
        className="rounded-lg p-3 text-sm"
        style={{
          backgroundColor: 'var(--sf-bg-control, #1e2536)',
          border: '1px solid var(--sf-border, #2a3040)',
        }}
      >
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Beamwidth</dt>
          <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
            {result.beamwidthDeg.toFixed(1)}°
          </dd>
          <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Peak SLL</dt>
          <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
            {result.sidelobeLevel > -59.9 ? `${result.sidelobeLevel.toFixed(1)} dB` : 'none'}
          </dd>
          <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Gain</dt>
          <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
            {result.gain.toFixed(1)} dBi
          </dd>
        </dl>
      </div>
    </div>
  );
}
