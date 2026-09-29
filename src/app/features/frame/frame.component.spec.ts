import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MediaPipeDetectorService } from '../../core/detection/mediapipe-detector.service';
import { KioskService } from '../../core/kiosk.service';
import { InteractionEngineService } from '../../core/interaction/interaction-engine.service';
import { ScenarioEngineService } from '../../core/scenario/scenario-engine.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import type { FrameConfig } from '../../shared/models/frame-config.model';
import { FrameComponent } from './frame.component';

/** Copie modifiable de la configuration par défaut. */
function configWith(patch: (config: FrameConfig) => void): FrameConfig {
  const config = structuredClone(DEFAULT_FRAME_CONFIG);
  patch(config);
  return config;
}

describe('FrameComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('affiche l’œuvre initiale, calque engagé invisible (IDLE)', () => {
    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const idle = element.querySelector<HTMLImageElement>('.stage__img');
    const engaged = element.querySelector<HTMLImageElement>('.stage__img--engaged');

    expect(idle?.getAttribute('src')).toContain('idle.jpg');
    expect(engaged?.getAttribute('src')).toContain('engaged.jpg');
    expect(engaged?.style.opacity).toBe('0');
  });

  it('TEST-04 — le message configuré s’affiche en ENGAGED, calque engagé visible', async () => {
    const scenario = TestBed.inject(ScenarioEngineService);
    const engine = TestBed.inject(InteractionEngineService);
    await scenario.save(
      configWith((config) => {
        config.scenario.message = 'Bienvenue chez les Martin';
      }),
    );

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();

    engine.forceState('ENGAGED');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const message = element.querySelector<HTMLElement>('.stage__message');
    expect(message?.textContent).toContain('Bienvenue chez les Martin');
    expect(message?.classList.contains('visible')).toBe(true);
    expect(element.querySelector<HTMLImageElement>('.stage__img--engaged')?.style.opacity).toBe(
      '1',
    );
  });

  it('transformation désactivée → le calque engagé reste invisible', async () => {
    const scenario = TestBed.inject(ScenarioEngineService);
    const engine = TestBed.inject(InteractionEngineService);
    await scenario.save(
      configWith((config) => {
        config.scenario.transformationEnabled = false;
      }),
    );

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();

    engine.forceState('ENGAGED');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(
      element.querySelector<HTMLElement>('.stage__img--engaged')?.style.opacity,
    ).toBe('0');
  });

  it('message désactivé → aucun message visible en HOLD', async () => {
    const scenario = TestBed.inject(ScenarioEngineService);
    const engine = TestBed.inject(InteractionEngineService);
    await scenario.save(
      configWith((config) => {
        config.scenario.messageEnabled = false;
      }),
    );

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();

    engine.forceState('HOLD');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector<HTMLElement>('.stage__message')?.classList.contains('visible')).toBe(
      false,
    );
  });

  // ---------------------------------------------- intégration (Phase 7)

  it('detectionEnabled = false → la caméra n’est jamais ouverte', async () => {
    const scenario = TestBed.inject(ScenarioEngineService);
    await scenario.save(
      configWith((config) => {
        config.scenario.detectionEnabled = false;
      }),
    );
    const detector = TestBed.inject(MediaPipeDetectorService);
    const startSpy = vi.spyOn(detector, 'start').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(startSpy).not.toHaveBeenCalled();
    expect(TestBed.inject(InteractionEngineService).state()).toBe('IDLE');
  });

  it('échec caméra (UNAVAILABLE) → IDLE, aucune exception, point discret affiché', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();
    // Pas de whenStable : le timer de retentative (5 s) maintiendrait la zone
    // instable. On attend directement le résultat observé (point discret).
    await vi.waitFor(() => {
      fixture.detectChanges(); // OnPush : rafraîchit le DOM à chaque sondage
      const status = (fixture.nativeElement as HTMLElement).querySelector('[data-status]');
      expect(status?.getAttribute('data-status')).toBe('UNAVAILABLE');
    });
    expect(TestBed.inject(InteractionEngineService).state()).toBe('IDLE');
  });

  // ---------------------------------------------- prototype physique (Phase 9)

  it('premier toucher de l’œuvre → kiosque (plein écran + anti-veille), une seule fois', async () => {
    // Détection désactivée : le test UI n'a pas besoin de caméra, et l'on
    // évite le timer de retentative (qui maintiendrait la zone instable).
    const scenarioSvc = TestBed.inject(ScenarioEngineService);
    await scenarioSvc.save(configWith((c) => (c.scenario.detectionEnabled = false)));

    const kiosk = TestBed.inject(KioskService);
    const kioskSpy = vi.spyOn(kiosk, 'enterKioskMode').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    element.dispatchEvent(new Event('pointerdown'));
    element.dispatchEvent(new Event('pointerdown'));
    expect(kioskSpy).toHaveBeenCalledTimes(1);
  });

  it('long-press : le menu contextuel est désactivé (kiosque)', async () => {
    const scenarioSvc = TestBed.inject(ScenarioEngineService);
    await scenarioSvc.save(configWith((c) => (c.scenario.detectionEnabled = false)));

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const event = new Event('contextmenu', { cancelable: true });
    (fixture.nativeElement as HTMLElement).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('récupération — panne UNAVAILABLE : une retentative après 5 s, pas plus', async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined, // → UNAVAILABLE
    });

    const detector = TestBed.inject(MediaPipeDetectorService);
    const startSpy = vi.spyOn(detector, 'start'); // callThrough

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(100); // déroule ngOnInit → load → start
    expect(startSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000); // retentative unique
    expect(startSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(10000); // plus rien : max 1 retentative
    expect(startSpy).toHaveBeenCalledTimes(2);

    fixture.destroy();
    vi.useRealTimers();
  });

  // Ce test reste EN DERNIER : il surcharge ActivatedRoute (?demo=1) pour
  // toute la suite du fichier — isolation simple et explicite.
  it('?demo=1 → détecteur scripté : le cycle avance tout seul, caméra jamais sollicitée', async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    });
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap({ demo: '1' }) } },
    });

    const detector = TestBed.inject(MediaPipeDetectorService);
    const startSpy = vi.spyOn(detector, 'start').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(FrameComponent);
    fixture.detectChanges(); // ngOnInit → load() → .then → startDemo
    await vi.advanceTimersByTimeAsync(0); // déroule la chaîne de promesses
    await vi.advanceTimersByTimeAsync(0);

    const engine = TestBed.inject(InteractionEngineService);

    vi.advanceTimersByTime(2000); // présence simulée confirmée (~1,75 s)
    expect(engine.state()).toBe('APPROACH');

    vi.advanceTimersByTime(1600); // NEAR + engageDelay → ENGAGED (~3 s)
    expect(engine.state()).toBe('ENGAGED');

    expect(startSpy).not.toHaveBeenCalled(); // jamais la caméra en mode démo

    fixture.destroy();
    vi.useRealTimers();
  });
});
