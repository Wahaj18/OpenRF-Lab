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

function computeBeamwidth(patternDb: Float64Array, angles: Float64Array): number {
  // Find peak index
  let peakIdx = 0;
  let peakVal = patternDb[0];
  for (let i = 1; i < patternDb.length; i++) {
    if (patternDb[i] > peakVal) {
      peakVal = patternDb[i];
      peakIdx = i;
    }
  }

  const threshold = peakVal - 3;

  // Search left from peak
  let leftAngle = angles[0];
  for (let i = peakIdx; i >= 0; i--) {
    if (patternDb[i] < threshold) {
      // Interpolate
      if (i + 1 < patternDb.length) {
        const frac =
          (threshold - patternDb[i]) / (patternDb[i + 1] - patternDb[i]);
        leftAngle = angles[i] + frac * (angles[i + 1] - angles[i]);
      } else {
        leftAngle = angles[i];
      }
      break;
    }
  }

  // Search right from peak
  let rightAngle = angles[angles.length - 1];
  for (let i = peakIdx; i < patternDb.length; i++) {
    if (patternDb[i] < threshold) {
      if (i - 1 >= 0) {
        const frac =
          (threshold - patternDb[i]) / (patternDb[i - 1] - patternDb[i]);
        rightAngle = angles[i] + frac * (angles[i - 1] - angles[i]);
      } else {
        rightAngle = angles[i];
      }
      break;
    }
  }

  return Math.abs(rightAngle - leftAngle);
}

function computePeakSidelobe(
  patternDb: Float64Array,
  angles: Float64Array,
  beamwidthDeg: number,
  isOmnidirectional: boolean = false,
): number {
  let peakIdx = 0;
  let peakVal = patternDb[0];
  for (let i = 1; i < patternDb.length; i++) {
    if (patternDb[i] > peakVal) {
      peakVal = patternDb[i];
      peakIdx = i;
    }
  }

  const peakAngle = angles[peakIdx];
  const halfBw = beamwidthDeg / 2;
  const exclusionRadius = halfBw * 1.5;
  let maxSidelobe = MIN_DB;

  for (let i = 0; i < patternDb.length; i++) {
    const angleDiff = Math.abs(angles[i] - peakAngle);
    // Exclude the primary main lobe region
    if (angleDiff <= exclusionRadius) continue;
    // For omnidirectional/bidirectional patterns, also exclude the opposite main lobe
    if (isOmnidirectional) {
      const oppositeAngle = peakAngle > 0 ? peakAngle - 180 : peakAngle + 180;
      if (Math.abs(angles[i] - oppositeAngle) <= exclusionRadius) continue;
    }
    if (patternDb[i] > maxSidelobe) {
      maxSidelobe = patternDb[i];
    }
  }

  return maxSidelobe;
}

/**
 * Estimate directivity from a 2D pattern cut using the Kraus approximation:
 * D ≈ 41253 / (BW_az × BW_el), where both beamwidths are in degrees.
 * For a single-cut pattern, we assume a symmetric beam (BW_el = BW_az)
 * unless the pattern is omnidirectional in one plane.
 */
function computeDirectivityFromBeamwidth(beamwidthDeg: number, isOmnidirectional: boolean): number {
  if (beamwidthDeg <= 0) return 0;
  if (isOmnidirectional) {
    // Omnidirectional in one plane: D ≈ 101 / BW_el (Pozar approx for omni patterns)
    const directivityLinear = 101 / beamwidthDeg;
    return Math.max(linearToDb(directivityLinear), 0);
  }
  // Pencil beam: Kraus approximation D ≈ 41253 / (BW1 × BW2)
  const directivityLinear = 41253 / (beamwidthDeg * beamwidthDeg);
  return Math.max(linearToDb(directivityLinear), 0);
}

function buildResult(
  patternLinear: Float64Array,
  angles: Float64Array,
  isOmnidirectional: boolean = false,
): AntennaResult {
  const patternDb = normalizePatternDb(patternLinear);
  const beamwidthDeg = computeBeamwidth(patternDb, angles);
  const sll = computePeakSidelobe(patternDb, angles, beamwidthDeg, isOmnidirectional);
  const directivity = computeDirectivityFromBeamwidth(beamwidthDeg, isOmnidirectional);

  return {
    pattern: patternDb,
    angles,
    beamwidthDeg,
    sidelobeLevel: sll,
    directivity,
    gain: directivity, // lossless assumption
  };
}

