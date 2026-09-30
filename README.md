# Living Frame — V0

Le tableau qui s'anime quand on s'approche.

> Une personne s'approche d'un tableau → le tableau détecte sa présence →
> l'œuvre se transforme naturellement → un message apparaît → l'œuvre revient
> à son état initial.

## État du prototype

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0 — Analyse | Cahier des charges (`docs/PHASE-0-cahier-des-charges.md`) | ✅ Validé |
| 1 — Architecture | Proposition d'architecture (`docs/PHASE-1-architecture.md`) | ✅ Validée |
| 2 — Initialisation Angular | Projet, routing, squelettes de routes | ✅ Ce dépôt |
| 3 — Frame sans caméra | Machine à états + simulation manuelle | ✅ 28/28 tests |
| 4 — Studio | Configuration organisateur + lancement kiosque | ✅ 48/48 tests |
| 5 — Persistance | IndexedDB (config + images, replis défauts) | ✅ 61/61 tests |
| 6 — MediaPipe | Détection locale (WASM + modèle auto-hébergés) | ✅ 79/79 tests |
| 7 — Intégration | Frame : chaîne complète détecteur → moteur → renderer | ✅ 82/82 tests |
| 8 — PWA | Offline complet (précache 13,5 Mo) + installation tablette | ✅ verify:pwa 19/19 |
| 9 — Prototype physique | Kiosque, veille, récupération, guide de démo | ✅ **V0 complet** — 86/86 |

## Routes

| Route | Rôle |
|-------|------|
| `/frame` | Le produit vu par le visiteur (kiosque, plein écran, aucune UI) |
| `/frame?demo=1` | Mode démo autonome : cycle complet en boucle, sans caméra |
| `/studio` | Configuration de l'organisateur : événement, œuvre (import de photos), message, interactions, timings |
| `/preview` | Simulation de la machine à états sans caméra (commandes manuelles + lecture auto) |

**Raccourcis clavier sur `/frame`** : `1`–`5` forcent les états · `D` bascule la démo auto · `C` bascule la détection caméra.

## Commandes

```bash
npm install           # dépendances
npm start             # serveur de développement (http://localhost:4200)
npm run build         # build de production (dist/living-frame/browser)
npm test              # tests unitaires (vitest)
npm run verify:pwa    # 19 contrôles offline du build (à lancer avant déploiement)
```

## Fonctionnement

Détection de présence locale → transformation progressive de l'œuvre →
message personnalisé ; **présence tenue** : l'œuvre reste animée et fait
**défiler plusieurs photos** tant que quelqu'un regarde, puis revient au
repos à son départ (une salutation par approche).

## Stack

Angular 22 · TypeScript strict · Angular Signals · SCSS · composants standalone ·
MediaPipe Tasks Vision (WASM + modèle auto-hébergés — zéro CDN) · IndexedDB · PWA ·
Cormorant Garamond (SIL OFL, embarquée).

Aucun backend. Aucune donnée ne quitte l'appareil : la détection est locale,
sans identification ni stockage d'images.

## Documentation

- `docs/PHASE-0-cahier-des-charges.md` — exigences, critères d'acceptation, risques
- `docs/PHASE-1-architecture.md` — modules, machine à états, flux de données, tests
- `docs/PHASE-3…9-*.md` — décisions et vérifications de chaque phase
- `docs/GUIDE-organisateur.md` — guide client : installation, préparation, jour J, dépannage
- `docs/PHASE-9-prototype-physique.md` — intégration physique, check-list de démonstration, limites V0

## Livrable

**Living Frame V0 est complet** : 3 routes, détection locale auto-hébergée,
machine à états testée (86 tests), persistance IndexedDB, PWA offline
(13,5 Mo), documentation. Reste à exécuter sur vraie tablette la check-list
de démonstration (M-17, M-21, M-26 → M-30) — voir `docs/PHASE-9-prototype-physique.md`.
