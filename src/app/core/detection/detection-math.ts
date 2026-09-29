import type { DistanceLevel } from '../interaction/interaction-state';

/**
 * MATHÉMATIQUES DE DÉTECTION — pures et testables sans caméra ni WASM.
 *
 * La distance est estimée par la taille du visage dans l'image (mono-caméra,
 * heuristique volontairement grossière — risque R5 assumé : 3 niveaux larges).
 */

/** Boîte englobante d'une détection (repère de la vidéo). */
export interface DetectionBox {
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Seuils de conversion hauteur-de-boîte / hauteur-vidéo → niveau de distance.
 * Calibrés pour une webcam 640×480 et un visiteur debout face au cadre —
 * à réajuster sur site (Phase 9) si nécessaire.
 */
export const DISTANCE_THRESHOLDS = {
  veryNearRatio: 0.32,
  nearRatio: 0.18,
} as const;

/**
 * La boîte de la « personne principale » : le plus grand visage détecté.
 * (V0 mono-visiteur — détection multi-personnes hors périmètre.)
 */
export function largestBox(boxes: readonly DetectionBox[]): DetectionBox | null {
  let best: DetectionBox | null = null;
  for (const box of boxes) {
    if (best === null || box.height > best.height) {
      best = box;
    }
  }
  return best;
}

/** Ratio hauteur de boîte / hauteur de vidéo (0 si dimensions inconnues). */
export function boxHeightRatio(box: DetectionBox, videoHeight: number): number {
  if (videoHeight <= 0) {
    return 0;
  }
  return box.height / videoHeight;
}

/** Convertit un ratio en niveau de distance (FAR / NEAR / VERY_NEAR). */
export function distanceLevelFromRatio(ratio: number): DistanceLevel {
  if (ratio >= DISTANCE_THRESHOLDS.veryNearRatio) {
    return 'VERY_NEAR';
  }
  if (ratio >= DISTANCE_THRESHOLDS.nearRatio) {
    return 'NEAR';
  }
  return 'FAR';
}
