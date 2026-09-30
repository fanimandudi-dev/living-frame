import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { KioskService } from '../../core/kiosk.service';
import { ScenarioEngineService } from '../../core/scenario/scenario-engine.service';
import { ImageRegistryService } from '../../core/storage/image-registry.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import type { FrameConfig } from '../../shared/models/frame-config.model';
import type { Artwork } from '../../shared/models/artwork.model';
import { GOLDEN_WELCOME, SCENES } from '../../shared/models/scene.model';
import type { SceneIntensity } from '../../shared/models/scene.model';

/**
 * STUDIO — configuration de l'organisateur (EF-11 à EF-13).
 *
 * PROBLÈME : l'organisateur (non technique) doit pouvoir préparer l'œuvre,
 * le message et les délais sans toucher au code — et voir le résultat.
 *
 * DÉCISION : un formulaire réactif typé (validation conditionnelle : le
 * message est requis s'il est activé), les images importées passent par
 * l'ImageRegistry (object URLs), et les trois actions passent par
 * ScenarioEngine.save() — le Frame réagit SANS rechargement (TEST-04).
 *
 * Persistance : Phase 4 = session en mémoire (perdue au rechargement) ;
 * Phase 5 = IndexedDB. Ce composant n'aura pas à changer.
 */
@Component({
  imports: [ReactiveFormsModule],
  selector: 'lf-studio',
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly scenario = inject(ScenarioEngineService);
  private readonly registry = inject(ImageRegistryService);
  private readonly kiosk = inject(KioskService);
  private readonly destroyRef = inject(DestroyRef);

  /** Scènes visuelles proposées au Studio (toutes celles du registre). */
  protected readonly sceneList = Object.values(SCENES);

  /** Bornes de validation des délais (EF-13) — en secondes côté formulaire. */
  private static readonly TIMING_BOUNDS = {
    engage: { min: 0.2, max: 10 },
    hold: { min: 1, max: 60 },
    reset: { min: 0.2, max: 10 },
  } as const;

  protected readonly form = this.fb.nonNullable.group({
    // Événement
    eventName: ['', Validators.maxLength(80)],
    eventDate: [''],
    eventTheme: ['', Validators.maxLength(40)],
    // Message
    message: ['Bienvenue dans notre histoire', Validators.maxLength(120)],
    // Interaction
    detectionEnabled: [true],
    transformationEnabled: [true],
    messageEnabled: [true],
    // Timing (secondes dans le formulaire, millisecondes dans la config)
    engageDelayS: [
      1.2,
      [
        Validators.required,
        Validators.min(StudioComponent.TIMING_BOUNDS.engage.min),
        Validators.max(StudioComponent.TIMING_BOUNDS.engage.max),
      ],
    ],
    holdDurationS: [
      5,
      [
        Validators.required,
        Validators.min(StudioComponent.TIMING_BOUNDS.hold.min),
        Validators.max(StudioComponent.TIMING_BOUNDS.hold.max),
      ],
    ],
    resetDelayS: [
      2,
      [
        Validators.required,
        Validators.min(StudioComponent.TIMING_BOUNDS.reset.min),
        Validators.max(StudioComponent.TIMING_BOUNDS.reset.max),
      ],
    ],
    // Mise en scène (V1)
    sceneId: [GOLDEN_WELCOME.id],
    intensity: ['ELEGANT' as SceneIntensity],
  });

  /** Œuvre en cours d'édition (signal — les aperçus en dérivent). */
  protected readonly artworkState = signal<Artwork>(DEFAULT_FRAME_CONFIG.artwork);
  private readonly selectedFiles = signal<{ idle: File | null; engaged: File | null }>({
    idle: null,
    engaged: null,
  });

  protected readonly idlePreview = computed(() =>
    this.registry.resolve(this.artworkState().idleImage),
  );
  /** Aperçu de la première photo engagée (celle de la transformation). */
  protected readonly engagedPreview = computed(() =>
    this.registry.resolve(this.artworkState().engagedImages[0]),
  );

  /** Aperçus des photos du défilé (toutes sauf la première). */
  protected readonly paradePreviews = computed(() =>
    this.artworkState()
      .engagedImages.slice(1)
      .map((ref) => this.registry.resolve(ref)),
  );

  /** Avertissement : deux fichiers identiques ne produiront aucun effet (R11). */
  protected readonly identicalFiles = computed(() => {
    const { idle, engaged } = this.selectedFiles();
    if (idle === null || engaged === null) {
      return false;
    }
    return (
      idle.name === engaged.name && idle.size === engaged.size && idle.lastModified === engaged.lastModified
    );
  });

  protected readonly saveState = signal<'idle' | 'saved'>('idle');
  private saveFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  /** Erreur de persistance éventuelle — jamais bloquante, toujours visible ici. */
  protected readonly persistenceError = this.scenario.persistenceError;

  constructor() {
    // EF-13 : le message est requis uniquement quand il est activé.
    this.form.controls.messageEnabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => this.updateMessageValidator(enabled));

    this.destroyRef.onDestroy(() => {
      if (this.saveFeedbackTimer !== null) {
        clearTimeout(this.saveFeedbackTimer);
      }
    });
  }

  ngOnInit(): void {
    // Retour de l'organisateur : on sort du mode kiosque s'il était actif.
    void this.kiosk.release();
    // Chargement de la configuration active (défauts en Phase 4, IndexedDB en Phase 5).
    void this.scenario.load().then(() => this.patchFromConfig(this.scenario.config()));
  }

  // ------------------------------------------------------------- œuvre

  protected onImageSelected(which: 'idle' | 'engaged', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file === null) {
      return;
    }
    const key = `artwork/${which}`;
    this.registry.register(key, file);
    // EF-14 : persistance immédiate du fichier — l'aperçu est déjà affiché,
    // la sauvegarde de la configuration (bouton Enregistrer) viendra ensuite.
    void this.scenario.saveImage(key, file);
    this.selectedFiles.update((files) => ({ ...files, [which]: file }));
    if (which === 'idle') {
      this.artworkState.update((artwork) => ({
        ...artwork,
        idleImage: { source: 'stored' as const, key },
      }));
      return;
    }
    // La photo « engagée » est la première du défilé (la transformation).
    this.artworkState.update((artwork) => ({
      ...artwork,
      engagedImages: [
        { source: 'stored' as const, key },
        ...artwork.engagedImages.slice(1),
      ],
    }));
  }

  /** Ajoute une photo au défilé (photos qui se succèdent pendant la visite). */
  protected onParadePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file === null) {
      return;
    }
    const key = `artwork/parade-${Date.now()}`;
    this.registry.register(key, file);
    // EF-14 : persistance immédiate du fichier, comme les deux autres.
    void this.scenario.saveImage(key, file);
    this.artworkState.update((artwork) => ({
      ...artwork,
      engagedImages: [...artwork.engagedImages, { source: 'stored' as const, key }],
    }));
    input.value = ''; // permet de re-sélectionner le même fichier
  }

  /** Retire une photo du défilé (index dans engagedImages — jamais la première). */
  protected removeParadePhoto(index: number): void {
    if (index < 1) {
      return;
    }
    this.artworkState.update((artwork) => ({
      ...artwork,
      engagedImages: artwork.engagedImages.filter((_, i) => i !== index),
    }));
  }

  protected useDemoArtwork(): void {
    this.artworkState.set(DEFAULT_FRAME_CONFIG.artwork);
    this.selectedFiles.set({ idle: null, engaged: null });
  }

  // ---------------------------------------------------------- actions

  /** Enregistre la configuration courante. Retourne false si invalide. */
  protected async save(): Promise<boolean> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    await this.scenario.save(this.buildConfig());
    this.saveState.set('saved');
    if (this.saveFeedbackTimer !== null) {
      clearTimeout(this.saveFeedbackTimer);
    }
    this.saveFeedbackTimer = setTimeout(() => this.saveState.set('idle'), 2500);
    return true;
  }

  /** Prévisualiser : enregistre puis lance le cadre en démo autonome. */
  protected async preview(): Promise<void> {
    if (!(await this.save())) {
      return;
    }
    await this.router.navigate(['/frame'], { queryParams: { demo: 1 } });
  }

  /** Lancer le cadre : enregistre, plein écran + anti-veille, puis /frame. */
  protected async launchFrame(): Promise<void> {
    if (!(await this.save())) {
      return;
    }
    // Plein écran d'abord : doit rester dans le geste utilisateur (click).
    void this.kiosk.enterKioskMode();
    await this.router.navigate(['/frame']);
  }

  // -------------------------------------------------------- internes

  private patchFromConfig(config: FrameConfig): void {
    this.artworkState.set(config.artwork);
    this.form.patchValue({
      eventName: config.event.name,
      eventDate: config.event.date ?? '',
      eventTheme: config.event.theme ?? '',
      message: config.scenario.message ?? '',
      detectionEnabled: config.scenario.detectionEnabled,
      transformationEnabled: config.scenario.transformationEnabled,
      messageEnabled: config.scenario.messageEnabled,
      engageDelayS: config.scenario.engageDelayMs / 1000,
      holdDurationS: config.scenario.holdDurationMs / 1000,
      resetDelayS: config.scenario.resetDelayMs / 1000,
      sceneId: config.scenario.sceneId ?? GOLDEN_WELCOME.id,
      intensity: config.scenario.intensity ?? 'ELEGANT',
    });
    this.updateMessageValidator(config.scenario.messageEnabled);
  }

  private updateMessageValidator(enabled: boolean): void {
    const message = this.form.controls.message;
    message.setValidators(
      enabled ? [Validators.required, Validators.maxLength(120)] : [Validators.maxLength(120)],
    );
    message.updateValueAndValidity();
  }

  /** Assemble la FrameConfig à partir du formulaire (secondes → millisecondes). */
  private buildConfig(): FrameConfig {
    const value = this.form.getRawValue();
    return {
      version: 1,
      event: {
        name: value.eventName.trim(),
        date: value.eventDate === '' ? undefined : value.eventDate,
        theme: value.eventTheme.trim() === '' ? undefined : value.eventTheme.trim(),
      },
      artwork: this.artworkState(),
      scenario: {
        id: 'welcome',
        name: 'Wedding Welcome',
        detectionEnabled: value.detectionEnabled,
        transformationEnabled: value.transformationEnabled,
        messageEnabled: value.messageEnabled,
        engageDelayMs: Math.round(value.engageDelayS * 1000),
        holdDurationMs: Math.round(value.holdDurationS * 1000),
        resetDelayMs: Math.round(value.resetDelayS * 1000),
        message: value.message.trim() === '' ? undefined : value.message.trim(),
        sceneId: value.sceneId,
        intensity: value.intensity,
      },
    };
  }

  /** Pour le template : contrôle invalide et déjà touché (affichage des erreurs). */
  protected invalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control !== null && control.invalid && (control.touched || control.dirty);
  }
}
