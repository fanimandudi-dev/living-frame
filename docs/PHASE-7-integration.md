# Living Frame V0 — Phase 7 : Intégration

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | Relier la chaîne complète dans le Frame : config → détecteur (réel ou scripté) → moteur → renderer |
| **Vérifications** | `ng build` ✅ (frame-component : 3,3 Ko) · `ng test` **82/82** ✅ |
| **Prérequis** | Phase 6 (MediaPipe) |

---

## 1. Ce qui a changé

| Fichier | Changement |
|---|---|
| `features/frame/frame.component.ts` | Le Frame devient un **assembleur** : choix du détecteur (réel / scripté / aucun), indicateur de statut, nettoyage total |
| `features/frame/frame.component.html` | Point de statut discret (mode réel uniquement) |
| `features/frame/frame.component.scss` | 6 px, semi-transparent — vert (actif) / ambre (init) / rouge (panne) |
| `features/studio/studio.component.html` | Libellé de la détection mis à jour (« traitement 100 % local ») |
| `features/frame/frame.component.spec.ts` | 3 tests d'intégration |

## 2. Règles d'assemblage du Frame

| Situation | Détecteur branché | Effet |
|---|---|---|
| `/frame` + `detectionEnabled` ✓ | **MediaPipe réel** (caméra) | Expérience complète |
| `/frame?demo=1` | **Scripté** (boucle) | Démo sans caméra — jamais de `getUserMedia` |
| `/frame` + `detectionEnabled` ✗ | **Aucun** | Œuvre statique — la caméra n'est jamais ouverte |
| Échec caméra / WASM | Aucun (repli silencieux) | Œuvre statique + point discret rouge |

Pilotage clavier (invisible à l'écran) : `1`–`5` forcer les états · `D` bascule démo · `C` bascule caméra réelle.

## 3. Décisions d'implémentation

1. **`ngOnDestroy` nettoie tout** : stop démo + stop détection réelle (caméra libérée, témoin éteint — CA-11) + `engine.detach()` (timers du moteur effacés). Chaque garde protège le cas « rien à nettoyer » (pas de `detach` intempestif du mauvais détecteur).
2. **Le point de statut n'existe qu'en mode réel** — en démo scriptée, il n'a pas de sens (pas de panne possible) et le cadre doit rester parfaitement vierge.
3. **L'échec de détection n'est JAMAIS une erreur visible** : `startRealDetection()` attrape tout ; le statut (signal) pilote le point discret. C'est la traduction exacte de SCU-07/EF-17 dans le code.
4. **`detectionEnabled: false` = caméra jamais ouverte** — testé par espion sur `start()` : le choix de l'organisateur est respecté au niveau le plus bas.
5. **Le test d'intégration `?demo=1`** utilise l'horloge virtuelle sur la VRAIE chaîne (composant → ScenarioEngine → ScriptedDetector → InteractionEngine) et vérifie APPROACH (~1,75 s) puis ENGAGED (~3 s) — c'est TEST-01 rejoué au niveau de l'application.

## 4. Correspondance avec le cahier des charges

| Exigence | Statut | Test |
|---|---|---|
| EF-01/EF-17 (aucune UI technique en Frame, repli silencieux) | ✅ | échec caméra → IDLE + point discret, aucune exception |
| EF-19 (libération caméra en quittant /frame) | ✅ code | M-23 (manuel — témoin caméra) |
| CA-11 (nettoyage complet) | ✅ code + specs services | M-23/M-24 |
| TEST-01 au niveau application | ✅ | cycle complet piloté par le détecteur scripté |

## 5. Check-list d'intégration (manuelle — sur votre machine, HTTPS/localhost)

| # | Action | Attendu |
|---|--------|---------|
| M-21 | Studio → cocher Détection → « Lancer le cadre » | Plein écran + cycle complet réactif à VOTRE présence |
| M-22 | Décocher Détection → Enregistrer → /frame | Œuvre statique, témoin caméra éteint |
| M-23 | Sur /frame (détection active) → naviguer vers /studio | Le témoin caméra du navigateur s'éteint immédiatement |
| M-24 | /frame?demo=1 pendant 10 cycles | Mémoire stable, aucune dégradation (outils dev) |
| M-25 | Refuser la caméra au lancement | Œuvre statique + point discret rouge, aucun crash |

## 6. Prochaine étape — Phase 8 : PWA

`@angular/pwa` (service worker + manifeste), **précache des assets critiques** — app, œuvres, polices, WASM MediaPipe (arbitrage des variantes : les 3 = 34 Mo vs SIMD seul ≈ 12 Mo pour la cible Android/Chrome), test mode avion (CA-08), puis procédure d'installation sur tablette.
