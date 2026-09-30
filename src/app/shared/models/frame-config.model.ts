import { GOLDEN_WELCOME } from './scene.model';
import type { Artwork } from './artwork.model';
import type { Scenario } from './scenario.model';

/** Métadonnées de l'événement (affichées dans le Studio, gabarit du message). */
export interface EventInfo {
  name: string;
  /** Format ISO « 2026-09-29 » — affichage Studio uniquement en V0. */
  date?: string;
  /** Métadonnée libre (non rendue dans le Frame en V0). */
  theme?: string;
}

/**
 * Configuration complète du cadre — l'unique source de vérité du produit.
 * `version` permettra les migrations de la configuration persistée (Phase 5).
 */
export interface FrameConfig {
  version: 1;
  event: EventInfo;
  artwork: Artwork;
  scenario: Scenario;
}

/**
 * Configuration par défaut embarquée (EF-15) : l'application doit être
 * démontrable sans aucune configuration préalable, avec une œuvre incluse.
 */
export const DEFAULT_FRAME_CONFIG: FrameConfig = {
  version: 1,
  event: {
    name: 'Mariage — démonstration',
    date: '2026-09-29',
    theme: 'Classique',
  },
  artwork: {
    id: 'demo-couple',
    name: 'Portrait des mariés — démonstration',
    idleImage: { source: 'asset', path: 'artworks/demo/idle.jpg' },
    // Défilé : la première photo porte la transformation, les suivantes
    // apparaissent en fondu pendant que la personne regarde.
    engagedImages: [
      { source: 'asset', path: 'artworks/demo/engaged.jpg' },
      { source: 'asset', path: 'artworks/demo/engaged-2.jpg' },
      { source: 'asset', path: 'artworks/demo/engaged-3.jpg' },
      { source: 'asset', path: 'artworks/demo/engaged-4.jpg' },
    ],
  },
  scenario: {
    id: 'welcome',
    name: 'Wedding Welcome',
    detectionEnabled: true, // sans effet avant la Phase 6 (aucune caméra)
    transformationEnabled: true,
    messageEnabled: true,
    engageDelayMs: 1200,
    holdDurationMs: 5000,
    resetDelayMs: 2000,
    message: 'Bienvenue dans notre histoire',
    // Mise en scène (V1) — scène visuelle + intensité des effets.
    sceneId: GOLDEN_WELCOME.id,
    intensity: 'ELEGANT',
  },
};
