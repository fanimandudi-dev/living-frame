# Living Frame V0 — Phase 6 : MediaPipe (détection locale)

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | Chaîne complète : caméra → MediaPipe (local) → DetectionAdapter → InteractionEngine — testée séparément dans le Preview |
| **Vérifications** | `ng build` ✅ (initial inchangé : 269 Ko) · `ng test` **79/79** ✅ · assets locaux servis ✅ |
| **Prérequis** | Phase 5 (persistance) |

---

## 1. Le risque R1 traité AVANT le code

Conformément au cahier des charges (§10.4), l'offline a été vérifié **avant** d'écrire la détection :

| Élément | Décision | Vérifié |
|---|---|---|
| WASM MediaPipe | Copié depuis `node_modules` vers `public/mediapipe/wasm/` (3 variantes, ~34 Mo) | ✅ HTTP 200, tailles exactes |
| Modèle BlazeFace short-range | Téléchargé vers `public/mediapipe/models/blaze_face_short_range.tflite` (229 Ko) | ✅ HTTP 200 |
| Chargement | Chemins **relatifs** (`mediapipe/wasm`, `mediapipe/models/...`) — **zéro CDN** | ✅ grep : aucune URL externe |
| Version | `@mediapipe/tasks-vision@1.0.1` **pinned exact** (le WASM copié doit rester synchrone avec le JS) | ✅ package.json |

Arbitrage reporté en Phase 8 : quelles variantes WASM précacher dans la PWA (les 3 = 34 Mo, ou SIMD seul ≈ 12 Mo — la cible Android/Chrome n'a besoin que de la variante SIMD).

## 2. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `core/detection/detection-math.ts` | Mathématiques pures : plus grande boîte, ratio hauteur, seuils de distance — testables sans navigateur |
| `core/detection/camera.service.ts` | Cycle de vie `getUserMedia` : vidéo hors écran (1 px), erreurs mappées (`DENIED`/`UNAVAILABLE`/`ERROR`), libération des pistes |
| `core/detection/mediapipe-detector.service.ts` | Implémentation réelle du contrat `DetectionAdapter` : import dynamique, GPU→CPU, boucle 8 Hz hors zone Angular |
| `features/preview/` (modifs) | Panneau « Capteur réel » : la chaîne complète testable sur le vrai moteur |

## 3. Décisions d'implémentation

1. **Import dynamique de `@mediapipe/tasks-vision`** dans `start()` — la bibliothèque (chunk `vision_bundle`, 155 Ko) n'est téléchargée que si la détection est utilisée : l'initial du Frame reste à 269 Ko.
2. **GPU d'abord, repli CPU** — certaines tablettes n'ont pas de GPU exploitable par WASM ; le repli est automatique et silencieux.
3. **Distinction des pannes au plus près du navigateur** : `CameraService` mappe `NotAllowedError` → DENIED, `NotFoundError/OverconstrainedError` → UNAVAILABLE, le reste → ERROR. Trois pannes, trois replis différents (matrice d'erreurs du cahier des charges).
4. **Boucle d'analyse hors zone Angular** (8 Hz, `runOutsideAngular`) + un `zone.run(noop)` par échantillon émis : les signaux du moteur rafraîchissent l'UI sans coûter un cycle de détection complet par frame.
5. **Tolérance aux erreurs d'inférence** : 10 échecs *consécutifs* seuls arrêtent la détection (statut ERROR) — une frame perdue ne casse rien (ENF-R1).
6. **Vidéo hors écran 1 px, opacité 0, jamais `display:none`** — certains navigateurs suspendent le décodage d'un élément masqué.
7. **Test sans mock de module** : `createDetector()` est protégée et surchargée par une sous-classe dans les tests (le hoisting `vi.mock` ne s'entend pas avec le pipeline de test Angular). On teste la vraie plomberie — statuts, nettoyage caméra — le chargement WASM étant l'affaire du vrai navigateur.
8. **Seuils de distance calibrés** (`VERY_NEAR ≥ 0.32`, `NEAR ≥ 0.18` du ratio hauteur visage/hauteur vidéo) : constantes dans `detection-math.ts`, à réajuster sur site en Phase 9.

## 4. Correspondance avec le cahier des charges

| Exigence | Statut | Test |
|---|---|---|
| EF-04 (détection locale, aucune donnée transmise) | ✅ code + spec plomberie | charge WASM réelle = test navigateur (M-17) |
| EF-05 (3 niveaux de distance) | ✅ | `detection-math.spec.ts` (seuils) |
| **TEST-03** (caméra refusée → aucune exception, statut DENIED, moteur jamais attaché) | ✅ | spec détecteur + spec caméra + spec Preview (UI) |
| EF-17/EF-18 (repli par type de panne) | ✅ | DENIED / UNAVAILABLE / ERROR mappés et testés |
| ENF-P3 (analyse throttlée ~8 Hz, caméra 640×480) | ✅ | constantes du service |
| R1 (offline) | ✅ vérifié en dev | précache PWA = Phase 8 |

## 5. Tests manuels

| # | Action | Attendu |
|---|--------|---------|
| M-17 | **Sur votre machine** : `npm start` → `http://localhost:4200/preview` → « Activer la détection réelle » | Autoriser la caméra → statut « Détection active » ; approchez-vous : APPROACH → ENGAGED → HOLD ; éloignez-vous : RESET → réarmement |
| M-18 | Refuser la caméra quand le navigateur demande | Statut « Caméra refusée », message lisible, aucun crash, Preview toujours utilisable |
| M-19 | Ouvrir le Preview en HTTP non sécurisé (hors localhost) | Statut « Aucune caméra détectée (HTTPS requis ?) » |
| M-20 | Vérifier le réseau (outils dev) pendant la détection | Aucune requête vers un CDN — uniquement `mediapipe/**` local |

⚠️ **Limite de l'environnement de prévisualisation** : l'iframe sandboxée bloque `getUserMedia` — le test réel de la caméra se fait sur votre machine (localhost) ou sur un déploiement HTTPS. C'est aussi le seul test qui ne peut PAS être automatisé : **il doit être fait avant toute démo client**.

## 6. Prochaine étape — Phase 7 : Intégration

Câbler la détection dans le Frame : `/frame` utilise le détecteur réel quand `detectionEnabled` est coché (repli simulation `?demo=1`), indicateur discret de statut, nettoyage complet à la navigation, et la check-list d'intégration (détection + moteur + renderer en conditions réelles).
