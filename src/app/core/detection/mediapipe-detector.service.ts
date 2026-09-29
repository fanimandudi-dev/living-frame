import { Injectable, NgZone, signal } from '@angular/core';
import type { FaceDetector } from '@mediapipe/tasks-vision';
import type { DetectionAdapter, DetectionStatus, PresenceSample } from './detection-adapter';
import { CameraError, CameraService } from './camera.service';
import { boxHeightRatio, distanceLevelFromRatio, largestBox } from './detection-math';
import type { DetectionBox } from './detection-math';

/**
 * DÉTECTEUR MEDIAPIPE — implémentation réelle du contrat DetectionAdapter.
 *
 * Chaîne : getUserMedia (CameraService) → FaceDetector BlazeFace (WASM local)
 * → échantillons PresenceSample → InteractionEngine (qui ne sait PAS que
 * MediaPipe existe — c'est tout l'intérêt du contrat).
 *
 * Décisions d'implémentation :
 * - WASM et modèle chargés depuis /mediapipe/** en CHEMIN RELATIF — jamais de
 *   CDN : le risque R1 (offline) est neutralisé dès la Phase 6 ;
 * - `@mediapipe/tasks-vision` importé DYNAMIQUEMENT dans start() : la
 *   bibliothèque (~1 Mo) n'est téléchargée que si la détection est utilisée ;
 * - GPU d'abord, repli CPU (certaines tablettes n'ont pas de GPU exploitable) ;
 * - boucle d'analyse hors zone Angular (8 Hz) ; un zone.run(noop) par échantillon
 *   permet aux signaux du moteur de rafraîchir l'UI (arbre OnPush : coût minime) ;
 * - erreurs d'infrence tolérées : seulement 10 échecs CONSÉCUTIFS arrêtent la
 *   détection (statut ERROR) — une frame perdue ne doit rien casser.
 *
 * Confidentialité (ENF-PR1) : détection de présence, jamais d'identification.
 * Aucune frame n'est stockée, aucune donnée ne sort de l'appareil.
 */
@Injectable({ providedIn: 'root' })
export class MediaPipeDetectorService implements DetectionAdapter {
  /** Cadence d'analyse (~8 échantillons/s — ENF-P3). */
  static readonly ANALYSIS_INTERVAL_MS = 125;

  private static readonly WASM_PATH = 'mediapipe/wasm';
  private static readonly MODEL_PATH = 'mediapipe/models/blaze_face_short_range.tflite';
  private static readonly MAX_CONSECUTIVE_ERRORS = 10;

  private readonly _status = signal<DetectionStatus>('IDLE');
  readonly status = this._status.asReadonly();

  private _lastSample: PresenceSample | null = null;
  get lastSample(): PresenceSample | null {
    return this._lastSample;
  }

  private readonly listeners = new Set<(sample: PresenceSample) => void>();
  private faceDetector: FaceDetector | null = null;
  private video: HTMLVideoElement | null = null;
  private loopHandle: ReturnType<typeof setInterval> | null = null;
  private consecutiveErrors = 0;

  constructor(
    private readonly camera: CameraService,
    private readonly zone: NgZone,
  ) {}

  async start(): Promise<void> {
    const current = this._status();
    if (current === 'RUNNING' || current === 'STARTING') {
      return; // idempotent
    }
    this._status.set('STARTING');

    // 1. Caméra (pannes distinguées : DENIED / UNAVAILABLE / ERROR).
    try {
      this.video = await this.camera.open();
    } catch (e) {
      this._status.set(e instanceof CameraError ? e.failure : 'ERROR');
      throw e;
    }

    // 2. Détecteur (WASM + modèle locaux).
    try {
      this.faceDetector = await this.createDetector();
    } catch {
      this.camera.close();
      this.video = null;
      this._status.set('ERROR');
      throw new Error('Initialisation du détecteur impossible (WASM ou modèle).');
    }

    // 3. Boucle d'analyse, hors zone Angular.
    this.consecutiveErrors = 0;
    this._status.set('RUNNING');
    this.loopHandle = this.zone.runOutsideAngular(() =>
      setInterval(() => this.analyse(), MediaPipeDetectorService.ANALYSIS_INTERVAL_MS),
    );
  }

  stop(): void {
    if (this.loopHandle !== null) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }
    try {
      this.faceDetector?.close();
    } catch {
      // bibliothèque déjà libérée — rien à faire
    }
    this.faceDetector = null;
    this.camera.close();
    this.video = null;
    this._status.set('IDLE');
  }

  onSample(listener: (sample: PresenceSample) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ------------------------------------------------------------- internes

  /** WASM local + modèle local ; GPU puis repli CPU. */
  protected async createDetector(): Promise<FaceDetector> {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(
      MediaPipeDetectorService.WASM_PATH,
    );
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: {
        modelAssetPath: MediaPipeDetectorService.MODEL_PATH,
        delegate,
      },
      runningMode: 'VIDEO' as const,
      minDetectionConfidence: 0.5,
    });
    try {
      return await vision.FaceDetector.createFromOptions(fileset, options('GPU'));
    } catch {
      // GPU indisponible ou non exploitable sur ce matériel → CPU.
      return await vision.FaceDetector.createFromOptions(fileset, options('CPU'));
    }
  }

  /** Une frame : détecter, choisir la personne principale, émettre l'échantillon. */
  private analyse(): void {
    const video = this.video;
    const detector = this.faceDetector;
    if (video === null || detector === null || video.readyState < 2) {
      return; // vidéo pas prête — on attend la prochaine itération
    }

    const timestamp = performance.now();
    let boxes: readonly DetectionBox[] = [];
    try {
      const result = detector.detectForVideo(video, timestamp);
      // BoundingBox (avec son champ 'angle') est structurellement assignable
      // à DetectionBox ; flatMap élimine proprement les boîtes absentes.
      boxes = result.detections.flatMap((detection) =>
        detection.boundingBox === undefined ? [] : [detection.boundingBox],
      );
    } catch {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= MediaPipeDetectorService.MAX_CONSECUTIVE_ERRORS) {
        this.stop();
        this._status.set('ERROR');
      }
      return;
    }
    this.consecutiveErrors = 0;

    const box = largestBox(boxes);
    const sample: PresenceSample = {
      present: box !== null,
      distance:
        box === null
          ? null
          : distanceLevelFromRatio(boxHeightRatio(box, video.videoHeight)),
      timestamp,
    };
    this._lastSample = sample;
    for (const listener of this.listeners) {
      listener(sample);
    }
    // Les signaux (moteur) viennent d'être écrits HORS zone Angular : on
    // provoque un tick de détection de changement pour rafraîchir l'UI.
    this.zone.run(() => undefined);
  }
}
