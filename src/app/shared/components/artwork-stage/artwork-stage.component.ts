import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ImageRegistryService } from '../../../core/storage/image-registry.service';
import { AnimationEngineService } from '../../../core/animation/animation-engine.service';
import {
  APPROACH_FADE_MS,
  APPROACH_OPACITY,
  DEFAULT_INTERACTION_TIMINGS,
} from '../../../core/interaction/interaction-state';
import type {
  DistanceLevel,
  FrameState,
} from '../../../core/interaction/interaction-state';
import type { Artwork } from '../../models/artwork.model';
import type { Scenario } from '../../models/scenario.model';
import type { EventInfo } from '../../models/frame-config.model';
import {
  GOLDEN_WELCOME,
  INTENSITY_PRESETS,
  SCENES,
} from '../../models/scene.model';
import type { LivingScene, SceneIntensity } from '../../models/scene.model';
import { SceneFxComponent } from '../scene-fx/scene-fx.component';
import { ParticleFxComponent } from '../particle-fx/particle-fx.component';

/** Événement par défaut : aucune ligne nominative sous le message. */
const NO_EVENT: EventInfo = { name: '' };

/** Cadence du défilé : durée d'affichage de chaque photo engagée. */
export const ENGAGED_SLIDE_MS = 6000;

/**
 * SCÈNE D'ŒUVRE — le rendu du « tableau vivant », partagé par le Frame
 * (plein écran) et le Preview (pilotage manuel).
 *
 * Composant de PRÉSENTATION pur : il reçoit (état, distance, œuvre, scénario,
 * événement) et les traduit en visuel. Aucune décision, aucun timer, aucune
 * connaissance du capteur — tout le comportement est dans le moteur.
 *
 * Répartition des responsabilités (V1, moteur de scènes — 30/09/2026) :
 * - CSS : fondus d'images (courbe artisanale), respiration du défilé, voile ;
 * - ANIMATION ENGINE (GSAP) : chorégraphie — calque de lumière (SceneFx)
 *   et naissance/retrait du message (phases de la scène, selon l'intensité) ;
 * - DÉFILÉ : tant que la personne est présente, les photos engagées se
 *   remplacent en fondu (une toutes les `slideMs` ms, en boucle).
 */
