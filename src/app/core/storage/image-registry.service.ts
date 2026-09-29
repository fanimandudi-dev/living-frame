import { Injectable } from '@angular/core';
import type { ImageRef } from '../../shared/models/artwork.model';

/**
 * REGISTRE D'IMAGES — résout une ImageRef en URL affichable.
 *
 * PROBLÈME : une œuvre référencée par le Studio peut venir soit d'un asset
 * embarqué (démo), soit d'un fichier importé par l'organisateur (Blob).
 * Le renderer ne doit connaître que des URL — jamais la provenance.
 *
 * DÉCISION : un registre clé → object URL. Phase 4 : alimenté en mémoire par
 * le Studio (session courante). Phase 5 : backing IndexedDB — les composants
 * n'y verront rien, seul ce service change.
 */
@Injectable({ providedIn: 'root' })
export class ImageRegistryService {
  private readonly objectUrls = new Map<string, string>();

  /** Enregistre (ou remplace) le blob d'une clé ; révoque l'URL précédente. */
  register(key: string, blob: Blob): void {
    const previous = this.objectUrls.get(key);
    if (previous !== undefined) {
      URL.revokeObjectURL(previous);
    }
    this.objectUrls.set(key, URL.createObjectURL(blob));
  }

  /** Résout une référence d'image en URL affichable ('' si inconnue). */
  resolve(ref: ImageRef): string {
    return ref.source === 'asset' ? ref.path : (this.objectUrls.get(ref.key) ?? '');
  }

  /** Vrai si un blob est enregistré sous cette clé. */
  hasStored(key: string): boolean {
    return this.objectUrls.has(key);
  }
}
