import React from 'react';
import type { AntennaType, TaperType } from '../../dsp/antenna';
import { useAntennaState } from './useAntennaState';

const ANTENNA_TYPES: { value: AntennaType; label: string }[] = [
  { value: 'dipole', label: 'Dipole' },
  { value: 'patch', label: 'Patch' },
  { value: 'horn', label: 'Horn' },
  { value: 'array', label: 'Array' },
];

const TAPER_TYPES: { value: TaperType; label: string }[] = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'taylor', label: 'Taylor' },
  { value: 'chebyshev', label: 'Chebyshev' },
];

const DESCRIPTIONS: Record<AntennaType, string> = {
  dipole:
    'A dipole antenna radiates with a sin(theta) pattern perpendicular to its axis. ' +
    'It has an omnidirectional pattern in the azimuthal plane with nulls along the antenna axis. ' +
    'The half-wave dipole has a directivity of approximately 2.15 dBi.',
  patch:
    'A microstrip patch antenna radiates primarily in the forward hemisphere with a cos(theta) pattern. ' +
    'Patch antennas are low-profile, lightweight, and commonly used in mobile devices, GPS receivers, ' +
    'and phased arrays. Typical directivity is 6-9 dBi.',
  horn:
    'A horn antenna provides a Gaussian-like radiation pattern with high directivity. ' +
    'Horns are commonly used as feeds for parabolic reflectors and as calibration standards. ' +
    'The beamwidth depends on the horn aperture dimensions and flare angle.',
  array:
    'A phased array combines multiple antenna elements with adjustable weights and phase shifts. ' +
    'The array factor determines the combined radiation pattern. Element spacing controls grating lobes, ' +
    'while tapering the amplitude weights reduces sidelobes at the cost of wider main beam. ' +
    'Electronic beam steering is achieved by applying a linear phase gradient across elements.',
};

interface PolarPlotProps {
  pattern: Float64Array;
  angles: Float64Array;
  size: number;
}

