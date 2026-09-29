import { TestBed } from '@angular/core/testing';
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

  /** Crée la scène dans un état donné, avec surcharges de scénario optionnelles. */
  function createStage(
    state: FrameState,
    distance: 'FAR' | 'NEAR' | 'VERY_NEAR' | null = null,
    scenarioOverride: Partial<Scenario> = {},
  ): ComponentFixture<ArtworkStageComponent> {
    const fixture = TestBed.createComponent(ArtworkStageComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('distance', distance);
    fixture.componentRef.setInput('artwork', DEFAULT_FRAME_CONFIG.artwork);
    fixture.componentRef.setInput('scenario', {
      ...DEFAULT_FRAME_CONFIG.scenario,
      ...scenarioOverride,
    });
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
    expect(element.querySelector<HTMLElement>('.stage__img--engaged')?.style.opacity).toBe('0');
  });

  it('ENGAGED : calque engagé à pleine opacité + message visible', () => {
    const element = stageOf(createStage('ENGAGED'));
    expect(element.querySelector<HTMLElement>('.stage__img--engaged')?.style.opacity).toBe('1');
    const message = element.querySelector<HTMLElement>('.stage__message');
    expect(message?.classList.contains('visible')).toBe(true);
    expect(message?.textContent).toContain('Bienvenue dans notre histoire');
  });

  it('APPROACH : l’opacité suit la distance (0.55 en NEAR)', () => {
    const element = stageOf(createStage('APPROACH', 'NEAR'));
    expect(element.querySelector<HTMLElement>('.stage__img--engaged')?.style.opacity).toBe('0.55');
  });

  it('transformation désactivée : le calque engagé reste invisible', () => {
    const element = stageOf(
      createStage('ENGAGED', null, { transformationEnabled: false }),
    );
    expect(element.querySelector<HTMLElement>('.stage__img--engaged')?.style.opacity).toBe('0');
  });

  it('message désactivé : aucun message affiché en HOLD', () => {
    const element = stageOf(createStage('HOLD', null, { messageEnabled: false }));
    expect(element.querySelector<HTMLElement>('.stage__message')?.classList.contains('visible')).toBe(
      false,
    );
  });
});
