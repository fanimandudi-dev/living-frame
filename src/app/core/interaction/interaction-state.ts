/**
 * Types et constantes du moteur d'interaction (machine à états du cadre).
 *
 * Ces types font partie du vocabulaire partagé entre détection et moteur :
 * ils vivent donc dans core/interaction, au plus près de leur usage,
 * et non dans shared/models (réservé au domaine métier : œuvre, scénario…).
 */

/** Les 5 états obligatoires du cadre. */
export type FrameState = 'IDLE' | 'APPROACH' | 'ENGAGED' | 'HOLD' | 'RESET';

/** Niveaux de distance estimés devant le cadre (heuristique de détection). */
export type DistanceLevel = 'FAR' | 'NEAR' | 'VERY_NEAR';

/**
 * Paramètres temporels du moteur, en millisecondes.
 *
 * Les trois premiers délais sont exposés dans le Studio (EF-11) ;
 * les autres sont des constantes techniques surchargeables par la configuration.
 */
export interface InteractionTimings {
  /** Présence stable requise avant de quitter IDLE (anti-scintillement). Défaut : 600 ms. */
  presenceConfirmMs: number;
  /** Absence stable requise avant un retour (et le réarmement). Défaut : 1200 ms. */
  absenceConfirmMs: number;
  /** Délai avant réaction une fois la présence confirmée (Studio). Défaut : 1200 ms. */
  engageDelayMs: number;
  /** Durée de la transformation complète (fondu) puis de la phase ENGAGED. Défaut : 2000 ms. */
  engageTransitionMs: number;
  /** Durée d'affichage du message (Studio). Défaut : 5000 ms. */
  holdDurationMs: number;
  /** Durée du fondu de retour à l'œuvre initiale (Studio). Défaut : 2000 ms. */
  resetDelayMs: number;
}

/** Valeurs par défaut, calibrées pour la démonstration. */
export const DEFAULT_INTERACTION_TIMINGS: InteractionTimings = {
  presenceConfirmMs: 600,
  absenceConfirmMs: 1200,
  engageDelayMs: 1200,
  engageTransitionMs: 2000,
  holdDurationMs: 5000,
  resetDelayMs: 2000,
};

/** Ordre croissant de proximité — permet les comparaisons du type `distance >= NEAR`. */
export const DISTANCE_RANK: Readonly<Record<DistanceLevel, number>> = {
  FAR: 0,
  NEAR: 1,
  VERY_NEAR: 2,
};

/** Intensité du fondu vers l'œuvre engagée pendant APPROACH, par distance (EF-08). */
export const APPROACH_OPACITY: Readonly<Record<DistanceLevel, number>> = {
  FAR: 0.25,
  NEAR: 0.55,
  VERY_NEAR: 0.85,
};

/** Durée des petits fondus entre niveaux de distance pendant APPROACH. */
export const APPROACH_FADE_MS = 600;
