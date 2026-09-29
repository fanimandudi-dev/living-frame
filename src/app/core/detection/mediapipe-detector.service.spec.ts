import type { NgZone } from '@angular/core';
import { CameraService } from './camera.service';
import { MediaPipeDetectorService } from './mediapipe-detector.service';
import type { PresenceSample } from './detection-adapter';

/**
 * Détecteur dont l'initialisation WASM échoue systématiquement — sans mock
 * de module : on teste la vraie plomberie (statuts, nettoyage caméra),
 * le chargement du WASM étant l'affaire du vrai navigateur.
 */
class FailingInitDetector extends MediaPipeDetectorService {
  protected override async createDetector(): Promise<never> {
    throw new Error('WASM introuvable (test)');
  }
}

/** Zone factice : exécute immédiatement, hors aucune zone réelle. */
function fakeZone(): NgZone {
  return {
    runOutsideAngular: <T>(fn: () => T) => fn(),
    run: <T>(fn: () => T) => fn(),
  } as unknown as NgZone;
}

function stubGetUserMedia(impl: () => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
}

function makeDetector(): MediaPipeDetectorService {
  return new MediaPipeDetectorService(new CameraService(), fakeZone());
}

describe('MediaPipeDetectorService', () => {
  afterEach(() => {
    document.querySelectorAll('video').forEach((video) => video.remove());
  });

  it('TEST-03 — caméra refusée : start() rejette, statut DENIED, aucun échantillon', async () => {
    stubGetUserMedia(() =>
      Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })),
    );
    const detector = makeDetector();
    const samples: PresenceSample[] = [];
    detector.onSample((sample) => samples.push(sample));

    await expect(detector.start()).rejects.toThrow('refusé');
    expect(detector.status()).toBe('DENIED');
    expect(samples).toEqual([]);
    expect(detector.lastSample).toBeNull();

    // stop() après échec : sans erreur (état stable — EF-18).
    expect(() => detector.stop()).not.toThrow();
    expect(detector.status()).toBe('IDLE');
  });

  it('sans mediaDevices : statut UNAVAILABLE', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    const detector = makeDetector();
    await expect(detector.start()).rejects.toThrow();
    expect(detector.status()).toBe('UNAVAILABLE');
  });

  it('EF-18 — caméra OK mais détecteur en échec : statut ERROR, caméra libérée', async () => {
    stubGetUserMedia(() => Promise.resolve(fakeStream()));
    const detector = new FailingInitDetector(new CameraService(), fakeZone());

    await expect(detector.start()).rejects.toThrow('Initialisation du détecteur');
    expect(detector.status()).toBe('ERROR');

    // La vidéo hors écran a été retirée : la caméra est bien libérée.
    expect(document.querySelectorAll('video').length).toBe(0);

    // Un nouvel appel start() retente proprement (pas bloqué en ERROR).
    await expect(detector.start()).rejects.toThrow('Initialisation du détecteur');
  });

  it('start() pendant STARTING : le second appel retourne immédiatement', async () => {
    stubGetUserMedia(() => Promise.resolve(fakeStream()));
    const detector = new FailingInitDetector(new CameraService(), fakeZone());
    const first = detector.start().catch(() => undefined); // échouera (WASM test)
    const second = detector.start(); // statut STARTING → retour immédiat
    await Promise.all([first, second]); // le second résout sans erreur
  });

  it('onSample — le désabonnement interrompt la réception', () => {
    const detector = makeDetector();
    const received: PresenceSample[] = [];
    const unsubscribe = detector.onSample((sample) => received.push(sample));
    unsubscribe();
    expect(received).toEqual([]);
  });
});
