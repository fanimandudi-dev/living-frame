# V1-01 — Moteur de scènes & chorégraphie GSAP (Étape A)

*30/09/2026 — évolution post-V0, validée avec l'organisateur.*

## 1. Contexte et décision

Le prototype V0 livrait des fondus simultanés : image, texte et voile
arrivaient *en même temps*. Pour un rendu motion design haut de gamme
(mariages, réceptions, hôtels), il faut une **chorégraphie** — chaque
élément entre à son moment, avec son rythme.

Décisions validées :

| Décision | Choix |
|---|---|
| Dépendances | **GSAP** (npm, auto-hébergé, ~28 Ko gz — licence gratuite Webflow, usage commercial libre, non-OSI) ; **PixiJS** prévu à l'Étape B (particules, bloom, brume) |
| Three.js / Lottie | **Refusés** — redondants avec PixiJS pour une œuvre 2D cadrée ; Lottie exige des assets de designer |
| Première scène | **Golden Welcome** (mariage) |
| Intensité | 3 niveaux (Subtil · Élégant · Spectaculaire), réglés dans le Studio — défaut **Élégant** |
| Regard qui suit | **Reporté en V2** (position du visage déjà disponible côté détection) |

## 2. Architecture

```
INTERACTION ENGINE (inchangé) ── état + distance
        ↓
SCENARIO ENGINE (+ sceneId, intensity — fusion des défauts au chargement)
        ↓
SCÈNE = configuration (scene.model.ts : phases en ms, presets d'intensité)
        ↓
ANIMATION ENGINE (GSAP, service pur — testable sans DOM)
        ↓
RENDERER : scène d'œuvre + <lf-scene-fx> (calque de lumière)
```

Répartition des responsabilités :
- **CSS** garde les fondus d'images (courbe artisanale), la respiration du
  défilé, le voile et la vignette ;
- **GSAP** prend la mise en scène : balayage de lumière, halo (approche,
  entrée, pulsation, sortie), naissance et retrait du message ;
- la classe `.visible` du message devient un **marqueur** (voile + tests) —
  plus aucun style d'animation CSS sur le message, pour ne pas luter
  contre GSAP.

## 3. La scène Golden Welcome

Phases (ms, depuis l'entrée en ENGAGED) : calme 600 → balayage 600–2400 →
halo 1200–2600 → message 3000 → ligne nominative 3800. Sortie : halo 1,3 s,
message 0,65 s. En APPROACH, un halo tiède monte avec la proximité
(0,25 / 0,55 / 0,85 × glowMax).

Intensités (presets) : Subtil (halo 0,10 / balayage 0,07 / flou 6 px) ·
Élégant (0,20 / 0,13 / 10 px) · Spectaculaire (0,34 / 0,22 / 14 px).

## 4. Migration des données

`Scenario` gagne `sceneId?` et `intensity?` (optionnels). Au chargement,
la configuration persistée est **fusionnée avec les défauts** (comme la
migration défilé) — aucune réécriture de la base. Test dédié.

## 5. Vérifications

- `npx ng test --watch=false` : **108/108** (+11 : moteur d'animation ×6 —
  timelines pilotées par `progress(1)` sur objets purs, sans DOM ; calque
  lumière ×3 — ticker GSAP avancé manuellement, jsdom sans rAF ; migration
  scène ×1 ; Studio intensité ×1).
- `npx ng build` : initial 284,33 kB / 79,42 kB gz (+7 kB gz pour GSAP).
- `npm run verify:pwa` : 19/19 — GSAP est bundlé (offline intact).

## 6. Prochaines étapes

- **Étape B** : PixiJS — poussière d'or, bloom, brume (canvas GPU, actif
  uniquement pendant la présence) ;
- **Étape C** : variations de chorégraphie (3 déroulés) ;
- **Étape D** : transitions de matière (peinture/encre) entre les photos
  du défilé ;
- **V2** : regard qui suit le visiteur (position du visage via BlazeFace).
