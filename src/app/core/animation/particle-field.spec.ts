import { describe, expect, it } from 'vitest';
import { particleFieldFor } from './particle-field';
import { AURORA, GOLDEN_WELCOME } from '../../shared/models/scene.model';

describe('particleFieldFor — réglages du champ de particules', () => {
  it('le nombre de particules suit l’intensité', () => {
    const subtle = particleFieldFor('SUBTLE', GOLDEN_WELCOME);
    const elegant = particleFieldFor('ELEGANT', GOLDEN_WELCOME);
    const spectacular = particleFieldFor('SPECTACULAR', GOLDEN_WELCOME);
    expect(subtle.count).toBeLessThan(elegant.count);
    expect(elegant.count).toBeLessThan(spectacular.count);
  });

  it('la teinte vient de la scène : or pour Golden, argent pour Aurora', () => {
    expect(particleFieldFor('ELEGANT', GOLDEN_WELCOME).tint).toBe('#ffd58e');
    expect(particleFieldFor('ELEGANT', AURORA).tint).toBe('#cfe0ff');
  });

  it('la poussière monte (vitesse négative) et dérive latéralement', () => {
    const cfg = particleFieldFor('SPECTACULAR', AURORA);
    expect(cfg.riseSpeed).toBeLessThan(0);
    expect(cfg.driftPx).toBeGreaterThan(0);
    expect(cfg.radiusPx).toBeGreaterThan(0);
  });
});
