import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { DEFAULT_FRAME_CONFIG } from '../../models/frame-config.model';
import type { Scenario } from '../../models/scenario.model';
import type { FrameState } from '../../../core/interaction/interaction-state';
import { ArtworkStageComponent } from './artwork-stage.component';

describe('ArtworkStageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtworkStageComponent],
    }).compileComponents();
  });

  /** Crée la scène dans un état donné, avec surcharges optionnelles. */
  function createStage(
    state: FrameState,
    distance: 'FAR' | 'NEAR' | 'VERY_NEAR' | null = null,
    scenarioOverride: Partial<Scenario> = {},
    event: { name: string } = { name: '' },
    slideMs?: number,
  ): ComponentFixture<ArtworkStageComponent> {
    const fixture = TestBed.createComponent(ArtworkStageComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('distance', distance);
    fixture.componentRef.setInput('artwork', DEFAULT_FRAME_CONFIG.artwork);
    fixture.componentRef.setInput('scenario', {
      ...DEFAULT_FRAME_CONFIG.scenario,
      ...scenarioOverride,
    });
    fixture.componentRef.setInput('event', event);
    if (slideMs !== undefined) {
      fixture.componentRef.setInput('slideMs', slideMs);
    }
    fixture.detectChanges();
    return fixture;
  }

  function stageOf(fixture: ComponentFixture<ArtworkStageComponent>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche l’œuvre au repos avec le calque engagé invisible (IDLE)', () => {
    const element = stageOf(createStage('IDLE'));
    expect(element.querySelector<HTMLImageElement>('.stage__img')?.getAttribute('src')).toContain(
      'idle.jpg',
    );
    expect(
      element.querySelector<HTMLImageElement>('.stage__img--engaged')?.getAttribute('src'),
    ).toContain('engaged.jpg');
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.style.opacity).toBe('0');
  });

  it('ENGAGED : calque engagé à pleine opacité + message visible', () => {
    const element = stageOf(createStage('ENGAGED'));
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.style.opacity).toBe('1');
    const message = element.querySelector<HTMLElement>('.stage__message');
    expect(message?.classList.contains('visible')).toBe(true);
    expect(message?.textContent).toContain('Bienvenue dans notre histoire');
  });

  it('APPROACH : l’opacité suit la distance (0.55 en NEAR)', () => {
    const element = stageOf(createStage('APPROACH', 'NEAR'));
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.style.opacity).toBe('0.55');
  });

  it('transformation désactivée : le calque engagé reste invisible', () => {
    const element = stageOf(
      createStage('ENGAGED', null, { transformationEnabled: false }),
    );
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.style.opacity).toBe('0');
  });

  it('ENGAGED : l’œuvre est « vivante » (classe alive — respiration/chaleur)', () => {
    const element = stageOf(createStage('ENGAGED'));
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.classList.contains('alive')).toBe(
      true,
    );
  });

  it('IDLE : pas de classe alive (l’œuvre repose)', () => {
    const element = stageOf(createStage('IDLE'));
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.classList.contains('alive')).toBe(
      false,
    );
  });

  it('ligne nominative : le nom de l’événement s’affiche sous le message', () => {
    const element = stageOf(createStage('ENGAGED', null, {}, { name: 'Aline & Marc' }));
    const eventLine = element.querySelector<HTMLElement>('.stage__event');
    expect(eventLine?.textContent).toContain('Aline & Marc');
  });

  it('sans nom d’événement : pas de ligne nominative', () => {
    const element = stageOf(createStage('ENGAGED'));
    expect(element.querySelector('.stage__event')).toBeNull();
  });

  it('défilé : les photos sont empilées, la première est courante (ENGAGED)', () => {
    const element = stageOf(createStage('ENGAGED'));
    const imgs = element.querySelectorAll<HTMLImageElement>('.stage__img--engaged');
    expect(imgs.length).toBe(4); // œuvre de démonstration : transformation + 3 photos
    expect(imgs[0].classList.contains('current')).toBe(true);
    expect(imgs[1].classList.contains('current')).toBe(false);
  });

  it('défilé : passe à la photo suivante après la cadence', async () => {
    const fixture = createStage('ENGAGED', null, {}, undefined, 30);
    const element = stageOf(fixture);
    const imgs = () => element.querySelectorAll<HTMLImageElement>('.stage__img--engaged');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(imgs()[1].classList.contains('current')).toBe(true);
    });
  });

  it('défilé : au repos (IDLE), les photos ne défilent pas', async () => {
    const fixture = createStage('IDLE', null, {}, undefined, 30);
    const element = stageOf(fixture);
    await new Promise((resolve) => setTimeout(resolve, 90));
    fixture.detectChanges();
    const imgs = element.querySelectorAll<HTMLImageElement>('.stage__img--engaged');
    expect(imgs[0].classList.contains('current')).toBe(true);
  });

  it('défilé : retour à la première photo quand l’œuvre repose', async () => {
    const fixture = createStage('ENGAGED', null, {}, undefined, 30);
    const element = stageOf(fixture);
    const imgs = () => element.querySelectorAll<HTMLImageElement>('.stage__img--engaged');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(imgs()[1].classList.contains('current')).toBe(true);
    });
    fixture.componentRef.setInput('state', 'IDLE');
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(imgs()[0].classList.contains('current')).toBe(true);
    });
  });

  it('message désactivé : aucun message affiché en HOLD', () => {
    const element = stageOf(createStage('HOLD', null, { messageEnabled: false }));
    expect(element.querySelector<HTMLElement>('.stage__message')?.classList.contains('visible')).toBe(
      false,
    );
  });
});
