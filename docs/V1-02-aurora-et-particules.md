# V1-02 — Scène Aurora & poussière lumineuse (Étape B)

*30/09/2026 — deuxième scène + particules PixiJS, validées avec l'organisateur.*

## 1. Aurora — la scène contemporaine

« Golden Welcome » (or chaleureux, balayage diagonal) est rejointe par
**Aurora** : argent glacier, rideau de lumière qui se lève verticalement,
rythme plus vif (calme 400 ms, message à 2,4 s).

| | Golden Welcome | Aurora |
|---|---|---|
| Palette | or, miel | argent, glacier, blanc froid |
| Balayage | diagonal (reflet sur verre) | aube montante verticale |
| Rythme | posé (600 ms de calme) | vif (400 ms, message à 2,4 s) |
| Poussière | dorée | argentée |

L'organisateur choisit la scène dans le Studio (sélecteur « Scène visuelle »,
à côté de l'intensité). Le moteur ne change pas : une scène reste de la
CONFIGURATION (`scene.model.ts` — phases, palette, style de balayage).

## 2. Poussière lumineuse (PixiJS 8.21)

Des particules fines s'élèvent lentement autour du portrait pendant la
visite, teintées par la palette de la scène.

- **Chunk paresseux** : PixiJS est importé dynamiquement — bundle initial
  inchangé (284,7 Ko / 79,5 Ko gz) ; le chunk Pixi (≈628 Ko) se charge à la
  première visite et est précaché par la PWA ;
- **GPU au repos** : le ticker ne tourne que pendant ENGAGED/HOLD, arrêté
  au départ — la tablette respire ;
- **Dégradation gracieuse** : sans WebGL (appareil ancien, environnements de
  test), le composant ne rend rien et ne casse rien — garde-fou AVANT
  l'import dynamique ;
- **Réglages purs** (`particle-field.ts`) : nombre (22/46/90 selon
  l'intensité), teinte (palette de la scène), montée, dérive — testés sans
  GPU.

## 3. Épisode de la garde offline

`verify:pwa` a refusé le premier build : PixiJS embarque les constantes de
chemins par défaut de ses transcodeurs KTX2/Basis (`cdn.jsdelivr.net`).
**Inertes dans Living Frame** — nous ne chargeons aucune texture compressée
(Graphics procéduraux uniquement), ces URL ne sont jamais contactées. La
garde a été affinée : allowlist explicite de ce préfixe précis, documentée
dans le script ; **tout autre URL CDN reste bloquant** (contre-vérifié par
un anti-test).

## 4. Vérifications

- Tests : **118/118** (+10 : Aurora scène et moteur, particules — champ
  pur et dégradation sans WebGL, Studio scène).
- Build : initial 284,70 kB / 79,49 kB gz — inchangé malgré PixiJS.
- `verify:pwa` : ✓ offline-ready (garde CDN affinée, pas affaiblie).

## 5. Prochaines étapes

- **Étape C** : variations de chorégraphie (3 déroulés par scène) ;
- **Étape D** : transitions de matière (peinture/encre) entre les photos
  du défilé ;
- **V2** : regard qui suit le visiteur (position du visage via BlazeFace).
