import { Injectable } from '@angular/core';

/**
 * Screen Wake Lock API — structures minimales.
 * Typées localement : l'API n'est pas dans lib.dom de manière fiable.
 * {@link https://developer.mozilla.org/docs/Web/API/Screen_Wake_Lock_API}
 */
interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

/**
 * SERVICE KIOSQUE — « Lancer le cadre » (EF-20) et maintien en conditions
 * réelles (Phase 9).
 *
 * Plein écran + maintien de l'éveil, chacun avec repli silencieux : une démo
 * ne doit jamais montrer une erreur parce que le navigateur refuse le plein
 * écran (iframe, permission) ou ne connaît pas le Wake Lock.
 *
 * Phase 9 — robustesse physique : le Wake Lock est LIBÉRÉ par le navigateur
 * quand la page passe en arrière-plan (veille, changement d'app, onglet).
 * Pour un cadre posé toute la journée, on le ré-acquiert automatiquement
 * au retour de visibilité — tant que le mode kiosque est demandé.
 */
@Injectable({ providedIn: 'root' })
export class KioskService {
  private wakeLock: WakeLockSentinelLike | null = null;
  private wakeLockWanted = false;
  private listening = false;

  /** Entre en mode kiosque : plein écran, anti-veille + veille de visibilité. */
  async enterKioskMode(): Promise<void> {
    this.wakeLockWanted = true;
    this.startVisibilityListener();
    await this.requestFullscreen();
    await this.requestWakeLock();
  }

  /** Sort du mode kiosque (retour de l'organisateur au Studio). */
  async release(): Promise<void> {
    this.wakeLockWanted = false;
    this.stopVisibilityListener();
    if (typeof document.exitFullscreen === 'function') {
      try {
        if (document.fullscreenElement !== null) {
          await document.exitFullscreen();
        }
      } catch {
        // silencieux — jamais d'erreur visible pour ça
      }
    }
    try {
      await this.wakeLock?.release();
    } catch {
      // silencieux
    }
    this.wakeLock = null;
  }

  // ------------------------------------------------------------ internes

  /** Ré-acquiert l'anti-veille au retour de visibilité (écran rallumé). */
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.wakeLockWanted) {
      void this.requestWakeLock();
    }
  };

  private startVisibilityListener(): void {
    if (this.listening) {
      return;
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.listening = true;
  }

  private stopVisibilityListener(): void {
    if (!this.listening) {
      return;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.listening = false;
  }

  private async requestFullscreen(): Promise<void> {
    const element = document.documentElement;
    if (typeof element.requestFullscreen !== 'function' || document.fullscreenElement !== null) {
      return;
    }
    try {
      await element.requestFullscreen();
    } catch {
      // refusé (iframe de dev, politique navigateur) — l'expérience continue
    }
  }

  private async requestWakeLock(): Promise<void> {
    const api = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (api === undefined) {
      return; // non supporté — repli silencieux
    }
    try {
      this.wakeLock = await api.request('screen');
    } catch {
      // silencieux (ex. batterie faible, document non actif) :
      // le retour de visibilité permettra une nouvelle tentative.
    }
  }
}
