/**
 * MISE EN SCÈNE (V1, 30/09/2026) — le cadre devient une scène chorégraphiée.
 *
 * Une scène décrit le DÉROULÉ visuel d'une visite : phases en millisecondes,
 * relatives à l'entrée en ENGAGED — le calme, le balayage de lumière, le
 * halo, la naissance du message. Les effets concrets (lumière, particules,
 * brume) sont réalisés par l'Animation Engine ; la scène reste de la
 * CONFIGURATION, jamais du code. Ajouter une scène = ajouter un objet ici.
 */

/** Puissance des effets, choisie par l'organisateur dans le Studio. */
export type SceneIntensity = 'SUBTLE' | 'ELEGANT' | 'SPECTACULAR';

export interface SceneIntensityPreset {
  /** Opacité maximale du halo pendant la visite. */
  glowMax: number;
  /** Opacité du balayage de lumière. */
  sweepOpacity: number;
  /** Flou initial (px) de la naissance du message — plus grand = plus théâtral. */
  messageBlurPx: number;
}

export const INTENSITY_PRESETS: Record<SceneIntensity, SceneIntensityPreset> = {
  SUBTLE: { glowMax: 0.1, sweepOpacity: 0.07, messageBlurPx: 6 },
  ELEGANT: { glowMax: 0.2, sweepOpacity: 0.13, messageBlurPx: 10 },
  SPECTACULAR: { glowMax: 0.34, sweepOpacity: 0.22, messageBlurPx: 14 },
};

/** Libellés français pour le Studio. */
export const INTENSITY_LABELS: Record<SceneIntensity, string> = {
  SUBTLE: 'Subtil',
  ELEGANT: 'Élégant',
  SPECTACULAR: 'Spectaculaire',
};

/** Phases d'une scène, en millisecondes depuis l'entrée en ENGAGED. */
export interface ScenePhases {
  /** Le calme avant tout — le silence fait le luxe. */
  calmMs: number;
  /** La lumière traverse l'œuvre. */
  sweepAtMs: number;
  sweepMs: number;
  /** Le halo se lève derrière le sujet. */
  glowAtMs: number;
  glowMs: number;
  /** Naissance du message, puis de la ligne nominative. */
  messageAtMs: number;
  eventAtMs: number;
}

export interface LivingScene {
  id: string;
  /** Nom lisible, affiché dans le Studio. */
  label: string;
  phases: ScenePhases;
}

/** Scène signature — mariage : lumière dorée, émergence, message. */
export const GOLDEN_WELCOME: LivingScene = {
  id: 'golden-welcome',
  label: 'Golden Welcome',
  phases: {
    calmMs: 600,
    sweepAtMs: 600,
    sweepMs: 1800,
    glowAtMs: 1200,
    glowMs: 1400,
    messageAtMs: 3000,
    eventAtMs: 3800,
  },
};

/** Registre des scènes disponibles (une seule en V1-Étape A). */
export const SCENES: Record<string, LivingScene> = {
  [GOLDEN_WELCOME.id]: GOLDEN_WELCOME,
};
