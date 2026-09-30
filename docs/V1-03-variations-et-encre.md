# V1-03 — Variations de chorégraphie & éclosion d'encre (Étapes C & D)

*30/09/2026 — deux évolutions complémentaires du moteur de scènes.*

## 1. Étape C — variations de chorégraphie

**PROBLÈME** : rejouer la même scène à chaque visite tue l'illusion au
troisième passage — l'invité prévoit le déroulé.

**DÉCISION** : trois déroulés qui partagent la grammaire de la scène
(calme → lumière → halo → message) mais varient le RYTHME :

| Variation | Caractère | Transformation des phases |
|---|---|---|
| Classique | la scène telle quelle | phases de base |
| Lumière d'abord | énergique | calme ÷2, balayage anticipé, message ×0,72 |
| Éclosion lente | contemplatif | calme ×2, balayage ×1,7, message ×1,35 |

- `variationPhases()` : transformation PURE des phases (`scene.model.ts`),
  invariants testés (le message jamais avant la lumière, la ligne
  nominative jamais avant le message) sur les deux scènes ;
- la rotation avance à chaque NOUVELLE visite (front montant de présence,
  détection de bord dans la scène d'œuvre) : 1ʳᵉ visite = Classique ;
- la scène garde son identité (palette, style de balayage) — seul le
  rythme varie ; le Studio le mentionne sous le sélecteur de scène.

## 2. Étape D — éclosion d'encre

**PROBLÈME** : entre deux photos du défilé, un simple fondu croisé fait
« diaporama ».

**DÉCISION** : chaque photo qui devient courante est révélée par un
**masque radial animé** (`mask-size` 8 % → 420 %) qui s'ouvre depuis un
point du cadre, bord flou — une diffusion d'encre. L'origine du point
tourne selon la photo (`ink-a/b/c` : 32/58, 55/38, 68/64 %).

- **Zéro dépendance** : CSS seul, GPU-économique ; les photos restent dans
  le DOM (le défilé n'a pas changé d'un iota de logique) ;
- **dégradation gracieuse** : sans support de `mask`, la règle est ignorée
  et l'opacité reprend ses droits (fondu artisanal d'origine) ;
- la photo de TRANSFORMATION garde son entrée par le calque engagé
  (balayage + halo) : l'encre est réservée aux changements du défilé.

## 3. Vérifications

- Tests : **124/124** (+6 : variations du modèle ×4, rotation entre visites,
  origines d'encre).
- Build : initial 284,70 kB / 79,51 kB gz — inchangé (CSS pur).
- `verify:pwa` : ✓ offline-ready.

## 4. Reste de la feuille de route V1

- **V2** : regard qui suit le visiteur (position du visage via BlazeFace) ;
- pistes : brume de profondeur, ornements génératifs, cinégramme au repos.
