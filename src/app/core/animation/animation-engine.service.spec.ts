import { describe, expect, it } from 'vitest';
import { AnimationEngineService } from './animation-engine.service';
import {
  GOLDEN_WELCOME,
  INTENSITY_PRESETS,
} from '../../shared/models/scene.model';

/**
 * Le moteur est pur : les timelines sont pilotées avec de simples objets
 * (GSAP anime leurs propriétés directes), avancées de façon déterministe
 * par progress(1) — aucun DOM, aucun timer réel.
 */
describe('AnimationEngineService — chorégraphie GSAP', () => {
  const engine = new AnimationEngineService();

  it('messageIn : à la fin, le message est posé (net, resserré, visible)', () => {
    const text: Record<string, unknown> = {
      opacity: 0,
      letterSpacing: '0.34em',
      y: 18,
      filter: 'blur(10px)',
    };
    const event: Record<string, unknown> = { opacity: 0 };

    const tl = engine.messageIn(text, event, INTENSITY_PRESETS.ELEGANT, GOLDEN_WELCOME);
    tl.progress(1);

    expect(text['opacity']).toBe(1);
    expect(text['letterSpacing']).toBe('0.14em');
    expect(text['y']).toBe(0);
    expect(text['filter']).toBe('blur(0px)');
    expect(event['opacity']).toBe(1);
  });

  it('messageIn : la naissance attend la phase « message » de la scène', () => {
    const text: Record<string, unknown> = { opacity: 0 };
    const event: Record<string, unknown> = { opacity: 1 };
    const tl = engine.messageIn(text, event, INTENSITY_PRESETS.ELEGANT, GOLDEN_WELCOME);
    // La timeline dure au moins jusqu'à la pose de la ligne nominative.
    expect(tl.duration()).toBeGreaterThanOrEqual(
      (GOLDEN_WELCOME.phases.eventAtMs + 1000) / 1000 - 0.01,
    );
    // Avant la phase message, rien n'a bougé.
    tl.progress(0.1).pause();
    expect(text['opacity']).toBe(0);
  });

  it('messageOut : le message et la ligne nominative disparaissent vite', () => {
    const text: Record<string, unknown> = { opacity: 1 };
    const event: Record<string, unknown> = { opacity: 1 };

    const tl = engine.messageOut(text, event);
    tl.progress(1);

    expect(text['opacity']).toBe(0);
    expect(event['opacity']).toBe(0);
    expect(tl.duration()).toBeLessThanOrEqual(1);
  });

  it('approachGlow : le halo suit la distance × l’intensité', () => {
    const glow: Record<string, unknown> = { opacity: 0 };

    const tween = engine.approachGlow(glow, 0.85, INTENSITY_PRESETS.SPECTACULAR);
    tween.progress(1);

    expect(glow['opacity']).toBeCloseTo(
      0.85 * INTENSITY_PRESETS.SPECTACULAR.glowMax,
      5,
    );
  });

  it('entrance : le balayage traverse, puis s’éteint ; le halo se lève', () => {
    const glow: Record<string, unknown> = { opacity: 0 };
    const sweep: Record<string, unknown> = { xPercent: 0, opacity: 0 };

    const tl = engine.entrance(glow, sweep, INTENSITY_PRESETS.ELEGANT, GOLDEN_WELCOME);

    // La chorégraphie dure au moins jusqu'à la fin du balayage.
    expect(tl.duration()).toBeGreaterThanOrEqual(
      (GOLDEN_WELCOME.phases.sweepAtMs + GOLDEN_WELCOME.phases.sweepMs) / 1000 - 0.01,
    );
    // Le halo est bien une cible de la timeline (il se lèvera à sa phase).
    const glowTweens = tl
      .getChildren(false, true, false)
      .filter((t) => t.targets().includes(glow as never));
    expect(glowTweens.length).toBeGreaterThan(0);
  });

  it('exit : le halo s’éteint complètement', () => {
    const glow: Record<string, unknown> = { opacity: 0.34 };

    const tween = engine.exit(glow);
    tween.progress(1);

    expect(glow['opacity']).toBe(0);
  });
});
