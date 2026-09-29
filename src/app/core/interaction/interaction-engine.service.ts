import { Injectable, signal } from '@angular/core';
import type { DetectionAdapter, PresenceSample } from '../detection/detection-adapter';
import {
  DEFAULT_INTERACTION_TIMINGS,
  DISTANCE_RANK,
} from './interaction-state';
import type { DistanceLevel, FrameState, InteractionTimings } from './interaction-state';

type TransitionListener = (from: FrameState, to: FrameState) => void;

/**
 * MOTEUR D'INTERACTION — machine à états du cadre.
 *
 * PROBLÈME : la logique de transition IDLE → APPROACH → ENGAGED → HOLD → RESET
 * ne doit appartenir ni au composant visuel (non testable, couplée au rendu)
 * ni au détecteur (couplerait la caméra au scénario).
 *
 * DÉCISION : un service autonome qui
 *   1. s'abonne à N'IMPORTE QUEL DetectionAdapter (jamais à MediaPipe directement) ;
 *   2. applique l'anti-rebond de présence/absence (EF-06) ;
 *   3. exécute la table de transitions T1–T13 (PHASE-1-architecture.md §6.4) ;
 *   4. centralise et nettoie tous les timers (ENF-R2) ;
 *   5. expose l'état en Signals — le renderer ne fait que lire.
 *
 * Le moteur ne rend rien, ne connaît ni l'œuvre ni la caméra, et n'a aucune
 * dépendance DOM : il est testable unitairement avec un adaptateur factice
 * et des timers virtuels (tests TEST-01 / TEST-02).
 *
 * Politiques V0 validées (cahier des charges §17) :
 *   - « grâce »    : un départ pendant ENGAGED/HOLD n'interrompt pas le cycle (T7) ;
 *   - « mono-passe »: un nouveau cycle exige une absence confirmée (réarmement).
 */
@Injectable({ providedIn: 'root' })
export class InteractionEngineService {
  // ---------------------------------------------------------------- signaux
  private readonly _state = signal<FrameState>('IDLE');
  private readonly _distance = signal<DistanceLevel | null>(null);
  private readonly _personPresent = signal(false);
  private readonly _armed = signal(true);

  /** État courant de la machine à états. */
  readonly state = this._state.asReadonly();
  /** Dernier niveau de distance observé (null si personne). */
  readonly distance = this._distance.asReadonly();
  /** Vrai dès qu'un échantillon présent a été reçu (avant confirmation). */
  readonly personPresent = this._personPresent.asReadonly();
  /** Vrai si un nouveau cycle peut démarrer (politique mono-passe). */
  readonly armed = this._armed.asReadonly();

  // ------------------------------------------------------------- internes
  private timings: InteractionTimings = { ...DEFAULT_INTERACTION_TIMINGS };

  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly transitionListeners = new Set<TransitionListener>();

  /** Anti-rebond : début de la série continue courante de présence/absence. */
  private presentRunStart: number | null = null;
  private absentRunStart: number | null = null;

  /** Repère d'entrée en APPROACH, pour mesurer engageDelayMs. */
  private approachEnteredAt = 0;

  // ----------------------------------------------------------- cycle de vie
  /**
   * Branche le moteur sur un adaptateur de détection.
   * L'appelant reste propriétaire du cycle de vie de l'adaptateur
   * (start/stop) : le moteur se contente d'écouter.
   */
  attach(adapter: DetectionAdapter): void {
    this.detach();
    this.unsubscribe = adapter.onSample((sample) => this.onSample(sample));
  }

