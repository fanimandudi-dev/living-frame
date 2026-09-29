import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KioskService } from '../../core/kiosk.service';
import { DEMO_SCRIPT } from '../../core/detection/demo-script';
import { MediaPipeDetectorService } from '../../core/detection/mediapipe-detector.service';
import { ScriptedDetector } from '../../core/detection/scripted-detector.service';
import { InteractionEngineService } from '../../core/interaction/interaction-engine.service';
import { ScenarioEngineService } from '../../core/scenario/scenario-engine.service';
import { ArtworkStageComponent } from '../../shared/components/artwork-stage/artwork-stage.component';
import type { FrameState } from '../../core/interaction/interaction-state';

/**
 * MODE FRAME — le produit final vu par le visiteur.
 *
 * Phase 9 — durcissements « prototype physique » :
 * - premier toucher de l'œuvre → plein écran + anti-veille (le navigateur
 *   exige un geste utilisateur ; ici, ce geste fait partie de l'expérience) ;
 * - anti-sortie kiosque : menu contextuel et sélection désactivés ;
 * - récupération : une retentative de détection après 5 s si la panne semble
 *   transitoire (ERROR / UNAVAILABLE). DENIED n'est pas retenté — changer
 *   une permission exige une action humaine, la retentative ne servirait à rien.
 *
 * Choix du détecteur à l'ouverture :
 * - /frame         : détection RÉELLE si scenario.detectionEnabled ;
 * - /frame?demo=1  : détecteur SCRIPTÉ en boucle (démo sans caméra) ;
 * - détection décochée : œuvre statique, caméra jamais ouverte.
 *
 * Pilotage invisible : touches 1-5 (états), D (démo), C (caméra réelle).
 * En cas d'échec : œuvre statique + point discret — jamais d'écran d'erreur.
 */
@Component({
  imports: [ArtworkStageComponent],
  selector: 'lf-frame',
  templateUrl: './frame.component.html',
  styleUrl: './frame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onPointerdown()',
    '(contextmenu)': 'onContextmenu($event)',
  },
})
export class FrameComponent implements OnInit, OnDestroy {
  private static readonly RETRY_DELAY_MS = 5000;

  private readonly engine = inject(InteractionEngineService);
  private readonly scenario = inject(ScenarioEngineService);
  private readonly route = inject(ActivatedRoute);
  private readonly realDetector = inject(MediaPipeDetectorService);
  private readonly kiosk = inject(KioskService);

  private demoDetector: ScriptedDetector | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private kioskEnteredOnce = false;

  protected readonly demoActive = signal(false);

  /** Statut du détecteur réel — pilote le point discret. */
  protected readonly detectorStatus = this.realDetector.status;

  /** Le point n'apparaît qu'en mode réel (jamais en démo scriptée). */
  protected readonly showStatus = computed(
    () => !this.demoActive() && this.detectorStatus() !== 'IDLE',
  );

  /** Raccourcis clavier de simulation/pilotage. */
  private static readonly KEY_STATES: Readonly<Record<string, FrameState>> = {
    '1': 'IDLE',
    '2': 'APPROACH',
    '3': 'ENGAGED',
    '4': 'HOLD',
    '5': 'RESET',
  };

  constructor() {
    // Le Studio peut modifier les délais à chaud : le moteur est re-paramétré
    // à chaque changement de configuration.
    effect(() => {
      this.engine.applyTimings(this.scenario.timings());
    });
  }

  ngOnInit(): void {
    void this.scenario.load().then(() => {
      if (this.route.snapshot.queryParamMap.get('demo') === '1') {
        this.startDemo();
      } else if (this.scenario.config().scenario.detectionEnabled) {
        void this.startRealDetection();
      }
      // detectionEnabled = false : le cadre reste une œuvre statique,
      // la caméra n'est jamais ouverte (choix de l'organisateur).
    });
  }

  ngOnDestroy(): void {
    // Nettoyage complet : timers, détecteurs (caméra libérée — CA-11),
    // moteur débranché.
    this.clearRetryTimer();
    this.stopDemo();
    this.stopRealDetection();
  }

  // ---------------------------------------------------------- entrées scène

  protected readonly artwork = computed(() => this.scenario.config().artwork);
  protected readonly scenarioCfg = computed(() => this.scenario.config().scenario);

  // ------------------------------------------------------- kiosque (Ph. 9)

  /**
   * Premier toucher de l'œuvre → plein écran + anti-veille, une seule fois.
   * Aucun élément d'interface : le geste fait partie de l'expérience.
   */
  protected onPointerdown(): void {
    if (this.kioskEnteredOnce) {
      return;
    }
    this.kioskEnteredOnce = true;
    void this.kiosk.enterKioskMode();
  }

  /** Un long-press ne doit rien ouvrir (kiosque). */
  protected onContextmenu(event: Event): void {
    event.preventDefault();
  }

  // ------------------------------------------------------------- pilotage

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const state = FrameComponent.KEY_STATES[event.key];
    if (state !== undefined) {
      this.stopDemo();
      this.stopRealDetection();
      this.engine.forceState(state);
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'd') {
      if (this.demoActive()) {
        this.stopDemo();
      } else {
        this.stopRealDetection();
        this.startDemo();
      }
    } else if (key === 'c') {
      if (this.realDetector.status() === 'RUNNING') {
        this.stopRealDetection();
      } else {
        this.stopDemo();
        void this.startRealDetection();
      }
    }
  }

  // ------------------------------------------------------ détection réelle

  private async startRealDetection(retried = false): Promise<void> {
    this.clearRetryTimer();
    try {
      await this.realDetector.start();
      this.engine.attach(this.realDetector);
    } catch {
      // Échec : repli silencieux (œuvre statique + point discret).
      // Récupération limitée à UNE retentative, seulement si la panne semble
      // transitoire. DENIED exige une action humaine → jamais retenté.
      const status = this.realDetector.status();
      if (!retried && (status === 'ERROR' || status === 'UNAVAILABLE')) {
        this.retryTimer = setTimeout(
          () => void this.startRealDetection(true),
          FrameComponent.RETRY_DELAY_MS,
        );
      }
    }
  }

  private stopRealDetection(): void {
    this.clearRetryTimer();
    if (this.realDetector.status() === 'IDLE') {
      return; // rien à libérer (et le moteur n'y est peut-être pas branché)
    }
    this.engine.detach();
    this.realDetector.stop();
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  // ----------------------------------------------------------- démo scriptée

  private startDemo(): void {
    this.stopDemo();
    const detector = new ScriptedDetector();
    detector.setScript(DEMO_SCRIPT, { loop: true });
    this.engine.attach(detector);
    void detector.start();
    this.demoDetector = detector;
    this.demoActive.set(true);
  }

  private stopDemo(): void {
    this.demoDetector?.stop();
    this.demoDetector = null;
    if (this.demoActive()) {
      this.engine.detach();
    }
    this.demoActive.set(false);
  }
}
