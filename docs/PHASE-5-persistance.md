# Living Frame V0 — Phase 5 : Persistance (IndexedDB)

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | La configuration et les photos importées survivent à un redémarrage (CA-09), avec repli sur les défauts (EF-15) |
| **Vérifications** | `ng build` ✅ · `ng test` **61/61** ✅ |
| **Prérequis** | Phase 4 (Studio) |

---

## 1. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `core/storage/storage.service.ts` | Wrapper IndexedDB minimal (~150 lignes, zéro dépendance) : stores `config` + `images` |
| `core/scenario/scenario-engine.service.ts` | Vraie persistance : `load()/save()/saveImage()`, réhydratation des images, signal `persistenceError` |
| `features/studio/` (modifs) | Persistance immédiate des images importées + bandeau d'erreur de stockage |
| `fake-indexeddb` (dev) | IndexedDB en mémoire pour les tests Node — **devDependency, jamais dans le bundle** |

## 2. Décisions d'implémentation

1. **Images stockées `{ type, data: ArrayBuffer }`** plutôt que Blob brut — le structured clone d'un `ArrayBuffer` est fiable partout (navigateurs, Node, tests) ; celui d'un `File` ne l'est pas. Reconversion en `Blob` au chargement.
2. **Aucune bibliothèque IndexedDB** (décision Phase 1 confirmée) : deux stores, cinq opérations, une promesse mémorisée pour l'ouverture. `idb` n'apporterait rien au V0.
3. **`ScenarioEngine` publie d'abord, persiste ensuite** — `save()` met à jour le signal immédiatement (le Frame suit en direct), puis tente la persistance. En cas d'échec : la config reste active pour la session + bandeau d'erreur dans le Studio (matrice d'erreurs : jamais d'écran de panne).
4. **`load()` en échec ne rejoue pas les défauts par-dessus la session** — il garde la configuration active en mémoire et signale l'erreur. Les défauts ne s'appliquent qu'au démarrage sur base vide/corrompue.
5. **Réhydratation avant publication** — les object URLs des images stockées sont recréés AVANT que la config arrive dans le signal : la scène s'affiche complète d'emblée.
6. **Injection par constructeur dans ScenarioEngine** (au lieu d'`inject()` dans les champs) — permet de simuler un « redémarrage » dans les tests par simple `new ScenarioEngineService(storage, registry)` (CA-09), sans acrobaties de TestBed.
7. **Garde-fou de version** : une config persistée avec `version` inconnue est ignorée → défauts. C'est le point d'ancrage des migrations futures (`onupgradeneeded` côté base + version côté payload).
8. **Persistance immédiate de l'image à l'import** (pas seulement au bouton Enregistrer) : l'aperçu et le blob partent ensemble ; la config qui référence la clé suit à l'enregistrement. Limite assumée : des images importées puis non enregistrées restent en base (orphelins inoffensifs, quelques Mo).

## 3. Correspondance avec le cahier des charges

| Exigence | Statut | Test |
|---|---|---|
| EF-14 (config + images persistées, rechargées au démarrage) | ✅ | aller-retour config, aller-retour image, survie entre instances |
| **CA-09** (redémarrage → configuration intacte) | ✅ | test dédié : session 1 (import + save) → nouvelles instances → `load()` → message et image restaurés |
| EF-15 (config absente/corrompue → défauts) | ✅ | base vide → défauts ; version inconnue → défauts ; stockage en échec → défauts au démarrage |
| TEST-04 à travers la persistance | ✅ | le message édité survit au « redémarrage » |
| Matrice d'erreurs (quota / base indisponible) | ✅ | `persistenceError` signalé, config active maintenue, aucune exception |

## 4. Tests manuels suggérés

| # | Action | Attendu |
|---|--------|---------|
| M-13 | `/studio` : importer deux photos, Enregistrer, puis **recharger la page** (F5) | Le Studio réaffiche VOS photos et VOS réglages |
| M-14 | `/studio` : modifier le message, Enregistrer, ouvrir `/frame?demo=1` | Le message configuré s'affiche |
| M-15 | (Outils dev) Supprimer la base `living-frame` dans l'onglet IndexedDB, recharger | Retour à l'œuvre de démonstration, aucun crash |

## 5. Prochaine étape — Phase 6 : MediaPipe

Détection locale de présence : `CameraService` (getUserMedia, permissions), packaging **local** du WASM + modèle BlazeFace (le risque R1 — vérifier l'offline avant d'écrire la moindre ligne), `MediaPipeDetectorService` implémentant `DetectionAdapter`, calibration des seuils de distance. Le moteur d'interaction ne changera **pas d'une ligne** — c'est tout l'intérêt du contrat.


---

## Évolution (30/09/2026) — migration « défilé »

Le modèle `Artwork` remplace `engagedImage` par une séquence
`engagedImages`. Les configurations persistées par les versions antérieures
sont **normalisées à la lecture** (`normalizeArtwork` : photo unique →
séquence d'un élément) — aucune écriture destructive, la base IndexedDB
n'est jamais réécrite pour la migration.
