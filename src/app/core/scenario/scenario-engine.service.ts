import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_INTERACTION_TIMINGS } from '../interaction/interaction-state';
import type { InteractionTimings } from '../interaction/interaction-state';
import { ImageRegistryService } from '../storage/image-registry.service';
import { StorageService } from '../storage/storage.service';
import { DEFAULT_FRAME_CONFIG } from '../../shared/models/frame-config.model';
import type { FrameConfig } from '../../shared/models/frame-config.model';
import { normalizeArtwork } from '../../shared/models/artwork.model';
import type { Artwork } from '../../shared/models/artwork.model';

/**
 * SCENARIO ENGINE — configuration active + persistance locale.
 *
 * Responsabilités (Phase 5) :
 * - charger la configuration au démarrage (IndexedDB → défauts si vide/corrompue) ;
 * - publier immédiatement toute sauvegarde (le Frame suit en direct, TEST-04) ;
 * - persister config et images importées ;
 * - réhydrater les object URLs des images stockées au chargement ;
 * - exposer une erreur de persistance lisible par le Studio (matrice d'erreurs).
 *
 * Toute erreur de stockage DÉGRADE, ne casse jamais : la configuration reste
 * active en mémoire, le produit continue de fonctionner (ENF-R1).
 *
 * Injection par constructeur (plutôt qu'inject()) : permet de simuler un
 * « redémarrage » dans les tests par simple `new` (CA-09).
 */
@Injectable({ providedIn: 'root' })
export class ScenarioEngineService {
  private readonly _config = signal<FrameConfig>(DEFAULT_FRAME_CONFIG);

  /** Configuration active (œuvre + scénario + événement). */
  readonly config = this._config.asReadonly();

  /** Timings dérivés du scénario actif, pour InteractionEngine.applyTimings(). */
  readonly timings = computed<InteractionTimings>(() => {
    const scenario = this._config().scenario;
    return {
      ...DEFAULT_INTERACTION_TIMINGS,
      engageDelayMs: scenario.engageDelayMs,
      holdDurationMs: scenario.holdDurationMs,
      resetDelayMs: scenario.resetDelayMs,
    };
  });

  /** Erreur de persistance la plus récente (null = OK) — affichée par le Studio. */
  readonly persistenceError = signal<string | null>(null);

  constructor(
    private readonly storage: StorageService,
    private readonly registry: ImageRegistryService,
  ) {}

  /**
   * Charge la configuration persistée et réhydrate ses images.
   * Base vide, corrompue, version inconnue ou indisponible → défauts (EF-15).
   */
  async load(): Promise<void> {
    try {
      const stored = await this.storage.loadConfig();
      if (stored !== null) {
        // Migration douce : les configurations antérieures au défilé
        // (30/09/2026) n'ont qu'une photo engagée — on les normalise
        // en séquence, sans jamais réécrire la base.
        const artwork = normalizeArtwork(stored.artwork);
        // Fusion avec les défauts : les champs ajoutés après coup (scène,
        // intensité — V1, 30/09/2026) trouvent leurs valeurs sans jamais
        // réécrire la base.
        const scenario = { ...DEFAULT_FRAME_CONFIG.scenario, ...stored.scenario };
        const event = { ...DEFAULT_FRAME_CONFIG.event, ...stored.event };
        // D'abord les object URLs (pour que la config publiée s'affiche d'emblée),
        // ensuite la configuration.
        await this.hydrateImages(artwork);
        this._config.set({ ...stored, artwork, scenario, event });
      }
      this.persistenceError.set(null);
    } catch {
      this.persistenceError.set(
        'Configuration locale illisible — valeurs par défaut appliquées.',
      );
    }
  }

  /**
   * Publie la configuration (le Frame réagit sans rechargement) puis la persiste.
   * En cas d'échec de persistance : la config reste active pour la session.
   */
  async save(config: FrameConfig): Promise<void> {
    this._config.set(config);
    try {
      await this.storage.saveConfig(config);
      this.persistenceError.set(null);
    } catch {
      this.persistenceError.set(
        'Enregistrement local impossible (stockage plein ou indisponible ?).',
      );
    }
  }

  /** Persiste une image importée (EF-14) — l'aperçu reste géré par le registre. */
  async saveImage(key: string, blob: Blob): Promise<void> {
    try {
      await this.storage.saveImage(key, blob);
      this.persistenceError.set(null);
    } catch {
      this.persistenceError.set(
        'Impossible d’enregistrer l’image (stockage plein ou indisponible ?).',
      );
    }
  }

  /** Retour à la configuration par défaut embarquée (EF-15). */
  async resetToDefault(): Promise<void> {
    this._config.set(DEFAULT_FRAME_CONFIG);
    try {
      await this.storage.saveConfig(DEFAULT_FRAME_CONFIG);
      this.persistenceError.set(null);
    } catch {
      this.persistenceError.set('Retour aux valeurs par défaut impossible à enregistrer.');
    }
  }

  /** Réenregistre dans le registre les object URLs des images stockées. */
  private async hydrateImages(artwork: Artwork): Promise<void> {
    await Promise.all(
      [artwork.idleImage, ...artwork.engagedImages].map(async (ref) => {
        if (ref.source !== 'stored') {
          return;
        }
        const blob = await this.storage.loadImage(ref.key);
        if (blob !== null) {
          this.registry.register(ref.key, blob);
        }
      }),
    );
  }
}
