/**
 * Œuvre accrochée dans le cadre : une prise « repos » et une SÉQUENCE de
 * prises quasi identiques (même cadrage, même lumière) — la première est
 * celle de la transformation, les suivantes forment le défilé qui anime
 * l'œuvre pendant que la personne regarde (effet créé le 30/09/2026).
 *
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
  /**
   * Séquence des photos engagées (APPROACH / ENGAGED / HOLD) :
   * la première porte la transformation, les suivantes défilent en fondu.
   * Toujours au moins une photo.
   */
  engagedImages: ImageRef[];
}

/** Format antérieur au défilé (config persistée en IndexedDB) :
 *  une seule photo engagée. */
export interface LegacyArtwork extends Omit<Artwork, 'engagedImages'> {
  engagedImage: ImageRef;
}

/**
 * Normalise n'importe quelle version persistée vers le modèle courant :
 * sans séquence → [engagedImage]. Migration douce, à la lecture (jamais
 * d'écriture destructive).
 */
export function normalizeArtwork(raw: Artwork | LegacyArtwork): Artwork {
  const sequence = 'engagedImages' in raw ? raw.engagedImages : undefined;
  if (sequence !== undefined && sequence.length > 0) {
    return {
      id: raw.id,
      name: raw.name,
      idleImage: raw.idleImage,
      engagedImages: sequence,
    };
  }
  const legacy = raw as LegacyArtwork;
  return {
    id: legacy.id,
    name: legacy.name,
    idleImage: legacy.idleImage,
    engagedImages: [legacy.engagedImage],
  };
}
