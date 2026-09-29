import 'fake-indexeddb/auto';
import { StorageService } from './storage.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import type { FrameConfig } from '../../shared/models/frame-config.model';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(async () => {
    storage = new StorageService();
    await storage.clearAll(); // base propre pour chaque test
  });

  it('base vide → loadConfig() retourne null (amorce des défauts)', async () => {
    expect(await storage.loadConfig()).toBeNull();
  });

  it('aller-retour complet de la configuration', async () => {
    const config = structuredClone(DEFAULT_FRAME_CONFIG);
    config.scenario.message = 'Bienvenue chez les Martin';
    config.scenario.holdDurationMs = 8000;

    await storage.saveConfig(config);
    expect(await storage.loadConfig()).toEqual(config);
  });

  it('la donnée survit à une nouvelle instance du service (même base)', async () => {
    const config = structuredClone(DEFAULT_FRAME_CONFIG);
    config.event.name = 'Mariage — test rechargement';
    await storage.saveConfig(config);

    const reloadedStorage = new StorageService();
    const loaded = await reloadedStorage.loadConfig();
    expect(loaded?.event.name).toBe('Mariage — test rechargement');
  });

  it('version de config inconnue → null (repli définitions, EF-15)', async () => {
    const bogus = {
      ...structuredClone(DEFAULT_FRAME_CONFIG),
      version: 999,
    } as unknown as FrameConfig;
    await storage.saveConfig(bogus);

    expect(await storage.loadConfig()).toBeNull();
  });

  it('aller-retour d’une image (octets + type préservés)', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([bytes], 'photo.jpg', { type: 'image/jpeg' });

    await storage.saveImage('artwork/idle', file);
    const loaded = await storage.loadImage('artwork/idle');

    expect(loaded).not.toBeNull();
    expect(loaded?.size).toBe(4);
    expect(loaded?.type).toBe('image/jpeg');
  });

  it('image inconnue → null', async () => {
    expect(await storage.loadImage('clé/inexistante')).toBeNull();
  });

  it('clearAll() efface tout', async () => {
    await storage.saveConfig(DEFAULT_FRAME_CONFIG);
    await storage.saveImage('artwork/idle', new File([new Uint8Array([9])], 'a.jpg'));

    await storage.clearAll();

    expect(await storage.loadConfig()).toBeNull();
    expect(await storage.loadImage('artwork/idle')).toBeNull();
  });
});
