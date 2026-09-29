import { Injectable, signal } from '@angular/core';
import type { DetectionStatus, DetectionAdapter, PresenceSample } from './detection-adapter';
import type { DistanceLevel } from '../interaction/interaction-state';

/**
 * Étape de scénario temporel : après `afterMs` mesurés depuis le démarrage,
 * l'état simulé devient { present, distance }.
 */
export interface ScriptStep {
  readonly afterMs: number;
  readonly present: boolean;
  readonly distance: DistanceLevel | null;
}

export interface ScriptedDetectorOptions {
  /** Rejouer le scénario en boucle (démo continue). */
  readonly loop?: boolean;
  /** Période d'émission des échantillons. Défaut : 250 ms. */
  readonly tickMs?: number;
  /** Pause après la dernière étape avant de reboucler. Défaut : 2000 ms. */
  readonly loopTailMs?: number;
}

/** État simulé par défaut, avant la première étape du script. */
const ABSENT_STEP: ScriptStep = { afterMs: 0, present: false, distance: null };

/**
 * Détecteur simulé : implémentation de `DetectionAdapter` SANS caméra.
 *
 * Trois usages :
 * - /preview : lecture automatique du cycle (EF-16) ;
 * - /frame?demo=1 : démonstration sans caméra (Phase 3) ;
 * - tests unitaires du moteur (ENF-T1).
 *
 * Le moteur d'interaction ne fait aucune différence entre ce détecteur
 * et le futur détecteur MediaPipe : c'est le contrat qui compte.
 */
@Injectable()
export class ScriptedDetector implements DetectionAdapter {
  private readonly _status = signal<DetectionStatus>('IDLE');
  readonly status = this._status.asReadonly();

  private _lastSample: PresenceSample | null = null;
  get lastSample(): PresenceSample | null {
    return this._lastSample;
  }

  private steps: readonly ScriptStep[] = [];
  private loop = false;
  private tickMs = 250;
  private loopTailMs = 2000;

  private handle: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private readonly listeners = new Set<(sample: PresenceSample) => void>();

  /** Définit le scénario à jouer. Interdit pendant l'exécution. */
  setScript(steps: readonly ScriptStep[], options: ScriptedDetectorOptions = {}): void {
    if (this.handle !== null) {
      throw new Error('ScriptedDetector : setScript interdit pendant l’exécution (stop() d’abord).');
    }
    if (steps.length === 0) {
      throw new Error('ScriptedDetector : le script doit contenir au moins une étape.');
    }
    this.steps = [...steps].sort((a, b) => a.afterMs - b.afterMs);
    this.loop = options.loop ?? false;
    this.tickMs = options.tickMs ?? 250;
    this.loopTailMs = options.loopTailMs ?? 2000;
  }

  async start(): Promise<void> {
    if (this.steps.length === 0) {
      throw new Error('ScriptedDetector : aucun script défini (appeler setScript avant start).');
    }
    if (this.handle !== null) {
      return; // déjà démarré — idempotent
    }
    this._status.set('STARTING');
    this.startedAt = performance.now();
    this._status.set('RUNNING');
    this.handle = setInterval(() => this.tick(), this.tickMs);
    this.tick(); // premier échantillon immédiat, sans attendre un tick
  }

  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
    this._status.set('IDLE');
  }

  onSample(listener: (sample: PresenceSample) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private tick(): void {
    const now = performance.now();
    let elapsed = now - this.startedAt;

    const lastStep = this.steps[this.steps.length - 1];
    if (this.loop && lastStep !== undefined && elapsed > lastStep.afterMs + this.loopTailMs) {
      // Fin du cycle simulé : on rejoue le script depuis le début.
      this.startedAt = now;
      elapsed = 0;
    }

    const step = this.stepAt(elapsed) ?? ABSENT_STEP;
    const sample: PresenceSample = {
      present: step.present,
      distance: step.present ? step.distance : null,
      timestamp: now,
    };
    this._lastSample = sample;
    for (const listener of this.listeners) {
      listener(sample);
    }
  }

  /** Dernière étape dont `afterMs` est dépassé, ou undefined avant la première. */
  private stepAt(elapsed: number): ScriptStep | undefined {
    let current: ScriptStep | undefined;
    for (const step of this.steps) {
      if (step.afterMs <= elapsed) {
        current = step;
      } else {
        break;
      }
    }
    return current;
  }
}
