import { Injectable } from '@angular/core';

/** Cause d'échec caméra — pilote le repli à afficher (matrice d'erreurs). */
export type CameraFailure = 'DENIED' | 'UNAVAILABLE' | 'ERROR';

/** Erreur caméra typée : la cause est exploitable par l'appelant. */
export class CameraError extends Error {
  constructor(
    readonly failure: CameraFailure,
    message: string,
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

/** Noms d'exceptions navigateur → permission refusée. */
const DENIED_NAMES = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);

/** Noms d'exceptions navigateur → pas de caméra utilisable. */
const UNAVAILABLE_NAMES = new Set([
  'NotFoundError',
  'DevicesNotFoundError',
  'OverconstrainedError',
]);

/**
 * SERVICE CAMÉRA — cycle de vie getUserMedia, isolé de MediaPipe.
 *
 * PROBLÈME : « caméra refusée », « caméra absente » et « détecteur en échec »
 * sont trois pannes différentes avec trois replis différents — il faut les
 * distinguer au plus près du navigateur (EF-17/EF-18).
 *
 * DÉCISION : ce service ne connaît que getUserMedia. Il fournit un élément
 * vidéo HORS ÉCRAN (1 px, opacité 0 — jamais display:none : certains
 * navigateurs suspendent le décodage) et libère proprement les pistes.
 * MediaPipe n'est jamais importé ici.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  /**
   * Ouvre la caméra frontale et retourne l'élément vidéo alimenté.
   * Idempotent : un second appel retourne l'élément existant.
   * Rejette avec CameraError en cas d'échec.
   */
  async open(): Promise<HTMLVideoElement> {
    if (this.video !== null) {
      return this.video;
    }
    const media = navigator.mediaDevices;
    if (media?.getUserMedia === undefined) {
      throw new CameraError(
        'UNAVAILABLE',
        'Aucune caméra disponible dans ce contexte (HTTP non sécurisé ou matériel absent).',
      );
    }
    let stream: MediaStream;
    try {
      stream = await media.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      throw this.toCameraError(e);
    }

    const video = document.createElement('video');
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.srcObject = stream;
    // Hors écran mais toujours « rendu » : 1 px, transparent, non cliquable.
    video.style.position = 'fixed';
    video.style.right = '0';
    video.style.bottom = '0';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);
    // play() peut rejeter (autoplay) ou être non implémenté : non bloquant,
    // l'analyse vérifie readyState avant chaque frame.
    await Promise.resolve(video.play()).catch(() => undefined);

    this.stream = stream;
    this.video = video;
    return video;
  }

  /** Libère le flux (témoin caméra éteint — CA-11) et retire l'élément vidéo. */
  close(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video?.remove();
    this.video = null;
  }

  /** Mappe une exception getUserMedia vers une cause exploitable. */
  private toCameraError(e: unknown): CameraError {
    const name = e instanceof Error ? e.name : '';
    if (DENIED_NAMES.has(name)) {
      return new CameraError('DENIED', 'Accès à la caméra refusé.');
    }
    if (UNAVAILABLE_NAMES.has(name)) {
      return new CameraError('UNAVAILABLE', 'Caméra introuvable.');
    }
    return new CameraError('ERROR', 'Caméra inutilisable.');
  }
}
