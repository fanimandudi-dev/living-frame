import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { gsap } from 'gsap';
import {
  GOLDEN_WELCOME,
} from '../../models/scene.model';
import type {
  DistanceLevel,
  FrameState,
} from '../../../core/interaction/interaction-state';
import { SceneFxComponent } from './scene-fx.component';

describe('SceneFxComponent — calque de lumière', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneFxComponent],
    }).compileComponents();
  });

  function createFx(
    state: FrameState,
    distance: DistanceLevel | null = null,
  ): ComponentFixture<SceneFxComponent> {
    const fixture = TestBed.createComponent(SceneFxComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('distance', distance);
    fixture.componentRef.setInput('intensity', 'ELEGANT');
    fixture.componentRef.setInput('scene', GOLDEN_WELCOME);
    fixture.detectChanges();
    return fixture;
  }

  it('rend les deux matières de lumière (halo + balayage)', () => {
    const element = createFx('IDLE').nativeElement as HTMLElement;
    expect(element.querySelector('.fx__glow')).not.toBeNull();
    expect(element.querySelector('.fx__sweep')).not.toBeNull();
  });

  it('ENGAGED : la chorégraphie démarre (GSAP écrit sur le halo)', async () => {
    const fixture = createFx('ENGAGED');
    const glow = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.fx__glow',
    );
    // jsdom n'émet pas de rAF : on avance le ticker GSAP manuellement.
    await vi.waitFor(() => {
      gsap.ticker.tick();
      expect(glow?.style.opacity).not.toBe('');
    });
  });

  it('IDLE : la lumière se retire (opacité vers 0)', async () => {
    const fixture = createFx('IDLE');
    const glow = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.fx__glow',
    );
    await vi.waitFor(() => {
      gsap.ticker.tick();
      expect(glow?.style.opacity).not.toBe('');
    });
    // exit() amène le halo à 0 en 1,3 s (temps réel, ticker avancé à chaque essai).
    await vi.waitFor(
      () => {
        gsap.ticker.tick();
        expect(glow?.style.opacity === '0' || Number(glow?.style.opacity) <= 0.05).toBe(
          true,
        );
      },
      { timeout: 4000 },
    );
  });
});
