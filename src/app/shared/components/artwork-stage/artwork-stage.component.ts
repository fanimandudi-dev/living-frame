import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { ImageRegistryService } from '../../../core/storage/image-registry.service';
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

/**
 * SCÈNE D'ŒUVRE — le rendu du « tableau vivant », partagé par le Frame
 * (plein écran) et le Preview (pilotage manuel).
 *
 * Composant de PRÉSENTATION pur : il reçoit (état, distance, œuvre, scénario)
 * et les traduit en opacités et message. Aucune décision, aucun timer,
 * aucune connaissance du capteur — tout le comportement est dans le moteur.
 *
 * Toute l'illusion tient dans un calque d'image à opacité pilotée,
 * animé uniquement via `opacity` (compositing GPU, 60 fps — ENF-P2).
 */
@Component({
  selector: 'lf-artwork-stage',
  templateUrl: './artwork-stage.component.html',
  styleUrl: './artwork-stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtworkStageComponent {
  private readonly registry = inject(ImageRegistryService);

  /** État courant de la machine à états. */
  readonly state = input.required<FrameState>();
  /** Dernier niveau de distance observé (null si personne). */
  readonly distance = input<DistanceLevel | null>(null);
  /** Œuvre à afficher (deux calques). */
  readonly artwork = input.required<Artwork>();
  /** Scénario actif : toggles, message, délais. */
  readonly scenario = input.required<Scenario>();

  constructor() {
    // Préchargement du calque engagé dès que sa source change : évite le
    // « flash blanc » au premier ENGAGED (l'image est déjà dans le cache).
    effect(() => {
      const src = this.engagedSrc();
      if (src !== '') {
        const preloader = new Image();
        preloader.src = src;
      }
    });
  }

  // ------------------------------------------------------------ visuels

  protected readonly idleSrc = computed(() => this.registry.resolve(this.artwork().idleImage));
  protected readonly engagedSrc = computed(() =>
    this.registry.resolve(this.artwork().engagedImage),
  );

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

  /** Le message apparaît pendant ENGAGED/HOLD, en fondu retardé (CSS). */
  protected readonly messageVisible = computed(
    () =>
      this.messageText() !== '' &&
      (this.state() === 'ENGAGED' || this.state() === 'HOLD'),
  );
}
