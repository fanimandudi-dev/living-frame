# Living Frame V0 — Phase 9 : Prototype physique

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 — **V0 complet** |
| **Objectif** | Tenir en conditions réelles : kiosque, veille, orientation, récupération, tablette |
| **Vérifications** | `ng build` ✅ · `verify:pwa` ✅ · `ng test` **86/86** ✅ |
| **Prérequis** | Phases 2 → 8 |

---

## 1. Durcissements « conditions réelles » (code)

| Comportement | Implémentation | Test |
|---|---|---|
| **Kiosque au premier toucher** | Le plein écran exige un geste utilisateur : le premier toucher de l'œuvre déclenche plein écran + anti-veille (une fois), sans aucune UI | `premier toucher → kiosque, une seule fois` |
| **Wake Lock ré-acquis** | Le navigateur libère l'anti-veille quand la page passe en arrière-plan : ré-acquisition automatique au retour de visibilité, tant que le mode kiosque est actif | `ré-acquiert le wake lock au retour de visibilité` |
| **Anti-sortie kiosque** | Menu contextuel (long-press) désactivé, sélection désactivée, `overscroll-behavior: none` (anti pull-to-refresh), `touch-action: manipulation` (anti double-tap zoom) | `menu contextuel désactivé` |
| **Récupération après erreur** | Une retentative de détection après 5 s si la panne semble transitoire (`ERROR`/`UNAVAILABLE`). **Jamais** pour `DENIED` : changer une permission exige un geste humain | `une retentative après 5 s, pas plus` |

*Péripétie de test instructive : le timer de retentative maintient la zone Angular « instable », ce qui faisait expirer les `whenStable()` des tests UI — corrigé en isolant les tests UI (détection désactivée) et en sondant le résultat (`vi.waitFor`). Un comportement réel qui se révèle dans les tests : c'est exactement ce qu'on veut d'une suite de tests.*

## 2. Démarrage automatique — la vérité technique

Un vrai démarrage auto au boot de la tablette n'est **pas possible avec une PWA seule**. Options documentées, par ordre de simplicité :

1. **V0 (recommandé)** : icône sur l'écran d'accueil → un appui. L'app s'ouvre `standalone`, plein écran au premier toucher de l'œuvre.
2. **Épinglage d'écran** Android (Paramètres → Sécurité → Épinglage) : bloque la tablette sur l'app — suffisant pour un événement.
3. **V1** : appareil supervisé (MDM) ou appliance dédiée (ESP32 + écran) — c'est précisément l'architecture `DetectionAdapter` qui rendra cette évolution peu coûteuse.

## 3. Intégration physique du cadre

| Sujet | Recommandation |
|---|---|
| **Caméra** | Percer l'ouverture du cadre **devant l'objectif frontal** (haut de la tablette, côté paysage) — rien ne doit l'obstruer |
| **Distance visiteur** | Zone de détection calibrée ~0,5 à 2,5 m ; accrocher le cadre à hauteur des yeux |
| **Éclairage** | Éviter le contre-jour direct face à la caméra ; un éclairage d'ambiance intérieur suffit |
| **Écran** | Luminosité ~70 %, tablette sur chargeur, dégagement thermique à l'arrière du cadre |
| **Orientation** | Paysage (verrouillé par le manifeste) ; rien ne casse en portrait, mais le V0 est conçu paysage |

## 4. Check-list finale de démonstration (CA-01 → CA-13)

| Critère | Vérification | Statut |
|---|---|---|
| CA-01 cycle nominal ordonné | test auto (TEST-01) + M-17 réel | ✅ auto |
| CA-02 IDLE sans personne | test auto (TEST-02) | ✅ auto |
| CA-03 anti-rebond | tests auto | ✅ auto |
| CA-04 latence ≤ 200 ms après confirmation | tests auto + ressenti réel | ✅ auto |
| CA-05 caméra refusée sans crash | tests auto (3 niveaux) + M-25 | ✅ auto + manuel |
| CA-06 repli MediaPipe | test auto + M-19 | ✅ auto + manuel |
| CA-07 config absente → défauts | test auto | ✅ auto |
| CA-08 mode avion complet | **M-26 → M-30** (vraie tablette) | ⏳ manuel |
| CA-09 configuration après redémarrage | test auto + M-13 | ✅ auto + manuel |
| CA-10 message modifié → utilisé | test auto (TEST-04) | ✅ auto |
| CA-11 nettoyage caméra/timers | tests auto + M-23 | ✅ auto + manuel |
| CA-12 illusion « tableau » | test utilisateur informel (3–5 personnes) | ⏳ à faire en démo |
| CA-13 preview sans caméra | tests auto + /preview | ✅ |

**Avant chaque démo client** : dérouler M-17 (caméra réelle), M-21 (lancement complet), M-26 (mode avion) — puis version figée, pas de redéploiement pendant la démo (R12).

## 5. Limites connues et assumées du V0

| Limite | Impact | Prévu |
|---|---|---|
| Mono-visiteur (plus grand visage) | Un 2ᵉ visiteur simultané est ignoré | V1 (multi-personnes) |
| Distance heuristique (mono-caméra) | Seuils à calibrer par lieu | Phase terrain / V1 (capteur dédié) |
| iOS/Safari : stockage PWA évacué après ~7 jours sans usage | Config perdue si iPad inactif | Cible V0 = Android ; V1 : packaging natif |
| Pas de vrai boot automatique | Un appui sur l'icône | V1 : MDM/appliance |
| Une seule œuvre, un seul scénario | — | Par conception V0 (abstractions prêtes) |
| `demo=1` et touches 1–5/D/C dans le Frame | Outils organisateur cachés, pas des fonctions visiteur | À retirer en production client |

## 6. Le livrable V0 — cartographie finale

```
living-frame/
├── /frame      — le produit : détection réelle / démo / statique + kiosque   ✅
├── /studio     — configuration, œuvres, message, timings + persistance      ✅
├── /preview    — diagnostic : manuel, scripté, capteur réel                 ✅
├── détection locale — MediaPipe auto-hébergé (zéro CDN, 13,5 Mo précachés)  ✅
├── machine à états  — IDLE→APPROACH→ENGAGED→HOLD→RESET, 13 transitions      ✅
├── scénarios        — « welcome » + abstractions pour V1                    ✅
├── configuration locale / stockage — IndexedDB + défauts embarqués          ✅
├── PWA              — offline vérifié (verify:pwa 19/19)                    ✅
└── documentation    — cahier des charges, architecture, phases 0→9,
                      guide organisateur, guide de démonstration             ✅
```

**86 tests automatisés** · précache 13,5 Mo · aucune dépendance d'exécution externe.

## 7. Perspectives V1 (naturellement découlantes)

1. Multi-scénarios éditoriaux (Corporate, Hôtel, Galerie…) — `Scenario` déjà typé pour ;
2. Remplacement du capteur : `DetectionAdapter` → ESP32/PIR, la FSM ne bouge pas ;
3. Multi-œuvres / diaporamas, planification horaire, mode nuit ;
4. Son d'ambiance, effets saisonniers ;
5. Packaging natif (Capacitor) pour iOS et boot automatique ;
6. Télémétrie locale (comptage de visites, anonyme) pour mesurer l'engagement.