  /** Détache le moteur et remet la machine à zéro (caméra libérée par l'appelant). */
  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearTimer();
    this._state.set('IDLE');
    this._armed.set(true);
    this._personPresent.set(false);
    this._distance.set(null);
    this.presentRunStart = null;
    this.absentRunStart = null;
  }

  /** Remplace les timings par défaut (délais du Studio, EF-11). */
  applyTimings(timings: Partial<InteractionTimings>): void {
    this.timings = { ...this.timings, ...timings };
  }

  /**
   * Observabilité des transitions (journal du Preview, assertions de test).
   * Retourne la fonction de désabonnement.
   */
  onTransition(listener: TransitionListener): () => void {
    this.transitionListeners.add(listener);
    return () => {
      this.transitionListeners.delete(listener);
    };
  }

  // --------------------------------------------------------- commandes
  /**
   * Simulation uniquement (Preview, raccourcis Phase 3) : force un état
   * et exécute ses actions d'entrée (T12). Les timers en cours sont effacés
   * — sinon un timer fantôme déclencherait une transition ultérieure.
   */
  forceState(state: FrameState): void {
    this.setState(state);
  }

  /**
   * Réinitialisation organisateur (T13) : retour à IDLE et réarmement
   * immédiat — le scénario peut être rejoué même si quelqu'un est présent.
   */
  reset(): void {
    this.setState('IDLE');
    this._armed.set(true);
  }

  // ------------------------------------------------------------- traitement
  private onSample(sample: PresenceSample): void {
    const now = sample.timestamp;
    this._personPresent.set(sample.present);
    this._distance.set(sample.distance);

    // --- anti-rebond (EF-06) : une série continue démarre au premier
    // échantillon de son type ; tout échantillon contraire la remet à zéro.
    if (sample.present) {
      this.absentRunStart = null;
      if (this.presentRunStart === null) {
        this.presentRunStart = now;
      }
    } else {
      this.presentRunStart = null;
      if (this.absentRunStart === null) {
        this.absentRunStart = now;
      }
    }

    const presenceConfirmed =
      this.presentRunStart !== null &&
      now - this.presentRunStart >= this.timings.presenceConfirmMs;
    const absenceConfirmed =
      this.absentRunStart !== null &&
      now - this.absentRunStart >= this.timings.absenceConfirmMs;

    switch (this._state()) {
      case 'IDLE':
        if (presenceConfirmed) {
          if (this._armed()) {
            this.setState('APPROACH', now); // T1
          }
          // T2 — mono-passe : cycle déjà joué, on reste silencieux.
        } else if (absenceConfirmed) {
          this._armed.set(true); // réarmement (complément de T10)
        }
        break;

      case 'APPROACH':
        if (absenceConfirmed) {
          this.setState('RESET', now); // T5 : la personne est repartie trop tôt
        } else if (
          presenceConfirmed &&
          now - this.approachEnteredAt >= this.timings.engageDelayMs &&
          sample.distance !== null &&
          DISTANCE_RANK[sample.distance] >= DISTANCE_RANK.NEAR
        ) {
          this.setState('ENGAGED', now); // T3 : délai écoulé + proximité (D3)
        }
        // T4 : délai écoulé mais trop loin → on attend, à l'affût.
        break;

      case 'ENGAGED':
        // T6 : le timer de transition mène vers HOLD.
        // T7 — grâce : un départ n'interrompt pas le cycle.
        break;

      case 'HOLD':
        // T9 : le timer de durée mène vers RESET.
        // T7 — grâce : idem.
        break;

      case 'RESET':
        // T11 : on termine le fondu, aucune re-détection en plein retour.
        break;
    }
  }

  // --------------------------------------------------------- transitions
  /** Change d'état, notifie, puis exécute les actions d'entrée. */
  private setState(state: FrameState, now: number = performance.now()): void {
    const from = this._state();
    this.clearTimer();
    this._state.set(state);
    if (from !== state) {
      for (const listener of this.transitionListeners) {
        listener(from, state);
      }
    }
    this.enter(state, now);
  }

  /** Actions d'entrée de chaque état (timers, repères, réarmement). */
  private enter(state: FrameState, now: number): void {
    switch (state) {
      case 'IDLE':
        // T10 : à l'issue du fondu, si l'absence est déjà confirmée → réarmement.
        this.maybeArm(now);
        break;
      case 'APPROACH':
        this.approachEnteredAt = now;
        break;
      case 'ENGAGED':
        this._armed.set(false); // le cycle est consommé (mono-passe)
        this.schedule(this.timings.engageTransitionMs, () => this.setState('HOLD')); // T6
        break;
      case 'HOLD':
        this.schedule(this.timings.holdDurationMs, () => this.setState('RESET')); // T9
        break;
      case 'RESET':
        this.schedule(this.timings.resetDelayMs, () => this.setState('IDLE')); // T10
        break;
    }
  }

  /** Réarme la machine si l'absence est confirmée depuis assez longtemps. */
  private maybeArm(now: number): void {
    if (
      this.absentRunStart !== null &&
      now - this.absentRunStart >= this.timings.absenceConfirmMs
    ) {
      this._armed.set(true);
    }
  }

  // --------------------------------------------------------------- timers
  private schedule(delayMs: number, action: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(action, delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
