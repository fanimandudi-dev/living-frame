/**
 * MISE EN SCÈNE (V1, 30/09/2026) — le cadre devient une scène chorégraphiée.
 *
 * Une scène décrit le DÉROULÉ visuel d'une visite : phases en millisecondes,
 * relatives à l'entrée en ENGAGED — le calme, la lumière, le halo, la
 * naissance du message — et sa MATIÈRE : palette de couleurs et style de
 * balayage. Les effets concrets (lumière, particules) sont réalisés par
 * l'Animation Engine ; la scène reste de la CONFIGURATION, jamais du code.
 * Ajouter une scène = ajouter un objet ici.
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

/** Style du balayage de lumière pendant l'entrée. */
export type SweepStyle = 'DIAGONAL' | 'RISE';

/** Palette d'une scène — les couleurs de sa lumière et de sa poussière. */
export interface ScenePalette {
  /** Cœur du halo (rgba). */
  glow: string;
  /** Extension diffuse du halo (rgba). */
  glowSoft: string;
  /** Couleur du balayage (rgba). */
  sweep: string;
  /** Teinte des particules (hex) — Étape B. */
  particles: string;
}

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
  /** Description courte pour le Studio (choix de l'organisateur). */
  description: string;
  sweepStyle: SweepStyle;
  palette: ScenePalette;
  phases: ScenePhases;
}

/** Scène signature — mariage : or chaleureux, balayage diagonal classique. */
export const GOLDEN_WELCOME: LivingScene = {
  id: 'golden-welcome',
  label: 'Golden Welcome',
  description: 'Or chaleureux, classique — mariage',
  sweepStyle: 'DIAGONAL',
  palette: {
    glow: 'rgba(255, 213, 142, 0.5)',
    glowSoft: 'rgba(255, 213, 142, 0.18)',
    sweep: 'rgba(255, 226, 168, 0.5)',
    particles: '#ffd58e',
  },
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

/**
 * Scène contemporaine — argent glacier : rideau de lumière qui se lève,
 * rythme plus vif, poussière d'argent. Pour les événements modernes
 * (corporate, hôtels, soirées).
 */
export const AURORA: LivingScene = {
  id: 'aurora',
  label: 'Aurora',
  description: 'Argent glacier, contemporain — moderne',
  sweepStyle: 'RISE',
  palette: {
    glow: 'rgba(186, 212, 255, 0.42)',
    glowSoft: 'rgba(186, 212, 255, 0.14)',
    sweep: 'rgba(224, 236, 255, 0.5)',
    particles: '#cfe0ff',
  },
  phases: {
    calmMs: 400,
    sweepAtMs: 400,
    sweepMs: 1600,
    glowAtMs: 1000,
    glowMs: 1200,
    messageAtMs: 2400,
    eventAtMs: 3050,
  },
};

/** Registre des scènes disponibles (le Studio les propose toutes). */
export const SCENES: Record<string, LivingScene> = {
  [GOLDEN_WELCOME.id]: GOLDEN_WELCOME,
  [AURORA.id]: AURORA,
};
