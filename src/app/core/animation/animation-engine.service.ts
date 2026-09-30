import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import type {
  LivingScene,
  SceneIntensityPreset,
} from '../../shared/models/scene.model';

/**
 * ANIMATION ENGINE — la chorégraphie visuelle d'une visite.
 *
 * PROBLÈME : des fondus simultanés (tout arrive en même temps) ne donnent
 * pas un rendu motion design ; il faut une TIMELINE séquencée — lumière,
 * puis émergence, puis texte — avec des courbes précises.
 *
 * DÉCISION : GSAP en coulisse (npm, auto-hébergé, offline intact), derrière
 * un service au vocabulaire métier. Les composants ne voient jamais GSAP :
 * ils demandent « l'entrée de la scène », « la naissance du message »…
 *
 * Ce service est PUR : il fabrique des timelines à partir de cibles et de
 * configuration (scène + intensité). Aucun état, aucun DOM propre — les
 * tests pilotent les timelines avec de simples objets (progress(1)).
 *
 * Le CSS garde ce qu'il fait bien (fondus d'images, respiration) ; GSAP
 * prend la mise en scène (lumière, typographie).
 */
@Injectable({ providedIn: 'root' })
export class AnimationEngineService {
  /**
   * APPROACH : un halo tiède se lève, proportionnel au niveau de proximité.
   * `overwrite: true` — un changement de distance remplace le twe en cours.
   */
  approachGlow(
    glow: gsap.TweenTarget,
    level: number,
    preset: SceneIntensityPreset,
  ): gsap.core.Tween {
    return gsap.to(glow, {
      opacity: Math.max(0.02, level * preset.glowMax),
      duration: 1.2,
      ease: 'sine.out',
      overwrite: true,
    });
  }

  /**
   * ENGAGED : la chorégraphie d'entrée — d'abord le calme, puis la lumière
   * traverse l'œuvre, le halo se lève, et pulse très lentement tant que la
   * personne reste (la répétition infinie est volontaire : elle est tuée
   * par la prochaine animation sur la même cible, `overwrite`).
   */
  entrance(
    glow: gsap.TweenTarget,
    sweep: gsap.TweenTarget,
    preset: SceneIntensityPreset,
    scene: LivingScene,
  ): gsap.core.Timeline {
    const p = scene.phases;
    const tl = gsap.timeline();
    tl.set(glow, { opacity: 0 }, 0)
      .set(sweep, { xPercent: -160, opacity: 0 }, 0)
      .set(sweep, { opacity: preset.sweepOpacity }, p.sweepAtMs / 1000)
      .fromTo(
        sweep,
        { xPercent: -160 },
        { xPercent: 160, duration: p.sweepMs / 1000, ease: 'power2.inOut' },
        p.sweepAtMs / 1000,
      )
      .set(sweep, { opacity: 0 }, (p.sweepAtMs + p.sweepMs) / 1000)
      .to(
        glow,
        { opacity: preset.glowMax, duration: p.glowMs / 1000, ease: 'power2.out' },
        p.glowAtMs / 1000,
      )
      // Respiration lumineuse : très lente, presque imperceptible.
      .to(glow, {
        opacity: preset.glowMax * 0.7,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    return tl;
  }

  /** RESET / IDLE : la lumière se retire en douceur. */
  exit(glow: gsap.TweenTarget): gsap.core.Tween {
    return gsap.to(glow, {
      opacity: 0,
      duration: 1.3,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }

  /**
   * Naissance du message : il émerge flou, espacé, légèrement bas — puis se
   * pose (net, resserré) au moment prévu par la scène. La ligne nominative
   * entre en second. Le « from » est appliqué dès la création (immédiat) :
   * le message reste invisible tant que la phase n'est pas venue.
   */
  messageIn(
    text: gsap.TweenTarget,
    event: gsap.TweenTarget | null,
    preset: SceneIntensityPreset,
    scene: LivingScene,
  ): gsap.core.Timeline {
    const p = scene.phases;
    const tl = gsap.timeline();
    tl.fromTo(
      text,
      {
        opacity: 0,
        letterSpacing: '0.34em',
        y: 18,
        filter: `blur(${preset.messageBlurPx}px)`,
      },
      {
        opacity: 1,
        letterSpacing: '0.14em',
        y: 0,
        filter: 'blur(0px)',
        duration: 1.7,
        ease: 'power2.out',
      },
      p.messageAtMs / 1000,
    );
    if (event !== null) {
      tl.fromTo(
        event,
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: 'sine.out' },
        p.eventAtMs / 1000,
      );
    }
    return tl;
  }

  /** Départ : le message se retire vite et proprement (le luxe, c'est le rythme). */
  messageOut(
    text: gsap.TweenTarget,
    event: gsap.TweenTarget | null,
  ): gsap.core.Timeline {
    const tl = gsap.timeline();
    tl.to(text, { opacity: 0, duration: 0.65, ease: 'power1.in' }, 0);
    if (event !== null) {
      tl.to(event, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0);
    }
    return tl;
  }
}
