import type { Signal } from '@angular/core';
import type { DistanceLevel } from '../interaction/interaction-state';

/**
 * CONTRAT ABSTRAIT DE DÉTECTION — le moteur métier ne connaît QUE ceci.
 *
 * C'est la frontière qui permettra de remplacer MediaPipe (Phase 6) par un
 * ESP32, un capteur PIR ou toute autre source, sans toucher au moteur
 * ni au renderer (exigence d'évolution matérielle du cahier des charges).
 *
 * Deux implémentations existent en V0 :
 * - ScriptedDetectorService : scénario temporel (Preview, démo, tests) ;
 * - MediaPipeDetectorService : vision par ordinateur locale (Phase 6).
 */

/** Statut du sous-système de détection — pilote les replis d'erreur (EF-17/EF-18). */
export type DetectionStatus =
  | 'IDLE' // pas démarré
  | 'STARTING' // initialisation en cours
  | 'RUNNING' // échantillons produits
  | 'DENIED' // permission caméra refusée
  | 'UNAVAILABLE' // pas de caméra disponible
  | 'ERROR'; // échec du détecteur (ex. modèle illisible)

/**
 * Un échantillon de présence, émis à chaque cycle d'analyse (~8 Hz en production).
 * Éphémère : jamais stocké, jamais transmis — simple fait brut horodaté.
 */
export interface PresenceSample {
  readonly present: boolean;
  /** Niveau de distance estimé ; null when personne n'est détectée. */
  readonly distance: DistanceLevel | null;
  /** Horodatage de l'échantillon (performance.now()). */
  readonly timestamp: number;
}

export interface DetectionAdapter {
  /** Initialise la source (caméra, modèle…). Rejette en cas d'échec. */
  start(): Promise<void>;
  /** Libère toutes les ressources (flux caméra notamment). */
  stop(): void;
  /** Statut courant — Signal pour une réactivité directe dans l'UI de repli. */
  readonly status: Signal<DetectionStatus>;
  /** Dernier échantillon émis (null avant le premier). */
  readonly lastSample: PresenceSample | null;
  /** Enregistre un auditeur d'échantillons ; retourne la fonction de désabonnement. */
  onSample(listener: (sample: PresenceSample) => void): () => void;
}
