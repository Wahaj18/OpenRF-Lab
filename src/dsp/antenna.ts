export type AntennaType = 'dipole' | 'patch' | 'horn' | 'array';
export type TaperType = 'uniform' | 'taylor' | 'chebyshev';

export interface ArrayConfig {
  numElements: number;
  spacing: number;
  taperType: TaperType;
  scanAngleDeg: number;
  sidelobeLevel: number;
}

export interface AntennaResult {
  pattern: Float64Array;
  angles: Float64Array;
  beamwidthDeg: number;
  sidelobeLevel: number;
  directivity: number;
  gain: number;
}

const NUM_POINTS = 361;
const MIN_DB = -60;

function createAngles(): Float64Array {
  const angles = new Float64Array(NUM_POINTS);
  for (let i = 0; i < NUM_POINTS; i++) {
    angles[i] = i - 180; // -180 to +180
  }
  return angles;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function linearToDb(val: number): number {
  if (val <= 0) return MIN_DB;
  const db = 20 * Math.log10(val);
  return Math.max(db, MIN_DB);
}

function normalizePatternDb(patternLinear: Float64Array): Float64Array {
  let maxVal = 0;
  for (let i = 0; i < patternLinear.length; i++) {
    if (patternLinear[i] > maxVal) maxVal = patternLinear[i];
  }
  const patternDb = new Float64Array(patternLinear.length);
  if (maxVal === 0) {
    patternDb.fill(MIN_DB);
    return patternDb;
  }
  for (let i = 0; i < patternLinear.length; i++) {
    patternDb[i] = linearToDb(patternLinear[i] / maxVal);
  }
  return patternDb;
}

/** Index of the strongest point (first one on ties) within [lo, hi]. */
function peakIndex(patternDb: Float64Array, lo = 0, hi = patternDb.length - 1): number {
  let idx = lo;
  for (let i = lo + 1; i <= hi; i++) if (patternDb[i] > patternDb[idx]) idx = i;
  return idx;
}

/** -3 dB beamwidth of the main lobe, interpolating between angle samples. */
function computeBeamwidth(patternDb: Float64Array, angles: Float64Array, lo: number, hi: number): number {
  const peakIdx = peakIndex(patternDb, lo, hi);
  const threshold = patternDb[peakIdx] - 3;
  let left = angles[lo];
  for (let i = peakIdx; i > lo; i--) {
    if (patternDb[i - 1] < threshold) {
      left = angles[i] - ((patternDb[i] - threshold) / (patternDb[i] - patternDb[i - 1])) * (angles[i] - angles[i - 1]);
      break;
    }
  }
  let right = angles[hi];
  for (let i = peakIdx; i < hi; i++) {
    if (patternDb[i + 1] < threshold) {
      right = angles[i] + ((patternDb[i] - threshold) / (patternDb[i] - patternDb[i + 1])) * (angles[i + 1] - angles[i]);
      break;
    }
  }
  return right - left;
}

/**
 * Peak sidelobe relative to the main beam: the highest point outside the main
 * lobe, whose edges are the first nulls (local minima) either side of the peak.
 * Points listed in `exclude` (e.g. a dipole's second, identical lobe) are skipped.
 */
function computePeakSidelobe(patternDb: Float64Array, lo: number, hi: number, exclude: (i: number) => boolean = () => false): number {
  const peakIdx = peakIndex(patternDb, lo, hi);
  let l = peakIdx;
  while (l > lo && patternDb[l - 1] <= patternDb[l]) l--;
  let r = peakIdx;
  while (r < hi && patternDb[r + 1] <= patternDb[r]) r++;
  let maxSidelobe = MIN_DB;
  for (let i = lo; i <= hi; i++) {
    if ((i >= l && i <= r) || exclude(i)) continue;
    if (patternDb[i] > maxSidelobe) maxSidelobe = patternDb[i];
  }
  return maxSidelobe - patternDb[peakIdx];
}

/**
 * Directivity in dBi by integrating the power pattern over the sphere, for a
 * pattern that is rotationally symmetric about an axis. `axisAngle(theta)`
 * maps a plotted angle to the polar angle from that axis (0..pi); only plotted
 * angles in [0°, 180°] are used, so each direction is counted once.
 *   D = 2 / ∫0^π |F(ψ)|² sin ψ dψ   (F normalised to 1 at the peak)
 */
function integrateDirectivity(field: (psi: number) => number): number {
  const steps = 20000;
  let maxF = 0;
  const f2 = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const v = field((Math.PI * i) / steps);
    f2[i] = v * v;
    if (f2[i] > maxF) maxF = f2[i];
  }
  let integral = 0;
  for (let i = 0; i <= steps; i++) {
    const w = i === 0 || i === steps ? 0.5 : 1;
    integral += w * f2[i] * Math.sin((Math.PI * i) / steps);
  }
  integral *= Math.PI / steps;
  return 10 * Math.log10(2 / (integral / maxF));
}