@Component({
  imports: [SceneFxComponent, ParticleFxComponent],
  selector: 'lf-artwork-stage',
  templateUrl: './artwork-stage.component.html',
  styleUrl: './artwork-stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtworkStageComponent {
  private readonly registry = inject(ImageRegistryService);
  private readonly anim = inject(AnimationEngineService);
  private readonly destroyRef = inject(DestroyRef);

  /** État courant de la machine à états. */
  readonly state = input.required<FrameState>();
  /** Dernier niveau de distance observé (null si personne). */
  readonly distance = input<DistanceLevel | null>(null);
  /** Œuvre à afficher (repos + séquence du défilé). */
  readonly artwork = input.required<Artwork>();
  /** Scénario actif : toggles, message, délais, scène, intensité. */
  readonly scenario = input.required<Scenario>();
  /** Métadonnées de l'événement — la ligne nominative sous le message. */
  readonly event = input<EventInfo>(NO_EVENT);
  /** Durée d'affichage de chaque photo du défilé (réglage / tests). */
  readonly slideMs = input(ENGAGED_SLIDE_MS);

  /** Index de la photo du défilé actuellement affichée. */
  protected readonly photoIndex = signal(0);

  /** Cibles de la chorégraphie du message (références de template). */
  private readonly messageTextRef = viewChild<ElementRef<HTMLElement>>('messageTextEl');
  private readonly eventLineRef = viewChild<ElementRef<HTMLElement>>('eventLineEl');
  /** Timeline GSAP du message en cours (naissance ou retrait). */
  private messageAnim: ReturnType<AnimationEngineService['messageIn']> | null = null;
  /** Le message a-t-il déjà été montré pour cette visite ? */
  private messageShown = false;

  /** Scène visuelle dérivée du scénario (défaut : Golden Welcome). */
  protected readonly scene = computed<LivingScene>(
    () => SCENES[this.scenario().sceneId ?? GOLDEN_WELCOME.id] ?? GOLDEN_WELCOME,
  );

  /** Puissance des effets, dérivée du scénario. */
  protected readonly intensity = computed<SceneIntensity>(
    () => this.scenario().intensity ?? 'ELEGANT',
  );

  constructor() {
    // Préchargement de TOUTES les photos du défilé dès que la séquence
    // change : aucun « flash » au premier changement, tout est déjà en cache.
    effect(() => {
      for (const src of this.engagedSrcs()) {
        const preloader = new Image();
        preloader.src = src;
      }
    });

    // DÉFILÉ : tant que l'œuvre est « vivante » et qu'il y a plusieurs
    // photos, on passe à la suivante, en boucle. L'intervalle est recréé
    // si la cadence ou la séquence change ; nettoyé sinon.
    effect((onCleanup) => {
      if (!this.isAlive() || this.engagedSrcs().length < 2) {
        return;
      }
      const id = setInterval(() => {
        this.photoIndex.update((i) => (i + 1) % this.engagedSrcs().length);
      }, this.slideMs());
      onCleanup(() => clearInterval(id));
    });

    // Au repos, le défilé repart de la première photo (la transformation) :
    // chaque nouvelle visite retrouve l'effet complet depuis le début.
    effect(() => {
      if (!this.isAlive()) {
        this.photoIndex.set(0);
      }
    });

    // MESSAGE : chorégraphie GSAP — naissance (flou → net, espacement qui se
    // pose) au moment prévu par la scène, retrait doux au départ. L'opacité
    // appartient à GSAP ; la classe .visible reste un marqueur (voile, tests).
    effect(() => {
      const visible = this.messageVisible();
      const textEl = this.messageTextRef()?.nativeElement;
      if (textEl === undefined) {
        return;
      }
      const eventEl = this.eventLineRef()?.nativeElement ?? null;
      if (visible) {
        this.messageAnim?.kill();
        this.messageShown = true;
        this.messageAnim = this.anim.messageIn(
          textEl,
          eventEl,
          INTENSITY_PRESETS[this.intensity()],
          this.scene(),
        );
      } else if (this.messageShown) {
        this.messageAnim?.kill();
        this.messageShown = false;
        this.messageAnim = this.anim.messageOut(textEl, eventEl);
      }
    });

    this.destroyRef.onDestroy(() => this.messageAnim?.kill());
  }

  // ------------------------------------------------------------ visuels

  protected readonly idleSrc = computed(() => this.registry.resolve(this.artwork().idleImage));

  /** Sources des photos du défilé, dans l'ordre. */
  protected readonly engagedSrcs = computed(() =>
    this.artwork().engagedImages.map((ref) => this.registry.resolve(ref)),
  );

  /** ENGAGED / HOLD : l'œuvre « vit » (défilé, respiration, chaleur). */
  protected readonly isAlive = computed(() => {
    const state = this.state();
    return state === 'ENGAGED' || state === 'HOLD';
  });

  /**
   * Opacité du calque engagé — cœur de l'illusion :
   * IDLE 0 · APPROACH selon la distance (EF-08) · ENGAGED/HOLD 1 · RESET 0.
   */
  protected readonly engagedOpacity = computed(() => {
    if (!this.scenario().transformationEnabled) {
      return 0;
    }
    switch (this.state()) {
      case 'IDLE':
        return 0;
      case 'APPROACH':
        return APPROACH_OPACITY[this.distance() ?? 'FAR'];
      case 'ENGAGED':
      case 'HOLD':
        return 1;
      case 'RESET':
        return 0;
    }
  });

  /** Durée du fondu courant, synchronisée sur les délais du scénario. */
  protected readonly fadeMs = computed(() => {
    switch (this.state()) {
      case 'APPROACH':
        return APPROACH_FADE_MS;
      case 'ENGAGED':
      case 'HOLD':
        return DEFAULT_INTERACTION_TIMINGS.engageTransitionMs;
      case 'RESET':
      case 'IDLE':
        return this.scenario().resetDelayMs;
    }
  });

  protected readonly messageText = computed(() => {
    const scenario = this.scenario();
    return scenario.messageEnabled ? (scenario.message ?? '') : '';
  });

  /** Le message apparaît pendant ENGAGED/HOLD (chorégraphié par GSAP). */
  protected readonly messageVisible = computed(
    () =>
      this.messageText() !== '' &&
      (this.state() === 'ENGAGED' || this.state() === 'HOLD'),
  );

  /** Ligne nominative : le nom de l'événement, en capitales espacées. */
  protected readonly eventLine = computed(() => this.event().name.trim());
}
