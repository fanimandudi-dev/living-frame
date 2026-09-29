/**
 * Œuvre accrochée dans le cadre : deux prises quasi identiques de la même
 * composition — l'une neutre (repos), l'autre transformée (engagée).
 * L'illusion du « tableau vivant » dépend de leur alignement (risque R11).
 */

/**
 * Référence d'image, selon sa provenance :
 * - asset  : fichier embarqué dans la PWA (œuvre de démonstration) ;
 * - stored : blob importé depuis le Studio, stocké en IndexedDB (Phase 5).
 */
export type ImageRef =
  | { source: 'asset'; path: string }
  | { source: 'stored'; key: string };

export interface Artwork {
  id: string;
  name: string;
  /** Œuvre affichée au repos (IDLE / RESET). */
  idleImage: ImageRef;
  /** Œuvre transformée affichée en APPROACH / ENGAGED / HOLD. */
  engagedImage: ImageRef;
}
