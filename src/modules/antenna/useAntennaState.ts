import { useState, useMemo } from 'react';
import {
  type AntennaType,
  type TaperType,
  type AntennaResult,
  computeDipolePattern,
  computePatchPattern,
  computeHornPattern,
  computeArrayPattern,
} from '../../dsp/antenna';

export interface AntennaState {
  antennaType: AntennaType;
  setAntennaType: (t: AntennaType) => void;
  numElements: number;
  setNumElements: (n: number) => void;
  spacing: number;
  setSpacing: (s: number) => void;
  taperType: TaperType;
  setTaperType: (t: TaperType) => void;
  scanAngleDeg: number;
  setScanAngleDeg: (a: number) => void;
  sidelobeLevel: number;
  setSidelobeLevel: (s: number) => void;
  result: AntennaResult;
}

export function useAntennaState(): AntennaState {
  const [antennaType, setAntennaType] = useState<AntennaType>('array');
  const [numElements, setNumElements] = useState(8);
  const [spacing, setSpacing] = useState(0.5);
  const [taperType, setTaperType] = useState<TaperType>('uniform');
  const [scanAngleDeg, setScanAngleDeg] = useState(0);
  const [sidelobeLevel, setSidelobeLevel] = useState(-25);

  const result = useMemo<AntennaResult>(() => {
    switch (antennaType) {
      case 'dipole':
        return computeDipolePattern();
      case 'patch':
        return computePatchPattern();
      case 'horn':
        return computeHornPattern();
      case 'array':
        return computeArrayPattern({
          numElements,
          spacing,
          taperType,
          scanAngleDeg,
          sidelobeLevel,
        });
    }
  }, [antennaType, numElements, spacing, taperType, scanAngleDeg, sidelobeLevel]);

  return {
    antennaType,
    setAntennaType,
    numElements,
    setNumElements,
    spacing,
    setSpacing,
    taperType,
    setTaperType,
    scanAngleDeg,
    setScanAngleDeg,
    sidelobeLevel,
    setSidelobeLevel,
    result,
  };
}
