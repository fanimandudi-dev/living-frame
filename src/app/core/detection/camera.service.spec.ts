import { CameraError, CameraService } from './camera.service';

/** getUserMedia piloté par le test. */
function stubGetUserMedia(impl: () => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: impl },
  });
}

function fakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  return { stream, stop };
}

describe('CameraService', () => {
  let camera: CameraService;

  beforeEach(() => {
    camera = new CameraService();
  });

  afterEach(() => {
    camera.close();
  });

  it('ouvre la caméra : vidéo hors écran alimentée par le flux', async () => {
    const { stream } = fakeStream();
    stubGetUserMedia(() => Promise.resolve(stream));

    const video = await camera.open();
    expect(video.srcObject).toBe(stream);
    expect(video.muted).toBe(true);
    expect(document.body.contains(video)).toBe(true);
    expect(video.style.width).toBe('1px');
  });

  it('idempotent : un second open() retourne le même élément', async () => {
    const { stream } = fakeStream();
    stubGetUserMedia(() => Promise.resolve(stream));
    const first = await camera.open();
    const second = await camera.open();
    expect(second).toBe(first);
  });

  it('close() coupe les pistes et retire l’élément (CA-11 : témoin éteint)', async () => {
    const { stream, stop } = fakeStream();
    stubGetUserMedia(() => Promise.resolve(stream));
    const video = await camera.open();

    camera.close();
    expect(stop).toHaveBeenCalledOnce();
    expect(document.body.contains(video)).toBe(false);

    // Un nouveau open() repart de zéro.
    const { stream: stream2 } = fakeStream();
    stubGetUserMedia(() => Promise.resolve(stream2));
    const reopened = await camera.open();
    expect(reopened).not.toBe(video);
  });

  it('TEST-03 — permission refusée (NotAllowedError) → CameraError DENIED', async () => {
    stubGetUserMedia(() =>
      Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    );
    await expect(camera.open()).rejects.toMatchObject({ failure: 'DENIED' });
    await expect(camera.open()).rejects.toBeInstanceOf(CameraError);
  });

  it('caméra absente (NotFoundError) → CameraError UNAVAILABLE', async () => {
    stubGetUserMedia(() =>
      Promise.reject(Object.assign(new Error('NotFound'), { name: 'NotFoundError' })),
    );
    await expect(camera.open()).rejects.toMatchObject({ failure: 'UNAVAILABLE' });
  });

  it('erreur inconnue → CameraError ERROR', async () => {
    stubGetUserMedia(() => Promise.reject(new Error('boom')));
    await expect(camera.open()).rejects.toMatchObject({ failure: 'ERROR' });
  });

  it('sans mediaDevices (contexte non sécurisé) → UNAVAILABLE', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    await expect(camera.open()).rejects.toMatchObject({ failure: 'UNAVAILABLE' });
  });
});
