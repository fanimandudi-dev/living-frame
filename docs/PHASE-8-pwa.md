# Living Frame V0 — Phase 8 : PWA (offline & installation)

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | Prototype installable sur tablette, 100 % autonome après installation (ENF-O1, CA-08) |
| **Vérifications** | build ✅ · `npm run verify:pwa` **19/19** ✅ · `ng test` **82/82** ✅ · précache **13,5 Mo** (budget 15 Mo) |
| **Prérequis** | Phase 7 (intégration) |

---

## 1. Ce qui a été construit

| Élément | Rôle |
|---|---|
| `@angular/service-worker` + `ngsw-config.json` | Service worker Angular : précache et repli offline |
| `public/manifest.webmanifest` | Manifeste produit : nom, icônes, `standalone`, **orientation paysage**, couleurs |
| `public/icons/` | Icônes générées (cadre doré sur charbon) : 192, 512 + maskable 512 — source archivée dans `docs/icon-src.png` |
| `scripts/verify-pwa.mjs` (`npm run verify:pwa`) | **Garde-fou de déploiement** : 19 contrôles — fichiers présents, assets critiques PRÉCACHÉS, zéro URL CDN dans le JS livré, manifeste complet |

## 2. L'arbitrage WASM (décision clé de la phase)

Le dossier MediaPipe contient 3 variantes (~34 Mo). Toutes les précacher aurait gonflé l'installation à 37 Mo — au-dessus du budget ENF-O2 (15 Mo).

| Groupe ngsw | Contenu | Mode | Taille |
|---|---|---|---|
| `app` | shell applicatif (JS/CSS/HTML) | **prefetch** | 0,52 Mo |
| `oeuvres` | œuvres de démo + icônes | **prefetch** | 0,62 Mo |
| `moteur-detection` | WASM **SIMD** + modèle BlazeFace | **prefetch** | 12,31 Mo |
| `wasm-variantes-repli` | variantes module + nosimd | **lazy** | 23,36 Mo |

**Résultat : 13,5 Mo téléchargés à l'installation.** La cible V0 (tablette Android/Chrome) n'utilise que la variante SIMD ; un navigateur plus ancien chargera sa variante à la demande (nécessite un premier passage en ligne), sinon repli silencieux sur œuvre statique — déjà géré par la matrice d'erreurs.

## 3. Politique de mise à jour (risque R12)

- Le SW vérifie les mises à jour au démarrage de l'app et active la nouvelle version quand toutes les instances sont fermées. En kiosque mono-instance : une mise à jour devient active au redémarrage suivant — acceptable.
- **Règle de démo** : figer la version déployée avant un événement ; ne pas redéployer pendant une démo.

## 4. Déploiement (rappel : HTTPS obligatoire pour caméra + installation)

```bash
npm run build         # → dist/living-frame/browser
npm run verify:pwa    # 19 contrôles — doit finir sur « PWA offline-ready ✓ »
```

Publier le **contenu de `dist/living-frame/browser/`** sur n'importe quel hébergement statique HTTPS, à la racine du domaine (sinon ajuster `--base-href`). Exemples : Netlify, GitHub Pages, Cloudflare Pages, un simple bucket.

> « Pas de cloud » (contrainte du cahier des charges) = aucun serveur **d'exécution** : l'hébergement ne sert qu'à **installer** l'app sur la tablette. Ensuite, tout — détection, scénario, images, configuration — vit sur l'appareil.

## 5. Installation sur tablette (procédure)

1. Ouvrir l'URL HTTPS du site dans Chrome (Android).
2. Menu ⋮ → **« Installer l'application »** (ou la bannière d'installation).
3. Lancer l'app depuis l'écran d'accueil → elle s'ouvre standalone, fond sombre, sans chrome navigateur.
4. Menu ⋮ → Autorisations → **Caméra : Autoriser** (une fois, avant l'événement).
5. Paramètres Android → Écran → **Veille : 30 min max** (le Wake Lock fait le reste pendant l'app).
6. Tester en **mode avion** : le cycle complet doit fonctionner (CA-08).

## 6. Check-list manuelle (CA-08 et suivants)

| # | Action | Attendu |
|---|--------|---------|
| M-26 | Installer la PWA, activer le mode avion, ouvrir l'app | Démarrage normal, œuvre affichée |
| M-27 | Mode avion + `/frame` avec détection activée | Cycle complet réactif à la présence (WASM local) |
| M-28 | Mode avion + `/studio` | Configuration chargée depuis IndexedDB, enregistrement possible |
| M-29 | Mode avion + onglet Réseau (outils dev) | **Zéro requête** — uniquement `service-worker` en cache |
| M-30 | Mode avion, refuser la caméra au lancement | Œuvre statique + point discret, aucun crash |

## 7. Prochaine étape — Phase 9 : Prototype physique

Plein écran au démarrage, gestion de l'orientation, veille de l'écran, récupération après erreur prolongée, checklist de la démonstration client, et la check-list finale du livrable V0 (CA-01 → CA-13).
