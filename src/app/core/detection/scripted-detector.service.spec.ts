import type { DetectionStatus, PresenceSample } from './detection-adapter';
import { ScriptedDetector } from './scripted-detector.service';

describe('ScriptedDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejette start() sans script défini', async () => {
    const detector = new ScriptedDetector();
    await expect(detector.start()).rejects.toThrow();
    expect(detector.status()).toBe('IDLE');
  });

  it('refuse setScript pendant l’exécution', () => {
    const detector = new ScriptedDetector();
    detector.setScript([{ afterMs: 0, present: false, distance: null }]);
    void detector.start();
    expect(() => detector.setScript([{ afterMs: 0, present: true, distance: 'NEAR' }])).toThrow();
    detector.stop();
  });

  it('émet le scénario pas à pas puis boucle (loop)', () => {
    const detector = new ScriptedDetector();
    detector.setScript(
      [
        { afterMs: 0, present: false, distance: null },
        { afterMs: 500, present: true, distance: 'NEAR' },
      ],
      { loop: true, tickMs: 250, loopTailMs: 1000 },
    );

    const samples: PresenceSample[] = [];
    detector.onSample((sample) => samples.push(sample));

    void detector.start(); // tick immédiat : t=0 → absent
    expect(detector.status()).toBe('RUNNING');
    expect(detector.lastSample?.present).toBe(false);

    vi.advanceTimersByTime(250); // t=250 → toujours absent
    expect(detector.lastSample?.present).toBe(false);

    vi.advanceTimersByTime(300); // t=550 → présent (étape afterMs 500)
    expect(detector.lastSample?.present).toBe(true);
    expect(detector.lastSample?.distance).toBe('NEAR');

    vi.advanceTimersByTime(450); // t=1000 → pas encore rebouclé (500+1000)
    expect(detector.lastSample?.present).toBe(true);

    vi.advanceTimersByTime(1000); // t=2000 > 1500 → rebouclage → absent
    expect(detector.lastSample?.present).toBe(false);

    const emitted = samples.length;
    detector.stop();
    vi.advanceTimersByTime(1000);
    expect(samples.length).toBe(emitted); // plus rien n'est émis
    expect(detector.status()).toBe('IDLE');
  });

  it('sans boucle : la dernière étape persiste jusqu’à stop()', () => {
    const detector = new ScriptedDetector();
    detector.setScript([
      { afterMs: 0, present: true, distance: 'FAR' },
      { afterMs: 400, present: false, distance: null },
    ]);
    void detector.start();

    vi.advanceTimersByTime(1000); // bien après la dernière étape
    expect(detector.lastSample?.present).toBe(false);
    detector.stop();
  });

  it('onSample — le désabonnement interrompt la réception', () => {
    const detector = new ScriptedDetector();
    detector.setScript([{ afterMs: 0, present: true, distance: 'VERY_NEAR' }]);
    const received: PresenceSample[] = [];
    const unsubscribe = detector.onSample((sample) => received.push(sample));
    void detector.start();
    unsubscribe();
    vi.advanceTimersByTime(500);
    expect(received.length).toBe(1); // seul le tick immédiat
    detector.stop();
  });
});
