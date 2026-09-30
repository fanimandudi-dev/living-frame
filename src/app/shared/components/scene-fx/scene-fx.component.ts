import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { AnimationEngineService } from '../../../core/animation/animation-engine.service';
import { APPROACH_OPACITY } from '../../../core/interaction/interaction-state';
import type {
  DistanceLevel,
  FrameState,
} from '../../../core/interaction/interaction-state';
import {
  GOLDEN_WELCOME,
  INTENSITY_PRESETS,
} from '../../models/scene.model';
import type { LivingScene, SceneIntensity } from '../../models/scene.model';

/**
 * CALQUE DE LUMIÈRE — la partie visible de la scène : halo + balayage,
 * superposés à l'œuvre et chorégraphiés par l'Animation Engine.
 *
 * Composant de présentation : il traduit l'état du moteur d'interaction en
 * animations GSAP. La logique de chorégraphie vit dans le moteur et la
 * scène (configuration) — ici, aucune durée, aucun seuil. Les COULEURS
 * viennent de la palette de la scène (doré, argent…), liées au template —
 * GSAP n'anime que l'opacité et la position, jamais les dégradés.
 *
 * Cycle de vie : l'entrée (ENGAGED) n'est jouée QU'UNE fois par visite ;
 * les changements de distance pendant ENGAGED/HOLD ne la relancent pas.
 */
@Component({
  selector: 'lf-scene-fx',
  templateUrl: './scene-fx.component.html',
  styleUrl: './scene-fx.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneFxComponent {
  /** État courant de la machine à états. */
  readonly state = input.required<FrameState>();
  /** Dernier niveau de distance observé (null si personne). */
  readonly distance = input<DistanceLevel | null>(null);
  /** Puissance des effets (Subtil · Élégant · Spectaculaire). */
  readonly intensity = input<SceneIntensity>('ELEGANT');
  /** Scène jouée pendant la visite. */
  readonly scene = input<LivingScene>(GOLDEN_WELCOME);

  private readonly engine = inject(AnimationEngineService);
  private readonly glowRef = viewChild.required<ElementRef<HTMLElement>>('glow');
  private readonly sweepRef = viewChild.required<ElementRef<HTMLElement>>('sweep');
  private readonly destroyRef = inject(DestroyRef);

  /** Animations en cours — tuées avant chaque nouvelle phase. */
  private active: Array<gsap.core.Animation> = [];
  /** L'entrée a-t-elle déjà été jouée pour cette visite ? */
  private entrancePlayed = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());

    effect(() => {
      const state = this.state();
      const preset = INTENSITY_PRESETS[this.intensity()];
      const scene = this.scene();
      const glow = this.glowRef().nativeElement;
      const sweep = this.sweepRef().nativeElement;

      // ENGAGED / HOLD : la chorégraphie suit son cours — on ne la relance
      // pas, même si la distance change pendant que la personne regarde.
      if (state === 'ENGAGED' || state === 'HOLD') {
        if (!this.entrancePlayed) {
          this.entrancePlayed = true;
          this.stop();
          this.active.push(this.engine.entrance(glow, sweep, preset, scene));
        }
        return;
      }

      this.entrancePlayed = false;
      this.stop();
      if (state === 'APPROACH') {
        // Le halo suit la proximité : plus la personne est proche, plus il monte.
        this.active.push(
          this.engine.approachGlow(
            glow,
            APPROACH_OPACITY[this.distance() ?? 'FAR'],
            preset,
          ),
        );
      } else {
        // IDLE / RESET : la lumière se retire.
        this.active.push(this.engine.exit(glow));
      }
    });
  }

  // -------------------------------------------------------- matières

  /** Tue les animations en cours avant chaque nouvelle phase. */
  private stop(): void {
    for (const animation of this.active) {
      animation.kill();
    }
    this.active = [];
  }

  /** Dégradé du halo, de la palette de la scène. */
  protected readonly glowBackground = computed(() => {
    const palette = this.scene().palette;
    return `radial-gradient(ellipse 70% 55% at 50% 62%, ${palette.glow} 0%, ${palette.glowSoft} 45%, transparent 70%)`;
  });

  /** Dégradé du balayage — diagonal, ou aube montante selon la scène. */
  protected readonly sweepBackground = computed(() => {
    const palette = this.scene().palette;
    return this.scene().sweepStyle === 'RISE'
      ? `linear-gradient(to top, ${palette.sweep} 0%, transparent 85%)`
      : `linear-gradient(105deg, transparent 0%, ${palette.sweep} 50%, transparent 100%)`;
  });

  /** Scène à rideau montant (Aurora) ? */
  protected readonly isRise = computed(() => this.scene().sweepStyle === 'RISE');
}
