import { describe, it, expect } from 'vitest';
import { computeArrayPattern, computeDipolePattern } from '../../src/dsp/antenna';

describe('antenna patterns', () => {
  it('dipole has peak at broadside', () => {
    const result = computeDipolePattern();
    const peakIdx = result.pattern.indexOf(Math.max(...Array.from(result.pattern)));
    expect(Math.abs(result.angles[peakIdx])).toBeCloseTo(90, 0); // peak at ±90°
  });

  it('array pattern has correct number of points', () => {
    const result = computeArrayPattern({
      numElements: 8,
      spacing: 0.5,
      taperType: 'uniform',
      scanAngleDeg: 0,
      sidelobeLevel: -25,
    });
    expect(result.pattern.length).toBe(361);
    expect(result.angles.length).toBe(361);
  });

  it('more elements produces narrower beam', () => {
    const r4 = computeArrayPattern({
      numElements: 4,
      spacing: 0.5,
      taperType: 'uniform',
      scanAngleDeg: 0,
      sidelobeLevel: -25,
    });
    const r16 = computeArrayPattern({
      numElements: 16,
      spacing: 0.5,
      taperType: 'uniform',
      scanAngleDeg: 0,
      sidelobeLevel: -25,
    });
    expect(r16.beamwidthDeg).toBeLessThan(r4.beamwidthDeg);
  });

  it('directivity is positive', () => {
    const result = computeArrayPattern({
      numElements: 8,
      spacing: 0.5,
      taperType: 'uniform',
      scanAngleDeg: 0,
      sidelobeLevel: -25,
    });
    expect(result.directivity).toBeGreaterThan(0);
  });
});
