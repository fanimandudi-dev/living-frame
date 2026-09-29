import type { ScriptStep } from './scripted-detector.service';

/**
 * Scénario de démonstration (sans caméra) :
 * une personne entre dans le champ, s'approche, contemple l'œuvre, puis s'éloigne.
 *
 * Calibré pour les timings par défaut (voir interaction-state.ts).
 * Trace attendue avec ces valeurs :
 *   t+0,8 s  entrée (FAR)      → présence confirmée à ~1,4 s → APPROACH
 *   t+2,6 s  approche (NEAR)   → ENGAGED (délai + proximité réunis)
 *   t+5 s    HOLD              → message visible (plancher minimal 5 s)
 *   t+14 s   départ            → le message a persisté tant que la personne était là
 *   t+15,2 s RESET             → absence confirmée → fondu de retour
 *   t+17,2 s IDLE              → réarmement, puis le script reboucle
 *
 * Utilisé par /preview (lecture automatique) et /frame?demo=1.
 */
export const DEMO_SCRIPT: readonly ScriptStep[] = [
  { afterMs: 0, present: false, distance: null }, // galerie vide
  { afterMs: 800, present: true, distance: 'FAR' }, // entrée dans le champ
  { afterMs: 2600, present: true, distance: 'NEAR' }, // s'approche
  { afterMs: 4200, present: true, distance: 'VERY_NEAR' }, // contemple
  { afterMs: 14000, present: false, distance: null }, // s'éloigne
];
