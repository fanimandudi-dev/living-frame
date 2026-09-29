# Living Frame V0 — Phase 4 : Studio

| | |
|---|---|
| **Statut** | ✅ Terminée le 29/09/2026 |
| **Objectif** | L'organisateur configure tout sans code : événement, œuvre, message, interaction, timings — et lance le cadre |
| **Vérifications** | `ng build` ✅ · `ng test` **48/48** ✅ |
| **Prérequis** | Phase 3 (machine à états + renderer) |

---

## 1. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `shared/components/artwork-stage/` | **Composant partagé** : le rendu de l'œuvre (2 calques + message), piloté par des entrées signal — utilisé par Frame ET Preview |
| `core/storage/image-registry.service.ts` | Résolution `ImageRef` → URL (assets / object URLs) ; deviendra le pont IndexedDB en Phase 5 |
| `core/kiosk.service.ts` | Plein écran + Screen Wake Lock, chacun avec repli silencieux (EF-20) |
| `features/studio/` | **Le Studio complet** : formulaire réactif typé, validation, import d'images, 3 actions |
| `features/frame/` | Aminci : il assemble (scène + moteur + pilotage démo) — plus aucun rendu propre |
| `features/preview/` | Amélioré : la VRAIE scène d'œuvre pilotée manuellement — répétition générale |

## 2. Décisions d'implémentation

1. **Extraction d'ArtworkStageComponent** — le moment où `shared/components/` devient légitime : deux features (Frame, Preview) affichent la même œuvre. Composant de présentation pur : entrées signal (`state`, `distance`, `artwork`, `scenario`), zéro logique de décision. Le Frame ne fait plus qu'assembler.
2. **Formulaire réactif typé** (ReactiveFormsModule) plutôt que template-driven : validation conditionnelle propre (le message n'est requis que s'il est activé — EF-13), état du formulaire testable unitairement.
3. **Secondes dans l'UI, millisecondes dans la config** — conversion aux frontières (load/save). L'organisateur règle « 1,2 s », la machine reçoit 1200 ms.
4. **Préchargement du calque engagé** (effet dans la scène) — l'image « sourire » est dans le cache navigateur avant le premier ENGAGED : pas de flash blanc.
5. **« Prévisualiser » = `/frame?demo=1`** — la vraie expérience avec le détecteur scripté, pas un sous-produit visuel. Le bouton enregistre d'abord.
6. **« Lancer le cadre » = plein écran d'abord** — la requête Fullscreen doit rester dans le geste utilisateur (contrainte navigateur), puis navigation vers `/frame`.
7. **ImageRegistry in-memory en Phase 4** — les images importées vivent le temps de la session ; le service est le point d'insertion unique d'IndexedDB en Phase 5 (aucun composant ne changera).
8. **Détection de fichiers identiques** (risque R11) — si l'organisateur importe le même fichier pour les deux images, avertissement explicite : le tableau ne semblera pas vivant.

## 3. Correspondance avec le cahier des charges

| Exigence | Statut | Test |
|---|---|---|
| EF-11 (édition complète : événement, œuvre, message, toggles, délais) | ✅ | specs Studio — initialisation depuis la config, conversion s↔ms |
| EF-12 (Prévisualiser / Enregistrer / Lancer le cadre) | ✅ | spec navigation Prévisualiser ; kiosk testé |
| EF-13 (validation : message requis si activé, délais bornés) | ✅ | 3 specs (bouton Enregistrer désactivé) |
| EF-20 (plein écran + Wake Lock, repli silencieux) | ✅ | KioskService 2 specs (APIs absentes / présentes) |
| **TEST-04 complet** (message modifié dans Studio → utilisé par le Frame) | ✅ | partie 1 (Frame, Phase 3) + partie 2 (Studio → ScenarioEngine) |

**Limite assumée de la Phase 4** : la configuration est en mémoire — un rechargement la perd (CA-09 échoue encore). C'est exactement l'objet de la Phase 5 (IndexedDB).

## 4. Tests manuels suggérés

| # | Action | Attendu |
|---|--------|---------|
| M-7 | `/studio` : changer le message, Enregistrer, Prévisualiser | Le cadre en démo affiche le nouveau message |
| M-8 | `/studio` : importer deux photos (poses différentes), Enregistrer, Prévisualiser | Le fondu utilise VOS photos |
| M-9 | `/studio` : importer le même fichier deux fois | Avertissement « images identiques » |
| M-10 | `/studio` : vider le message (activé) | Enregistrer désactivé + message d'erreur |
| M-11 | `/studio` : Lancer le cadre (dans un vrai navigateur, pas l'iframe de préview) | Plein écran + /frame ; Escape pour sortir |
| M-12 | `/preview` : cliquer les états | La scène réelle réagit (opacité, message) |

## 5. Prochaine étape — Phase 5 : Persistance (IndexedDB)

`StorageService` (config + blobs images), amorçage des défauts, migrations (`version: 1`), replis (quota, base indisponible) — le `ImageRegistry` s'adosse à la base, `ScenarioEngine.load/save` persiste vraiment. Critère CA-09 : redémarrage → configuration intacte.
