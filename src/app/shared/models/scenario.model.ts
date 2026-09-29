/**
 * Scénario d'interaction : QUE fait le cadre, et avec quels réglages.
 * Il est volontairement indépendant de l'œuvre (quelle image) et du
 * capteur (comment la présence est détectée).
 *
 * V0 : un seul scénario éditorial (« welcome »). Le modèle est conçu pour
 * s'étendre (V1+) sans interpréteur de DSL en V0 — règle anti-sur-ingénierie.
 */
export type ScenarioId = 'welcome';

export interface Scenario {
  id: ScenarioId;
  /** Nom lisible, affiché dans le Studio. */
  name: string;

  // --- activations (EF-11, section Interaction du Studio)
  /** Faux → le cadre reste en IDLE permanent, sans capteur (Phase 6). */
  detectionEnabled: boolean;
  /** Faux → le calque engagé reste invisible ; le message suit son cours. */
  transformationEnabled: boolean;
  /** Faux → aucun message affiché. */
  messageEnabled: boolean;

  // --- timings exposés dans le Studio (EF-11, section Timing)
  /** Délai avant réaction (APPROACH → ENGAGED). */
  engageDelayMs: number;
  /** Durée MINIMALE du message (HOLD) — il persiste tant que la personne est présente. */
  holdDurationMs: number;
  /** Délai du fondu de retour (RESET). */
  resetDelayMs: number;

  // --- message
  /** Texte affiché pendant ENGAGED/HOLD. Ex. : « Bienvenue dans notre histoire ». */
  message?: string;
}
