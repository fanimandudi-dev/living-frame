import type {
  LivingScene,
  SceneIntensity,
} from '../../shared/models/scene.model';

/**
 * CHAMP DE PARTICULES (Étape B, 30/09/2026) — réglages purs de la poussière
 * lumineuse qui s'élève autour du portrait pendant la visite.
 *
 * Pur et sans dépendance : le composant de rendu (PixiJS) applique ces
 * réglages ; les tests les vérifient sans GPU.
 */
export interface ParticleFieldConfig {
  /** Nombre de particules à l'écran. */
  count: number;
  /** Teinte (hex « #rrggbb ») — vient de la palette de la scène. */
  tint: string;
  /** Vitesse verticale moyenne (px/s — négatif : la poussière monte). */
  riseSpeed: number;
  /** Rayon moyen du cœur lumineux (px). */
  radiusPx: number;
  /** Amplitude de dérive latérale (px). */
  driftPx: number;
}

/**
 * Réglages du champ selon l'intensité choisie par l'organisateur.
 * La teinte vient toujours de la scène (or pour Golden Welcome,
 * argent pour Aurora).
 */
export function particleFieldFor(
  intensity: SceneIntensity,
  scene: LivingScene,
): ParticleFieldConfig {
  const tint = scene.palette.particles;
  switch (intensity) {
    case 'SUBTLE':
      return { count: 22, tint, riseSpeed: -14, radiusPx: 3, driftPx: 24 };
    case 'ELEGANT':
      return { count: 46, tint, riseSpeed: -18, radiusPx: 4, driftPx: 32 };
    case 'SPECTACULAR':
      return { count: 90, tint, riseSpeed: -24, radiusPx: 5, driftPx: 42 };
  }
}
