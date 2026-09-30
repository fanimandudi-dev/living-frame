import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InteractionEngineService } from '../../core/interaction/interaction-engine.service';
import { PreviewComponent } from './preview.component';

describe('PreviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('s’examine : crée le composant, affiche la scène et les 5 états', () => {
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('lf-artwork-stage')).not.toBeNull();
    expect(element.querySelectorAll('[data-state]').length).toBe(5);
  });

  it('force un état via les commandes manuelles (T12) — la scène suit', () => {
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.detectChanges();
    const engine = TestBed.inject(InteractionEngineService);

    const element: HTMLElement = fixture.nativeElement;
    (element.querySelector('[data-state="ENGAGED"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(engine.state()).toBe('ENGAGED');
    expect(element.querySelector<HTMLElement>('.stage__engaged')?.style.opacity).toBe('1');
  });

  it('Réinitialiser → IDLE et réarmé (T13)', () => {
    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.detectChanges();
    const engine = TestBed.inject(InteractionEngineService);
    engine.forceState('HOLD');

    (fixture.nativeElement.querySelector('[data-action="reset"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);
  });

  it('capteur réel : échec caméra propre — statut affiché, aucun crash (TEST-03, UI)', async () => {
    // jsdom : pas de mediaDevices → chemin UNAVAILABLE, sans exception.
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    const fixture = TestBed.createComponent(PreviewComponent);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('[data-action="real-detection"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[data-status]');
    expect(status?.getAttribute('data-status')).toBe('UNAVAILABLE');
    expect(status?.textContent).toContain('caméra');
    // Le moteur n'a jamais été branché : IDLE.
    expect(TestBed.inject(InteractionEngineService).state()).toBe('IDLE');
  });
});
