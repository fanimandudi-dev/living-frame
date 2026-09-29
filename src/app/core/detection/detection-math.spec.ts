import {
  DISTANCE_THRESHOLDS,
  boxHeightRatio,
  distanceLevelFromRatio,
  largestBox,
} from './detection-math';
import type { DetectionBox } from './detection-math';

function box(height: number): DetectionBox {
  return { originX: 10, originY: 20, width: 60, height };
}

describe('detection-math', () => {
  it('largestBox — retourne le plus grand visage (personne principale)', () => {
    const boxes = [box(80), box(200), box(120)];
    expect(largestBox(boxes)?.height).toBe(200);
  });

  it('largestBox — liste vide → null', () => {
    expect(largestBox([])).toBeNull();
  });

  it('boxHeightRatio — hauteur de boîte relative à la vidéo', () => {
    expect(boxHeightRatio(box(160), 480)).toBeCloseTo(160 / 480);
  });

  it('boxHeightRatio — hauteur de vidéo inconnue → 0 (garde-fou)', () => {
    expect(boxHeightRatio(box(160), 0)).toBe(0);
  });

  it('distanceLevelFromRatio — les 3 niveaux aux seuils calibrés', () => {
    expect(distanceLevelFromRatio(0.5)).toBe('VERY_NEAR');
    expect(distanceLevelFromRatio(DISTANCE_THRESHOLDS.veryNearRatio)).toBe('VERY_NEAR');
    expect(distanceLevelFromRatio(DISTANCE_THRESHOLDS.veryNearRatio - 0.01)).toBe('NEAR');
    expect(distanceLevelFromRatio(DISTANCE_THRESHOLDS.nearRatio)).toBe('NEAR');
    expect(distanceLevelFromRatio(DISTANCE_THRESHOLDS.nearRatio - 0.01)).toBe('FAR');
    expect(distanceLevelFromRatio(0)).toBe('FAR');
  });
});
