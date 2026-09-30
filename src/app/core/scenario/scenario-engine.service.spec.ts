import 'fake-indexeddb/auto';
import { ImageRegistryService } from '../storage/image-registry.service';
import { StorageService } from '../storage/storage.service';
import { ScenarioEngineService } from './scenario-engine.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import type { FrameConfig } from '../../shared/models/frame-config.model';
import type { LegacyArtwork } from '../../shared/models/artwork.model';

/** Stub systématique des object URLs (voir image-registry.service.spec.ts). */
function stubObjectUrls(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => `blob:mock-${Math.random().toString(36).slice(2, 8)}`,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => undefined,
  });
}

/** Configuration avec œuvre importée (références stockées) et message personnalisé. */
function configWithStoredArtwork(): FrameConfig {
  const config = structuredClone(DEFAULT_FRAME_CONFIG);
  config.scenario.message = 'Bienvenue chez les Martin';
  config.artwork = {
    ...config.artwork,
    idleImage: { source: 'stored', key: 'artwork/idle' },
    engagedImages: [{ source: 'stored', key: 'artwork/engaged' }],
  };
  return config;
}

/** StorageService dont toutes les opérations échouent (matrice d'erreurs). */
function failingStorage(): StorageService {
  return {
    loadConfig: () => Promise.reject(new Error('boom')),
    saveConfig: () => Promise.reject(new Error('boom')),
    saveImage: () => Promise.reject(new Error('boom')),
    loadImage: () => Promise.reject(new Error('boom')),
    clearAll: () => Promise.reject(new Error('boom')),
  } as unknown as StorageService;
}

describe('ScenarioEngineService — persistance (fake-indexeddb)', () => {
  beforeEach(async () => {
    stubObjectUrls();
    await new StorageService().clearAll();
  });

  it('load() sans configuration persistée → défauts embarqués, aucune erreur (EF-15)', async () => {
    const engine = new ScenarioEngineService(new StorageService(), new ImageRegistryService());
    await engine.load();

    expect(engine.config()).toEqual(DEFAULT_FRAME_CONFIG);
    expect(engine.persistenceError()).toBeNull();
  });

  it('migration — une configuration antérieure au défilé (photo unique) devient une séquence', async () => {
    // Données écrites par une version antérieure au 30/09/2026.
    const legacyArtwork: LegacyArtwork = {
      id: 'legacy',
      name: 'Œuvre ancienne',
      idleImage: { source: 'asset', path: 'artworks/demo/idle.jpg' },
      engagedImage: { source: 'asset', path: 'artworks/demo/engaged.jpg' },
    };
    const legacyConfig = {
      ...structuredClone(DEFAULT_FRAME_CONFIG),
      artwork: legacyArtwork,
    } as unknown as FrameConfig;

    const storage = new StorageService();
    await storage.saveConfig(legacyConfig);

    const engine = new ScenarioEngineService(storage, new ImageRegistryService());
    await engine.load();

    expect(engine.config().artwork.engagedImages).toEqual([
      { source: 'asset', path: 'artworks/demo/engaged.jpg' },
    ]);
    expect(engine.persistenceError()).toBeNull();
  });

  it('CA-09 — après « redémarrage », configuration et images sont restaurées', async () => {
    const storage = new StorageService();
    const file = new File([new Uint8Array([7, 7, 7])], 'mariage.jpg', { type: 'image/jpeg' });

    // Session 1 : import d'une image + enregistrement de la configuration.
    const engineA = new ScenarioEngineService(storage, new ImageRegistryService());
    await engineA.saveImage('artwork/idle', file);
    await engineA.save(configWithStoredArtwork());

    // « Redémarrage » : nouvelles instances de services, même base locale.
    const registryB = new ImageRegistryService();
    const engineB = new ScenarioEngineService(storage, registryB);
    await engineB.load();

    expect(engineB.config().scenario.message).toBe('Bienvenue chez les Martin');
    expect(engineB.config().artwork.idleImage).toEqual({
      source: 'stored',
      key: 'artwork/idle',
    });
    expect(registryB.hasStored('artwork/idle')).toBe(true);
  });

  it('TEST-04 à travers la persistance — le message édité survit au redémarrage', async () => {
    const storage = new StorageService();
    const engineA = new ScenarioEngineService(storage, new ImageRegistryService());
    const config = structuredClone(DEFAULT_FRAME_CONFIG);
    config.scenario.message = 'Bienvenue à l’hôtel Lumière';
    await engineA.save(config);

    const engineB = new ScenarioEngineService(storage, new ImageRegistryService());
    await engineB.load();
    expect(engineB.config().scenario.message).toBe('Bienvenue à l’hôtel Lumière');
  });

  it('repli sur erreur de stockage : config active en mémoire + erreur signalée', async () => {
    const engine = new ScenarioEngineService(failingStorage(), new ImageRegistryService());

    // save() : la config est publiée même si la persistance échoue.
    const config = structuredClone(DEFAULT_FRAME_CONFIG);
    config.scenario.message = 'Test';
    await engine.save(config);
    expect(engine.config().scenario.message).toBe('Test');
    expect(engine.persistenceError()).not.toBeNull();

    // load() en échec : la dernière configuration active reste en mémoire
    // (on ne rejoue pas les défauts par-dessus le travail en cours),
    // et l'erreur reste signalée.
    await engine.load();
    expect(engine.config().scenario.message).toBe('Test');
    expect(engine.persistenceError()).not.toBeNull();
  });
});
