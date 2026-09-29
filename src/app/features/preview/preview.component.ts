import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEMO_SCRIPT } from '../../core/detection/demo-script';
import { MediaPipeDetectorService } from '../../core/detection/mediapipe-detector.service';
import { ScriptedDetector } from '../../core/detection/scripted-detector.service';
import type { DetectionStatus } from '../../core/detection/detection-adapter';
import { InteractionEngineService } from '../../core/interaction/interaction-engine.service';
import { ScenarioEngineService } from '../../core/scenario/scenario-engine.service';
import { ArtworkStageComponent } from '../../shared/components/artwork-stage/artwork-stage.component';
import type { FrameState } from '../../core/interaction/interaction-state';

/**
 * PREVIEW — outil du démonstrateur : la machine à états sans ET avec caméra.
 *
 * - commandes manuelles / lecture automatique : détecteur scripté (Phase 3) ;
 * - capteur réel : MediaPipe branché sur le MÊME moteur (Phase 6) — la chaîne
 *   complète caméra → MediaPipe → DetectionAdapter → InteractionEngine est
 *   testable ici, avant le câblage définitif du Frame (Phase 7).
 */
@Component({
  imports: [ArtworkStageComponent, RouterLink],
  selector: 'lf-preview',
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewComponent implements OnInit {
  protected readonly engine = inject(InteractionEngineService);
  private readonly scenario = inject(ScenarioEngineService);
  private readonly realDetector = inject(MediaPipeDetectorService);

  protected readonly states: readonly FrameState[] = [
    'IDLE',
    'APPROACH',
    'ENGAGED',
    'HOLD',
    'RESET',
  ];

  protected readonly playing = signal(false);
  protected readonly detectionActive = signal(false);
  protected readonly log = signal<string[]>([]);

  /** Statut du détecteur réel, lu directement dans le template. */
  protected readonly detectorStatus = this.realDetector.status;

  private scriptedDetector: ScriptedDetector | null = null;
  private readonly startedAt = performance.now();

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Journal des transitions : l'observabilité, c'est la déboguabilité.
    const unsubscribe = this.engine.onTransition((from, to) => {
      const t = ((performance.now() - this.startedAt) / 1000).toFixed(1);
      this.log.update((entries) =>
        [`${from} → ${to} · t+${t}s`, ...entries].slice(0, 12),
      );
    });
    destroyRef.onDestroy(() => {
      unsubscribe();
      this.stopAutoplay();
      this.stopRealDetection();
    });
  }

  ngOnInit(): void {
    // La configuration active (modifiée dans le Studio) s'applique ici aussi.
    void this.scenario.load();
  }

  // ---------------------------------------------------------- entrées scène

  protected readonly artwork = computed(() => this.scenario.config().artwork);
  protected readonly scenarioCfg = computed(() => this.scenario.config().scenario);

  // ------------------------------------------------------------- commandes

  protected forceState(state: FrameState): void {
    this.stopAutoplay();
    this.stopRealDetection();
    this.engine.forceState(state);
  }

  protected resetEngine(): void {
    this.stopAutoplay();
    this.stopRealDetection();
    this.engine.reset();
  }

  protected toggleAutoplay(): void {
    if (this.playing()) {
      this.stopAutoplay();
    } else {
      this.stopRealDetection();
      this.startAutoplay();
    }
  }

  // ------------------------------------------------------ capteur réel (6)

  protected async toggleRealDetection(): Promise<void> {
    if (this.detectionActive()) {
      this.stopRealDetection();
      return;
    }
    this.stopAutoplay();
    try {
      await this.realDetector.start();
      this.engine.attach(this.realDetector);
      this.detectionActive.set(true);
    } catch {
      // Aucun crash : le statut (DENIED / UNAVAILABLE / ERROR) s'affiche
      // dans le panneau et pilote le message à montrer (matrice d'erreurs).
      this.detectionActive.set(false);
    }
  }

  private stopRealDetection(): void {
    if (!this.detectionActive() && this.realDetector.status() === 'IDLE') {
      return;
    }
    this.engine.detach();
    this.realDetector.stop();
    this.detectionActive.set(false);
  }

  /** Libellé lisible du statut de détection (panneau capteur réel). */
  protected statusLabel(status: DetectionStatus): string {
    switch (status) {
      case 'IDLE':
        return 'Inactif';
      case 'STARTING':
        return 'Initialisation…';
      case 'RUNNING':
        return 'Détection active';
      case 'DENIED':
        return 'Caméra refusée — autorisez l’accès dans le navigateur';
      case 'UNAVAILABLE':
        return 'Aucune caméra détectée (HTTPS requis ?)';
      case 'ERROR':
        return 'Détecteur en échec (WASM ou modèle)';
    }
  }

  // ---------------------------------------------------------- lecture auto

  private startAutoplay(): void {
    this.stopAutoplay();
    const detector = new ScriptedDetector();
    detector.setScript(DEMO_SCRIPT, { loop: true });
    this.engine.attach(detector);
    void detector.start();
    this.scriptedDetector = detector;
    this.playing.set(true);
  }

  private stopAutoplay(): void {
    this.scriptedDetector?.stop();
    this.scriptedDetector = null;
    this.engine.detach();
    this.playing.set(false);
  }
}
