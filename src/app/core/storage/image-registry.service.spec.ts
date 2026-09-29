import { ImageRegistryService } from './image-registry.service';

/**
 * Stub SYSTÉMATIQUE des object URLs : dans l'environnement de test, l'URL
 * de Node/undici existe mais ne comprend pas les File de jsdom (erreur _bytes).
 * Vitest isole chaque fichier : la redéfinition est contenue.
 */
function stubObjectUrls(): { created: string[]; revoked: string[] } {
  const created: string[] = [];
  const revoked: string[] = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (_blob: Blob) => {
      const url = `blob:mock-${created.length + 1}`;
      created.push(url);
      return url;
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: (url: string) => revoked.push(url),
  });
  return { created, revoked };
}

describe('ImageRegistryService', () => {
  it('résout un asset embarqué tel quel', () => {
    stubObjectUrls();
    const registry = new ImageRegistryService();
    expect(registry.resolve({ source: 'asset', path: 'artworks/demo/idle.jpg' })).toBe(
      'artworks/demo/idle.jpg',
    );
  });

  it('enregistre un blob et le résout par clé', () => {
    const { created } = stubObjectUrls();
    const registry = new ImageRegistryService();
    const file = new File(['x'], 'couple.jpg', { type: 'image/jpeg' });

    registry.register('artwork/idle', file);
    expect(created).toEqual(['blob:mock-1']);
    expect(registry.hasStored('artwork/idle')).toBe(true);
    expect(registry.resolve({ source: 'stored', key: 'artwork/idle' })).toBe('blob:mock-1');
  });

  it('remplacer un blob révoque l’ancienne object URL (pas de fuite)', () => {
    const { created, revoked } = stubObjectUrls();
    const registry = new ImageRegistryService();
    registry.register('artwork/idle', new File(['a'], 'a.jpg'));
    registry.register('artwork/idle', new File(['b'], 'b.jpg'));

    expect(created).toEqual(['blob:mock-1', 'blob:mock-2']);
    expect(revoked).toEqual(['blob:mock-1']);
    expect(registry.resolve({ source: 'stored', key: 'artwork/idle' })).toBe('blob:mock-2');
  });

  it('une clé stockée inconnue se résout en chaîne vide (repli visible : rien)', () => {
    stubObjectUrls();
    const registry = new ImageRegistryService();
    expect(registry.resolve({ source: 'stored', key: 'inconnue' })).toBe('');
    expect(registry.hasStored('inconnue')).toBe(false);
  });
});