function buildResult(
  patternLinear: Float64Array,
  angles: Float64Array,
  directivity: number,
  opts: { lo?: number; hi?: number; exclude?: (i: number) => boolean } = {},
): AntennaResult {
  const patternDb = normalizePatternDb(patternLinear);
  const lo = opts.lo ?? 0, hi = opts.hi ?? patternDb.length - 1;
  const beamwidthDeg = computeBeamwidth(patternDb, angles, lo, hi);
  const sll = computePeakSidelobe(patternDb, lo, hi, opts.exclude);
  return { pattern: patternDb, angles, beamwidthDeg, sidelobeLevel: sll, directivity, gain: directivity };
}

/** Half-wave dipole along the 0° axis: F(θ) = cos(π/2·cos θ) / sin θ. HPBW 78°, D = 1.64 (2.15 dBi). */
function halfWaveDipole(theta: number): number {
  const s = Math.sin(theta);
  if (Math.abs(s) < 1e-9) return 0;
  return Math.abs(Math.cos((Math.PI / 2) * Math.cos(theta)) / s);
}

export function computeDipolePattern(): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);
  for (let i = 0; i < NUM_POINTS; i++) pattern[i] = halfWaveDipole(degToRad(angles[i]));
  // Metrics on the 0..180° half; the other half is the mirror image.
  const lo = 180, hi = 360;
  return buildResult(pattern, angles, integrateDirectivity(halfWaveDipole), { lo, hi });
}

/** Patch modelled as cos θ over the front hemisphere, symmetric about boresight. */
function patchField(theta: number): number {
  return Math.abs(theta) <= Math.PI / 2 ? Math.cos(theta) : 0;
}

export function computePatchPattern(): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);
  for (let i = 0; i < NUM_POINTS; i++) pattern[i] = patchField(degToRad(angles[i]));
  return buildResult(pattern, angles, integrateDirectivity(patchField));
}

/** Gaussian beam, -3 dB (power) at ±beamwidth/2: F(θ) = exp(−ln2/2·(2θ/BW)²). */
export function computeHornPattern(beamwidthDeg: number = 20): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);
  const bw = degToRad(beamwidthDeg);
  const field = (theta: number) => Math.exp(-(Math.LN2 / 2) * ((2 * theta) / bw) ** 2);
  for (let i = 0; i < NUM_POINTS; i++) pattern[i] = field(degToRad(angles[i]));
  return buildResult(pattern, angles, integrateDirectivity(field));
}

/** Taylor (n̄ = 4) amplitude taper, same definition as scipy.signal.windows.taylor. */
export function computeTaylorWeights(n: number, sllDb: number, nbar = 4): Float64Array {
  const B = Math.pow(10, Math.abs(sllDb) / 20);
  const A = Math.acosh(B) / Math.PI;
  const s2 = (nbar * nbar) / (A * A + (nbar - 0.5) ** 2);
  const Fm: number[] = [];
  for (let m = 1; m < nbar; m++) {
    let numer = m % 2 === 1 ? 1 : -1;
    for (let k = 1; k < nbar; k++) numer *= 1 - (m * m) / s2 / (A * A + (k - 0.5) ** 2);
    let denom = 2;
    for (let k = 1; k < nbar; k++) if (k !== m) denom *= 1 - (m * m) / (k * k);
    Fm.push(numer / denom);
  }
  const W = (x: number) => {
    let w = 1;
    for (let m = 1; m < nbar; m++) w += 2 * Fm[m - 1] * Math.cos((2 * Math.PI * m * (x - n / 2 + 0.5)) / n);
    return w;
  };
  const scale = 1 / W((n - 1) / 2);
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) weights[i] = W(i) * scale;
  return weights;
}

