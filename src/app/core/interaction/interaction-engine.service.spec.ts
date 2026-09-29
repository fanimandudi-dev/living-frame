import { signal } from '@angular/core';
import type {
  DetectionAdapter,
  DetectionStatus,
  PresenceSample,
} from '../detection/detection-adapter';
import { InteractionEngineService } from './interaction-engine.service';
import type { DistanceLevel } from './interaction-state';

/**
 * Adaptateur factice : émet des échantillons à la demande, avec l'horloge
 * (fictive) courante. Permet de tester le moteur sans caméra ni navigateur.
 */
class FakeDetector implements DetectionAdapter {
  readonly status = signal<DetectionStatus>('RUNNING');
  lastSample: PresenceSample | null = null;
  private readonly listeners = new Set<(sample: PresenceSample) => void>();

  start(): Promise<void> {
    return Promise.resolve();
  }

  stop(): void {}

  onSample(listener: (sample: PresenceSample) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(present: boolean, distance: DistanceLevel | null): void {
    const sample: PresenceSample = {
      present,
      distance: present ? distance : null,
      timestamp: performance.now(),
    };
    this.lastSample = sample;
    for (const listener of this.listeners) {
      listener(sample);
    }
  }
}

/**
 * Tests du moteur d'interaction — table de transitions T1–T13
 * (PHASE-1-architecture.md §6.4), avec horloge virtuelle.
 *
 * Convention : chaque emit() est précédé de advance(300) — cadence réaliste
 * d'un détecteur — et les timers du moteur avancent avec la même horloge.
 */
describe('InteractionEngineService', () => {
  let engine: InteractionEngineService;
  let detector: FakeDetector;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    });
    engine = new InteractionEngineService();
    detector = new FakeDetector();
    engine.attach(detector);
  });

  afterEach(() => {
    engine.detach();
    vi.useRealTimers();
  });

  /** 3 échantillons présents à 300 ms d'intervalle → présence confirmée à 900 ms. */
  function personArrives(distance: DistanceLevel = 'NEAR'): void {
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, distance);
    }
  }

  it('TEST-01 — cycle nominal : animée tant que la personne regarde, retour à son départ', () => {
    const trace: string[] = [];
    engine.onTransition((from, to) => trace.push(`${from}>${to}`));

    // Arrivée + confirmation de présence (600 ms) → APPROACH (T1)
    personArrives('NEAR');
    expect(engine.state()).toBe('APPROACH');

    // engageDelay (1200 ms) écoulé + distance NEAR → ENGAGED (T3)
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    expect(engine.state()).toBe('ENGAGED');

    // Fin de la transformation (2000 ms) → HOLD (T6)
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('HOLD');

    // La personne RESTE : le message persiste bien au-delà du plancher (5 s).
    for (let i = 0; i < 14; i++) {
      vi.advanceTimersByTime(500);
      detector.emit(true, 'NEAR');
    }
    expect(engine.state()).toBe('HOLD');

    // Elle s'en va : absence confirmée (1200 ms) → RESET (T8), puis IDLE.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('RESET');
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);

    expect(trace.join(' ')).toBe(
      'IDLE>APPROACH APPROACH>ENGAGED ENGAGED>HOLD HOLD>RESET RESET>IDLE',
    );
  });

  it('TEST-02 — sans personne, l’état reste IDLE indéfiniment', () => {
    for (let i = 0; i < 34; i++) {
      // ~10 secondes d'échantillons absents
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);
  });

  it('T2 — présence maintenue : l’œuvre reste en HOLD, pas de boucle mécanique', () => {
    personArrives('NEAR');
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    vi.advanceTimersByTime(2000); // → HOLD

    // La personne contemple longtemps : l'œuvre reste animée, sans rejouer.
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(500);
      detector.emit(true, 'VERY_NEAR');
    }
    expect(engine.state()).toBe('HOLD');
    expect(engine.armed()).toBe(false); // cycle consommé (mono-passe)
  });

  it('T5 — départ pendant APPROACH → RESET puis IDLE, réarmé', () => {
    personArrives('NEAR');
    expect(engine.state()).toBe('APPROACH');

    for (let i = 0; i < 5; i++) {
      // absence confirmée après 1200 ms
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('RESET');

    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);
  });

  it('T4 — délai écoulé mais trop loin : on reste en APPROACH, puis ENGAGED à l’approche', () => {
    personArrives('FAR');
    expect(engine.state()).toBe('APPROACH');

    // Trop loin pendant 1800 ms de plus (délai largement écoulé) → on attend.
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'FAR');
    }
    expect(engine.state()).toBe('APPROACH');

    // La personne s'approche → engagement au prochain échantillon.
    vi.advanceTimersByTime(300);
    detector.emit(true, 'NEAR');
    expect(engine.state()).toBe('ENGAGED');
  });

  it('T7 — plancher : départ immédiat → le message tient sa durée minimale', () => {
    personArrives('NEAR');
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    vi.advanceTimersByTime(2000); // → HOLD (t = 4100)
    expect(engine.state()).toBe('HOLD');

    // Elle part aussitôt : absence confirmée avant le plancher (5000 ms).
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('HOLD'); // plancher non écoulé : le message tient

    // Le plancher expire : absence confirmée → RESET.
    vi.advanceTimersByTime(3800); // → t = 9100
    expect(engine.state()).toBe('RESET');
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);
  });

  it('T8 — départ confirmé après le plancher → RESET immédiat', () => {
    personArrives('NEAR');
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    vi.advanceTimersByTime(2000); // → HOLD (t = 4100)
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(500);
      detector.emit(true, 'NEAR');
    } // t = 9100 : plancher écoulé, personne toujours là
    expect(engine.state()).toBe('HOLD');

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    } // absence confirmée à t = 10300 → RESET immédiat
    expect(engine.state()).toBe('RESET');
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);
  });

  it('CA-03 — présence brève (< 600 ms) : jamais d’APPROACH', () => {
    vi.advanceTimersByTime(300);
    detector.emit(true, 'NEAR');
    vi.advanceTimersByTime(300);
    detector.emit(true, 'NEAR'); // 300 ms de série : insuffisant
    vi.advanceTimersByTime(300);
    detector.emit(false, null); // repartie

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('IDLE');
  });

  it('CA-03 — absence brève pendant APPROACH (< 1200 ms) : pas de RESET', () => {
    personArrives('NEAR');
    expect(engine.state()).toBe('APPROACH');

    for (let i = 0; i < 3; i++) {
      // 900 ms d'absence : sous le seuil
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('APPROACH');

    // Retour de la personne : re-confirmation puis engagement.
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    expect(engine.state()).toBe('ENGAGED');
  });

  it('T12 — forceState efface les timers : pas de transition fantôme', () => {
    engine.forceState('ENGAGED');
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('HOLD');

    engine.forceState('ENGAGED');
    engine.forceState('IDLE');
    vi.advanceTimersByTime(10000);
    expect(engine.state()).toBe('IDLE');
  });

  it('T13 — reset() : retour à IDLE, réarmé, immédiatement rejouable', () => {
    engine.forceState('HOLD');
    engine.reset();
    expect(engine.state()).toBe('IDLE');
    expect(engine.armed()).toBe(true);

    vi.advanceTimersByTime(10000);
    expect(engine.state()).toBe('IDLE');
  });

  it('detach() — plus aucune réaction aux échantillons ni aux timers', () => {
    personArrives('NEAR');
    expect(engine.state()).toBe('APPROACH');

    engine.detach();
    expect(engine.state()).toBe('IDLE');
    expect(engine.personPresent()).toBe(false);

    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(true, 'NEAR');
    }
    vi.advanceTimersByTime(10000);
    expect(engine.state()).toBe('IDLE');
  });

  it('applyTimings — les délais du Studio s’appliquent immédiatement', () => {
    engine.applyTimings({ holdDurationMs: 100 });
    engine.forceState('ENGAGED');
    vi.advanceTimersByTime(2000);
    expect(engine.state()).toBe('HOLD');

    // Plancher réduit à 100 ms : au départ confirmé, RESET immédiat.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(300);
      detector.emit(false, null);
    }
    expect(engine.state()).toBe('RESET');
  });

  it('expose les faits de détection (présence, distance) sans transition', () => {
    vi.advanceTimersByTime(300);
    detector.emit(true, 'FAR');
    expect(engine.personPresent()).toBe(true);
    expect(engine.distance()).toBe('FAR');
    expect(engine.state()).toBe('IDLE'); // pas encore confirmée
  });
});
