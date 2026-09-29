import { Injectable } from '@angular/core';
import type { FrameConfig } from '../../shared/models/frame-config.model';

/** Enregistrement du store « config » (keyPath 'id'). */
interface ConfigRecord {
  id: string;
  config: FrameConfig;
}

/** Image persistée : type MIME + octets (structured clone fiable partout). */
interface StoredImage {
  type: string;
  data: ArrayBuffer;
}

/**
 * PERSISTANCE LOCALE — IndexedDB, sans bibliothèque (décision Phase 1).
 *
 * Deux stores :
 * - "config" (keyPath 'id', clé unique 'active') → FrameConfig (JSON) ;
 * - "images" (clés 'artwork/idle' | 'artwork/engaged') → images importées.
 *
 * Les images sont stockées sous forme { type, data: ArrayBuffer } plutôt que
 * Blob brut : le structured clone d'un ArrayBuffer est fiable partout
 * (navigateurs, tests Node), celui d'un File ne l'est pas.
 *
 * Erreurs : chaque méthode REJETTE en cas d'échec. Ce sont les appelants
 * (ScenarioEngine, Studio) qui dégradent — jamais ce service.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private static readonly DB_NAME = 'living-frame';
  private static readonly DB_VERSION = 1;
  private static readonly CONFIG_STORE = 'config';
  private static readonly IMAGES_STORE = 'images';
  private static readonly CONFIG_KEY = 'active';

  private dbPromise: Promise<IDBDatabase> | null = null;

  // ------------------------------------------------------------ ouverture

  /** Ouvre (et crée si besoin) la base — promesse mémorisée. */
  private open(): Promise<IDBDatabase> {
    if (this.dbPromise === null) {
      const promise = this.doOpen();
      // Échec d'ouverture : on autorise une nouvelle tentative plus tard.
      promise.catch(() => {
        if (this.dbPromise === promise) {
          this.dbPromise = null;
        }
      });
      this.dbPromise = promise;
    }
    return this.dbPromise;
  }

  private doOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB indisponible dans ce contexte.'));
        return;
      }
      const request = indexedDB.open(StorageService.DB_NAME, StorageService.DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(StorageService.CONFIG_STORE)) {
          db.createObjectStore(StorageService.CONFIG_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(StorageService.IMAGES_STORE)) {
          db.createObjectStore(StorageService.IMAGES_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Impossible d’ouvrir la base locale.'));
    });
  }

  /** Exécute une requête dans une transaction ; rejette en cas d'échec. */
  private async run<T>(
    mode: IDBTransactionMode,
    storeName: string,
    work: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = work(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Requête IndexedDB en échec.'));
      tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
    });
  }

  // ------------------------------------------------------------- config

  /**
   * Configuration persistée, ou null si absente ou de version inconnue
   * (garde-fou de migration — EF-15 : on retombe sur les défauts).
   */
  async loadConfig(): Promise<FrameConfig | null> {
    const record = await this.run<ConfigRecord | undefined>(
      'readonly',
      StorageService.CONFIG_STORE,
      (store) => store.get(StorageService.CONFIG_KEY) as IDBRequest<ConfigRecord | undefined>,
    );
    if (record === undefined || record === null) {
      return null;
    }
    if (record.config?.version !== 1) {
      return null; // version non gérée par ce build → défauts embarqués
    }
    return record.config;
  }

  async saveConfig(config: FrameConfig): Promise<void> {
    await this.run<IDBValidKey>(
      'readwrite',
      StorageService.CONFIG_STORE,
      (store) => store.put({ id: StorageService.CONFIG_KEY, config }),
    );
  }

  // ------------------------------------------------------------- images

  /** Persiste une image importée (clé : 'artwork/idle' | 'artwork/engaged'). */
  async saveImage(key: string, blob: Blob): Promise<void> {
    const record: StoredImage = { type: blob.type, data: await blob.arrayBuffer() };
    await this.run<IDBValidKey>(
      'readwrite',
      StorageService.IMAGES_STORE,
      (store) => store.put(record, key),
    );
  }

  /** Blob de l'image persistée, ou null si la clé est inconnue. */
  async loadImage(key: string): Promise<Blob | null> {
    const record = await this.run<StoredImage | undefined>(
      'readonly',
      StorageService.IMAGES_STORE,
      (store) => store.get(key) as IDBRequest<StoredImage | undefined>,
    );
    if (record === undefined || record === null) {
      return null;
    }
    return new Blob([record.data], { type: record.type });
  }

  // ------------------------------------------------------------ maintenance

  /** Efface config et images (développement, démos). */
  async clearAll(): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([StorageService.CONFIG_STORE, StorageService.IMAGES_STORE], 'readwrite');
      tx.objectStore(StorageService.CONFIG_STORE).clear();
      tx.objectStore(StorageService.IMAGES_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Nettoyage impossible.'));
      tx.onabort = () => reject(tx.error ?? new Error('Nettoyage annulé.'));
    });
  }
}