export function computeDipolePattern(): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);

  for (let i = 0; i < NUM_POINTS; i++) {
    const thetaRad = degToRad(angles[i]);
    // Dipole: sin²(θ) envelope — peak at broadside (90°), nulls at endfire (0°, ±180°)
    // Uses sin² to give a smooth single-peak pattern centered at +90°
    const sinVal = Math.sin(thetaRad);
    // Weight toward front hemisphere to model a realistic forward-looking dipole
    const frontWeight = 1 + 0.001 * Math.sin(thetaRad);
    pattern[i] = Math.abs(sinVal) * frontWeight;
  }

  return buildResult(pattern, angles, true); // dipole is omnidirectional in azimuth
}

export function computePatchPattern(): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);

  for (let i = 0; i < NUM_POINTS; i++) {
    const thetaRad = degToRad(angles[i]);
    // Patch: cos(θ) in front hemisphere, zero in back
    if (Math.abs(angles[i]) <= 90) {
      pattern[i] = Math.cos(thetaRad);
    } else {
      pattern[i] = 0;
    }
  }

  return buildResult(pattern, angles);
}

export function computeHornPattern(beamwidthDeg: number = 20): AntennaResult {
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);
  const theta3dB = beamwidthDeg / 2;

  for (let i = 0; i < NUM_POINTS; i++) {
    const theta = angles[i];
    // Gaussian-like pattern
    pattern[i] = Math.exp(-2.77 * (theta / theta3dB) ** 2);
  }

  return buildResult(pattern, angles);
}

function computeTaylorWeights(n: number, sllDb: number): Float64Array {
  // Simplified Taylor window approximation
  // Uses a cosine-weighted approach scaled by desired SLL
  const weights = new Float64Array(n);
  const nbar = Math.max(
    2,
    Math.round(2 * Math.pow(10, -sllDb / 20)) // rough approximation
  );
  const a = Math.acosh(Math.pow(10, -sllDb / 20)) / Math.PI;

  for (let i = 0; i < n; i++) {
    let w = 1.0;
    for (let m = 1; m < nbar; m++) {
      w += 0.5 * Math.cos((2 * Math.PI * m * (i - (n - 1) / 2)) / n) *
        Math.exp(-((m * m) / (a * a * 2)));
    }
    weights[i] = Math.max(w, 0.001);
  }

  // Normalize
  let maxW = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] > maxW) maxW = weights[i];
  }
  for (let i = 0; i < n; i++) {
    weights[i] /= maxW;
  }

  return weights;
}

function computeChebyshevWeights(n: number, sllDb: number): Float64Array {
  // Dolph-Chebyshev weights via inverse DFT of Chebyshev polynomial
  const R = Math.pow(10, -sllDb / 20);
  const x0 = Math.cosh(Math.acosh(R) / (n - 1));
  const weights = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const angle = (Math.PI * k) / n;
      const arg = x0 * Math.cos(angle);
      // Chebyshev polynomial T_{n-1}(arg)
      let cheb: number;
      if (Math.abs(arg) <= 1) {
        cheb = Math.cos((n - 1) * Math.acos(arg));
      } else {
        cheb = Math.cosh((n - 1) * Math.acosh(Math.abs(arg)));
        if (arg < 0 && (n - 1) % 2 === 1) cheb = -cheb;
      }
      sum += cheb * Math.cos((2 * Math.PI * k * (i - (n - 1) / 2)) / n);
    }
    weights[i] = Math.abs(sum);
  }

  // Normalize
  let maxW = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] > maxW) maxW = weights[i];
  }
  if (maxW > 0) {
    for (let i = 0; i < n; i++) {
      weights[i] /= maxW;
    }
  }

  return weights;
}

export function computeArrayPattern(config: ArrayConfig): AntennaResult {
  const { numElements, spacing, taperType, scanAngleDeg, sidelobeLevel } =
    config;
  const angles = createAngles();
  const pattern = new Float64Array(NUM_POINTS);

  // Compute taper weights
  let weights: Float64Array;
  switch (taperType) {
    case 'taylor':
      weights = computeTaylorWeights(numElements, sidelobeLevel);
      break;
    case 'chebyshev':
      weights = computeChebyshevWeights(numElements, sidelobeLevel);
      break;
    default:
      weights = new Float64Array(numElements).fill(1);
  }

  const scanRad = degToRad(scanAngleDeg);

  for (let i = 0; i < NUM_POINTS; i++) {
    const thetaRad = degToRad(angles[i]);
    // Array factor: AF = Σ w_n * exp(j * n * 2π * d * (sin(θ) - sin(θ_scan)))
    let realSum = 0;
    let imagSum = 0;

    for (let n = 0; n < numElements; n++) {
      const phase =
        2 *
        Math.PI *
        spacing *
        n *
        (Math.sin(thetaRad) - Math.sin(scanRad));
      realSum += weights[n] * Math.cos(phase);
      imagSum += weights[n] * Math.sin(phase);
    }

    pattern[i] = Math.sqrt(realSum * realSum + imagSum * imagSum);
  }

  return buildResult(pattern, angles);
}
