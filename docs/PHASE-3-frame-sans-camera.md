# Living Frame V0 — Phase 3 : Frame sans caméra

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | Valider la machine à états complète et le rendu AVANT d'ajouter la computer vision |
| **Vérifications** | `ng build` ✅ · `ng test` **28/28** ✅ · serveur dev ✅ |
| **Prérequis** | Phase 2 (initialisation Angular) |

---

## 1. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `core/interaction/interaction-state.ts` | `FrameState`, `DistanceLevel`, `InteractionTimings`, constantes (rangs de distance, opacités APPROACH) |
| `core/interaction/interaction-engine.service.ts` | **La machine à états** : anti-rebond, transitions T1–T13, timers centralisés, Signals |
| `core/detection/detection-adapter.ts` | Le **contrat abstrait** de détection (`DetectionAdapter`, `PresenceSample`, `DetectionStatus`) |
| `core/detection/scripted-detector.service.ts` | Implémentation simulée (scénario temporel, boucle optionnelle) |
| `core/detection/demo-script.ts` | Scénario de démonstration : entrée → approche → contemplation → départ |
| `core/scenario/scenario-engine.service.ts` | Fournisseur de la configuration active (Signal) + timings dérivés |
| `shared/models/{artwork,scenario,frame-config}.model.ts` | Modèles métier + `DEFAULT_FRAME_CONFIG` embarquée |
| `features/frame/` | **Renderer** : deux calques d'images à opacité pilotée + message en fondu retardé |
| `features/preview/` | Commandes manuelles d'états, lecture automatique, journal des transitions |
| `public/artworks/demo/{idle,engaged}.jpg` | Œuvre de démonstration (paire quasi identique : neutre / sourire) |

## 2. Décisions d'implémentation

1. **`DetectionAdapter.status` est un `Signal<DetectionStatus>`** (refinement du contrat Phase 1) — le Frame pourra afficher un indicateur de repli réactif (Phase 6) sans polling.
2. **Assets dans `public/`** (et non `src/assets/`) — convention Angular 17+ ; le dossier est servi à la racine, ce qui donne `artworks/demo/idle.jpg`.
3. **`T_ENGAGE` n'est pas un timer** : le moteur mémorise l'horodatage d'entrée en APPROACH et vérifie « délai écoulé + distance ≥ NEAR » à chaque échantillon (T3/T4). Un timer de moins à gérer, aucun risque de désynchronisation.
4. **Un seul slot de timer dans le moteur** : les phases ENGAGED → HOLD → RESET → IDLE s'enchaînent, elles ne se chevauchent jamais ; `forceState`/`detach` effacent le timer en cours (pas de timers fantômes).
5. **`onTransition()`** : hook d'observabilité minimal (journal du Preview, assertions de test) plutôt qu'un effet qui écrirait des signaux.
6. **Commandes Phase 3 sur le Frame** (invisibles à l'écran) : touches `1`–`5` pour forcer les états, `D` pour la démo auto, `?demo=1` pour le mode autonome en boucle. À retirer ou garder cachées en Phase 6.
7. **Police du message : Georgia (système)** — offline par nature ; la police embarquée woff2 arrive avec la PWA (Phase 8) si on veut une identité plus forte.

## 3. Comment tester manuellement

| # | Action | Attendu |
|---|--------|---------|
| M-1 | Ouvrir `/frame` | Portrait neutre plein écran, curseur masqué, aucun élément d'interface |
| M-2 | Ouvrir `/frame?demo=1` | Cycle complet en boucle : le couple sourit progressivement, message « Bienvenue dans notre histoire », retour au neutre, pause, recommence |
| M-3 | Sur `/frame` : touches `2` puis `3` | APPROACH (fondu partiel) puis ENGAGED (fondu complet + message) |
| M-4 | Ouvrir `/preview`, cliquer les 5 états | Le badge actif suit, le journal note chaque transition |
| M-5 | `/preview` → « Lecture automatique » | Le cycle nominal défile tout seul ; après un cycle, « Cycle déjà joué » jusqu'au départ simulé (mono-passe) |
| M-6 | Sur `/frame?demo=1`, attendre 2 cycles | Le cycle se rejoue : départ simulé → absence confirmée → réarmement |

## 4. Correspondance avec les tests du cahier des charges

| Test | Statut | Où |
|------|--------|-----|
| TEST-01 (cycle nominal ordonné) | ✅ automatisé | `interaction-engine.service.spec.ts` — trace `IDLE>APPROACH APPROACH>ENGAGED ENGAGED>HOLD HOLD>RESET RESET>IDLE` + timings vérifiés |
| TEST-02 (aucune personne → IDLE) | ✅ automatisé | idem — 10 s d'échantillons absents |
| TEST-03 (caméra refusée) | ⏳ Phase 6 | Nécessite `CameraService` (n'existe pas encore) |
| TEST-04 (message modifié → utilisé par le Frame) | ✅ partie 1 | `frame.component.spec.ts` — config changée → message rendu. Partie 2 (édition Studio) : Phase 4 |
| CA-03 (anti-rebond) | ✅ automatisé | 2 tests : présence brève, absence brève |
| Table T1–T13 | ✅ automatisé | 13 tests couvrent chaque ligne de la table validée en Phase 1 |

## 4bis. Affinage du rendu (30/09/2026) — fondu artisanal & typographie

Retour d'expérience du prototype : le fondu croisé « à plat » (easing générique,
paliers d'opacité discrets) faisait double-exposition, et le message en police
système manquait de caractère. Corrections :

- **Fondu** : courbe `cubic-bezier(0.45, 0, 0.25, 1)` (départ lent, pose douce),
  fondus d'approche 600 → 1400 ms (les trois paliers se fondent en flot continu) ;
- **Respiration** : en ENGAGED/HOLD, l'image engagée zoote très lentement
  (+4,5 % sur 9 s) et sa lumière se réchauffe légèrement (`filter`) — l'œuvre
  vit, ce n'est plus un échange d'images. Opacité sur le conteneur, respiration
  sur l'image : deux transitions indépendantes ;
- **Typographie** : Cormorant Garamond italique **embarquée** (2 sous-ensembles
  woff2, 30 Ko, licence SIL OFL — offline) ; le message naît flou/espacé puis se
  pose (keyframes) ; voile de lisibilité apparaissant avec lui ;
- **Ligne nominative** : le nom de l'événement (Studio) s'affiche en capitales
  espacées sous le message — la personnalisation vient de la configuration.

## 5. Prochaine étape — Phase 4 : Studio

Formulaire complet (événement, œuvre, message, timings, activations) branché sur `ScenarioEngineService.save()` — TEST-04 complet. La persistance IndexedDB suit en Phase 5.
