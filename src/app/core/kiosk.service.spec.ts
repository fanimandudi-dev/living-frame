import { KioskService } from './kiosk.service';

describe('KioskService', () => {
  it('sans APIs (jsdom nu) : enterKioskMode et release ne lèvent rien', async () => {
    // jsdom n'implémente ni Fullscreen ni Wake Lock : premier test sur
    // l'état « navigateur nu » pour valider les replis silencieux.
    const kiosk = new KioskService();
    await expect(kiosk.enterKioskMode()).resolves.toBeUndefined();
    await expect(kiosk.release()).resolves.toBeUndefined();
  });

  it('demande plein écran + wake lock, puis les libère', async () => {
    // État plein écran piloté : null avant enterKioskMode,
    // « en plein écran » au moment du release.
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });

    const requestFullscreen = vi.fn().mockImplementation(() => {
      fullscreenElement = document.documentElement;
      return Promise.resolve();
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const exitFullscreen = vi.fn().mockImplementation(() => {
      fullscreenElement = null;
      return Promise.resolve();
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    });

    const kiosk = new KioskService();
    await kiosk.enterKioskMode();

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith('screen');

    await kiosk.release();
    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('Phase 9 — ré-acquiert le wake lock au retour de visibilité, puis s’arrête', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('non')), // silencieux
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });

    let requestCalls = 0;
    const sentinels = [{ release: vi.fn() }, { release: vi.fn() }];
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: vi.fn().mockImplementation(() => Promise.resolve(sentinels[requestCalls++])),
      },
    });

    const kiosk = new KioskService();
    await kiosk.enterKioskMode();
    expect(requestCalls).toBe(1);

    // Retour de visibilité (écran rallumé) → nouvelle acquisition.
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(requestCalls).toBe(2);

    // Après release(), plus aucune ré-acquisition.
    await kiosk.release();
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(requestCalls).toBe(2);
  });
});
