import { describe, expect, it } from 'vitest';
import {
  AURORA,
  GOLDEN_WELCOME,
  SCENE_VARIATIONS,
  variationPhases,
} from './scene.model';
import type { ScenePhases } from './scene.model';

/** Invariants structurels : une chorégraphie doit rester racontable. */
function expectCoherent(phases: ScenePhases): void {
  expect(phases.calmMs).toBeGreaterThanOrEqual(100);
  expect(phases.sweepAtMs).toBeGreaterThanOrEqual(phases.calmMs);
  expect(phases.messageAtMs).toBeGreaterThanOrEqual(phases.sweepAtMs);
  expect(phases.eventAtMs).toBeGreaterThan(phases.messageAtMs);
  expect(phases.sweepMs).toBeGreaterThan(0);
  expect(phases.glowMs).toBeGreaterThan(0);
}

describe('variationPhases — variations de chorégraphie (Étape C)', () => {
  it('CLASSIC : les phases de base, inchangées', () => {
    const phases = variationPhases(GOLDEN_WELCOME.phases, 'CLASSIC');
    expect(phases).toEqual(GOLDEN_WELCOME.phases);
  });

  it('LIGHT_FIRST : la lumière et le message arrivent plus tôt', () => {
    for (const scene of [GOLDEN_WELCOME, AURORA]) {
      const phases = variationPhases(scene.phases, 'LIGHT_FIRST');
      expectCoherent(phases);
      expect(phases.sweepAtMs).toBeLessThan(scene.phases.sweepAtMs);
      expect(phases.messageAtMs).toBeLessThan(scene.phases.messageAtMs);
    }
  });

  it('SLOW_BLOOM : tout s’étire, le message arrive plus tard', () => {
    for (const scene of [GOLDEN_WELCOME, AURORA]) {
      const phases = variationPhases(scene.phases, 'SLOW_BLOOM');
      expectCoherent(phases);
      expect(phases.calmMs).toBeGreaterThan(scene.phases.calmMs);
      expect(phases.sweepMs).toBeGreaterThan(scene.phases.sweepMs);
      expect(phases.messageAtMs).toBeGreaterThan(scene.phases.messageAtMs);
    }
  });

  it('les trois variations tournent sans en produire deux identiques', () => {
    const ids = SCENE_VARIATIONS.map((v) => v.id);
    expect(ids).toHaveLength(3);
    const signatures = [GOLDEN_WELCOME, AURORA].flatMap((scene) =>
      ids.map((id) => JSON.stringify(variationPhases(scene.phases, id))),
    );
    // Pour chaque scène, les 3 déroulés diffèrent.
    for (const scene of [GOLDEN_WELCOME, AURORA]) {
      const set = new Set(ids.map((id) => JSON.stringify(variationPhases(scene.phases, id))));
      expect(set.size).toBe(3);
    }
    expect(signatures.length).toBe(6);
  });
});