/** Dolph-Chebyshev taper with every sidelobe at sllDb, same definition as scipy.signal.windows.chebwin. */
export function computeChebyshevWeights(n: number, sllDb: number): Float64Array {
  if (n < 2) return new Float64Array(n).fill(1);
  const order = n - 1;
  const beta = Math.cosh(Math.acosh(Math.pow(10, Math.abs(sllDb) / 20)) / order);
  const pRe = new Float64Array(n), pIm = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const x = beta * Math.cos((Math.PI * k) / n);
    let t: number;
    if (x > 1) t = Math.cosh(order * Math.acosh(x));
    else if (x < -1) t = (2 * (n % 2) - 1) * Math.cosh(order * Math.acosh(-x));
    else t = Math.cos(order * Math.acos(x));
    if (n % 2 === 1) { pRe[k] = t; }
    else { pRe[k] = t * Math.cos((Math.PI * k) / n); pIm[k] = t * Math.sin((Math.PI * k) / n); }
  }
  // Real part of the DFT
  const dft = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = 0; k < n; k++) {
      const a = (-2 * Math.PI * i * k) / n;
      acc += pRe[k] * Math.cos(a) - pIm[k] * Math.sin(a);
    }
    dft[i] = acc;
  }
  const w = new Float64Array(n);
  if (n % 2 === 1) {
    const h = (n + 1) / 2;
    for (let i = 0; i < h; i++) { w[h - 1 - i] = dft[i]; w[h - 1 + i] = dft[i]; }
  } else {
    const h = n / 2 + 1;
    for (let i = 1; i < h; i++) { w[h - 1 - i] = dft[i]; w[h - 2 + i] = dft[i]; }
  }
  let maxW = 0;
  for (let i = 0; i < n; i++) maxW = Math.max(maxW, w[i]);
  for (let i = 0; i < n; i++) w[i] /= maxW;
  return w;
}

/** Array factor magnitude of a uniform linear array of isotropic elements, θ from broadside. */
function arrayFactor(weights: Float64Array, spacing: number, scanRad: number, thetaRad: number): number {
  let re = 0, im = 0;
  for (let n = 0; n < weights.length; n++) {
    const phase = 2 * Math.PI * spacing * n * (Math.sin(thetaRad) - Math.sin(scanRad));
    re += weights[n] * Math.cos(phase);
    im += weights[n] * Math.sin(phase);
  }
  return Math.hypot(re, im);
}

export function computeArrayPattern(config: ArrayConfig): AntennaResult {
  const { numElements, spacing, taperType, scanAngleDeg, sidelobeLevel } = config;
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);
  const weights =
    taperType === 'taylor' ? computeTaylorWeights(numElements, sidelobeLevel) :
    taperType === 'chebyshev' ? computeChebyshevWeights(numElements, sidelobeLevel) :
    new Float64Array(numElements).fill(1);
  const scanRad = degToRad(scanAngleDeg);
  for (let i = 0; i < NUM_POINTS; i++) pattern[i] = arrayFactor(weights, spacing, scanRad, degToRad(angles[i]));
  // A linear array of isotropic elements is symmetric about its axis, so the
  // pattern from -90° to 90° holds every direction once; the back half mirrors it.
  // Directivity: ψ from the array axis, sin θ = cos ψ.
  const D = integrateDirectivity(psi => arrayFactor(weights, spacing, scanRad, Math.PI / 2 - psi));
  return buildResult(pattern, angles, D, { lo: 90, hi: 270 });
}