function PolarPlot({ pattern, angles, size }: PolarPlotProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 40;
  const dbRings = [-10, -20, -30];
  const maxDb = 0;
  const minDb = -40;

  function dbToRadius(db: number): number {
    const normalized = (db - minDb) / (maxDb - minDb);
    return Math.max(0, normalized) * radius;
  }

  // Build pattern path
  const points: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const db = Math.max(pattern[i], minDb);
    const r = dbToRadius(db);
    const angleRad = ((angles[i] - 90) * Math.PI) / 180; // rotate so 0° is at top
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  points.push('Z');

  const angleLabels = [
    { deg: 0, label: '0°' },
    { deg: 90, label: '90°' },
    { deg: 180, label: '180°' },
    { deg: 270, label: '270°' },
  ];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="block w-full h-auto max-w-[400px]"
      role="img"
      aria-label="Antenna radiation pattern polar plot"
    >
      {/* Background */}
      <circle cx={cx} cy={cy} r={radius} fill="var(--sf-bg-primary, #0a0f1a)" stroke="var(--sf-border, #2a3040)" strokeWidth="1" />

      {/* Concentric dB rings */}
      {dbRings.map((db) => (
        <React.Fragment key={db}>
          <circle
            cx={cx}
            cy={cy}
            r={dbToRadius(db)}
            fill="none"
            stroke="var(--sf-border, #2a3040)"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
          <text
            x={cx + 4}
            y={cy - dbToRadius(db) + 12}
            fill="var(--sf-text-muted, #8892a4)"
            fontSize="10"
          >
            {db} dB
          </text>
        </React.Fragment>
      ))}

      {/* Cross lines */}
      <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="var(--sf-border, #2a3040)" strokeWidth="0.5" />
      <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="var(--sf-border, #2a3040)" strokeWidth="0.5" />

      {/* Angle labels */}
      {angleLabels.map(({ deg, label }) => {
        const angleRad = ((deg - 90) * Math.PI) / 180;
        const labelR = radius + 18;
        return (
          <text
            key={deg}
            x={cx + labelR * Math.cos(angleRad)}
            y={cy + labelR * Math.sin(angleRad)}
            fill="var(--sf-text-muted, #8892a4)"
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {label}
          </text>
        );
      })}

      {/* Pattern trace */}
      <path
        d={points.join('')}
        fill="rgba(59, 130, 246, 0.15)"
        stroke="var(--sf-accent-blue, #3b82f6)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function AntennaFull() {
  const state = useAntennaState();
  const { result, antennaType } = state;

  return (
    <div className="flex flex-col gap-4 p-4" style={{ color: 'var(--sf-text-primary, #e2e8f0)' }}>
      {/* Antenna type selector */}
      <div className="flex gap-2" role="group" aria-label="Antenna type">
        {ANTENNA_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => state.setAntennaType(value)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              antennaType === value
                ? 'text-white'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor:
                antennaType === value
                  ? 'var(--sf-accent-blue, #3b82f6)'
                  : 'var(--sf-bg-control, #1e2536)',
              border: `1px solid ${
                antennaType === value
                  ? 'var(--sf-accent-blue, #3b82f6)'
                  : 'var(--sf-border, #2a3040)'
              }`,
              color: 'var(--sf-text-primary, #e2e8f0)',
            }}
            aria-pressed={antennaType === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row gap-6 flex-wrap">
        {/* Polar plot */}
        <div className="w-full md:w-auto md:flex-shrink-0">
          <PolarPlot pattern={result.pattern} angles={result.angles} size={400} />
        </div>

        {/* Controls and metrics */}
        <div className="flex flex-col gap-4 min-w-[240px]">
          {/* Metrics */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--sf-bg-control, #1e2536)',
              border: '1px solid var(--sf-border, #2a3040)',
            }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary, #e2e8f0)' }}>
              Pattern Metrics
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Beamwidth</dt>
              <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
                {result.beamwidthDeg.toFixed(1)}°
              </dd>
              <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Peak SLL</dt>
              <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
                {result.sidelobeLevel.toFixed(1)} dB
              </dd>
              <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Directivity</dt>
              <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
                {result.directivity.toFixed(1)} dBi
              </dd>
              <dt style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Gain</dt>
              <dd style={{ color: 'var(--sf-accent-green, #22c55e)' }}>
                {result.gain.toFixed(1)} dBi
              </dd>
            </dl>
          </div>

          {/* Array controls (only for array type) */}
          {antennaType === 'array' && (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'var(--sf-bg-control, #1e2536)',
                border: '1px solid var(--sf-border, #2a3040)',
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--sf-text-primary, #e2e8f0)' }}>
                Array Configuration
              </h3>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>
                    Elements: {state.numElements}
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={64}
                    step={1}
                    value={state.numElements}
                    onChange={(e) => state.setNumElements(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>
                    Spacing: {state.spacing.toFixed(2)}λ
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    value={state.spacing}
                    onChange={(e) => state.setSpacing(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>Taper</span>
                  <select
                    value={state.taperType}
                    onChange={(e) => state.setTaperType(e.target.value as TaperType)}
                    className="rounded px-2 py-1"
                    style={{
                      backgroundColor: 'var(--sf-bg-primary, #0a0f1a)',
                      border: '1px solid var(--sf-border, #2a3040)',
                      color: 'var(--sf-text-primary, #e2e8f0)',
                    }}
                  >
                    {TAPER_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>
                    Scan angle: {state.scanAngleDeg}°
                  </span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={state.scanAngleDeg}
                    onChange={(e) => state.setScanAngleDeg(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
                {state.taperType !== 'uniform' && (
                  <label className="flex flex-col gap-1 text-sm">
                    <span style={{ color: 'var(--sf-text-muted, #8892a4)' }}>
                      SLL target: {state.sidelobeLevel} dB
                    </span>
                    <input
                      type="range"
                      min={-50}
                      max={-10}
                      step={1}
                      value={state.sidelobeLevel}
                      onChange={(e) => state.setSidelobeLevel(Number(e.target.value))}
                      className="w-full"
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational section */}
      <div
        className="rounded-lg p-4 text-sm leading-relaxed"
        style={{
          backgroundColor: 'var(--sf-bg-control, #1e2536)',
          border: '1px solid var(--sf-border, #2a3040)',
          color: 'var(--sf-text-muted, #8892a4)',
        }}
      >
        <h3
          className="font-semibold mb-2"
          style={{ color: 'var(--sf-text-primary, #e2e8f0)' }}
        >
          About {ANTENNA_TYPES.find((t) => t.value === antennaType)?.label} Antennas
        </h3>
        <p>{DESCRIPTIONS[antennaType]}</p>
      </div>
    </div>
  );
}
