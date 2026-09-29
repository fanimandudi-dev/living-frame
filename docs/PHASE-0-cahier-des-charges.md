# Living Frame V0 — Cahier des charges fonctionnel

**Phase 0 — Analyse**

| | |
|---|---|
| **Version** | 0.1 |
| **Statut** | ⏳ En attente de validation — aucun code produit avant validation |
| **Date** | 29 septembre 2026 |
| **Documents liés** | `PHASE-1-architecture.md` (proposition d'architecture, à valider également) |
| **Prochaine étape** | Phase 1 (architecture) → Phase 2 (initialisation Angular) |

---

## Sommaire

0. Reformulation du problème
1. Contexte
2. Problème
3. Vision
4. Objectif général
5. Objectifs spécifiques
6. Acteurs
7. Besoins
8. Exigences fonctionnelles
9. Exigences non fonctionnelles
10. Contraintes
11. Scénarios d'utilisation
12. Périmètre V0
13. Hors périmètre
14. Critères d'acceptation
15. Risques
16. Traçabilité : Besoin → Exigence → Fonctionnalité → Solution technique
17. Décisions à valider

---

## 0. Reformulation du problème

> **Comment faire réagir une œuvre accrochée au mur à la présence d'un spectateur, de manière naturelle, progressive et réversible, sur du matériel grand public (tablette dans un cadre), avec un traitement 100 % local — sans que le spectateur ne perçoive jamais la technologie ?**

Le V0 n'est pas un produit : c'est une **preuve d'expérience**. Ce qu'il doit prouver, en une phrase :

> *Une personne s'approche d'un tableau → le tableau détecte sa présence → l'œuvre se transforme naturellement → un message apparaît → l'œuvre revient à son état initial.*

Si cette phrase est démontrable **physiquement, devant un client, sans réseau**, le V0 est réussi. Tout ce qui n'est pas nécessaire à cette démonstration est hors périmètre.

---

## 1. Contexte

- **Living Frame** est un concept de cadres artistiques interactifs destinés aux événements et lieux de passage : mariages, hôtels, entreprises, galeries, anniversaires, réceptions de prestige.
- À première vue, l'objet ressemble à un tableau classique. En présence d'un spectateur, l'œuvre s'anime : changement subtil du regard, sourire, message de bienvenue, puis retour à l'œuvre initiale.
- Le marché de l'affichage dynamique existe, mais il produit une esthétique « écran publicitaire » — pas une émotion artistique. Living Frame se positionne sur l'écart entre **tableau** et **écran**.
- Le V0 est développé en équipe réduite (porteur de projet + accompagnement technique), **sans backend**, comme application web installable (PWA) sur une tablette.

---

## 2. Problème

Le problème se décompose en trois niveaux :

1. **Produit** — une œuvre statique n'interagit pas ; un écran interactif classique trahit la technologie (interface visible, chrome du navigateur, esthétique « dashboard ») et casse l'émotion. L'illusion « c'est un tableau vivant » est fragile : le moindre élément technique visible la détruit.
2. **Technique** — détecter une présence en temps réel sur tablette, **localement** (aucune donnée envoyée), de façon robuste (éclairage variable, fausses alertes, scintillement de détection), et piloter des transitions visuelles fluides — le tout dans un navigateur web.
3. **Commercial** — convaincre un premier client potentiel avec un **objet physique fiable**, pas une vidéo de démonstration. Lors d'une démo, la fiabilité prime sur l'étendue des fonctionnalités : un prototype qui plante devant le client détruit la crédibilité du produit.

---

## 3. Vision

- Le visiteur devant l'œuvre **oublie la technologie**. Ce qu'il retient : « le tableau m'a répondu ».
- La réaction est **progressive** (fondu, regard qui change, sourire qui apparaît) — jamais un interrupteur tout-ou-rien.
- L'esthétique est **premium, sobre, artistique** : jamais « dashboard IA », jamais néon, jamais gradient criard.
- La **confidentialité est une composante du produit**, pas une contrainte : tout se passe à l'intérieur du cadre, rien ne sort. C'est un argument commercial et éthique (mariages, hôtels : les clients y sont sensibles).

---

## 4. Objectif général

Construire et livrer un **prototype mono-poste** — une tablette en mode kiosque placée dans un cadre — démontrable physiquement à un client potentiel, fonctionnant **hors ligne**, entièrement **configurable localement** par l'organisateur, et reposant sur une architecture propre suffisamment solide pour évoluer vers le produit physique (autres capteurs, autres scénarios).

---

## 5. Objectifs spécifiques

| ID | Objectif | Mesure de succès |
|----|----------|------------------|
| OS-1 | Détecter localement une présence devant le cadre, avec 3 niveaux de distance (FAR / NEAR / VERY_NEAR) | Détection fiable en intérieur correctement éclairé (validation qualitative sur site de démo) |
| OS-2 | Implémenter la machine à états complète, testée automatiquement | TEST-01 et TEST-02 automatisés et verts |
| OS-3 | Rendre l'expérience configurable sans code (Studio) | Un organisateur non technique change message, images et délais en moins de 5 minutes |
| OS-4 | Persister la configuration localement + configuration par défaut | Redémarrage complet → configuration intacte (CA-09) |
| OS-5 | Permettre la simulation sans caméra (Preview) | Cycle complet rejouable sans caméra, état par état |
| OS-6 | Fonctionner 100 % hors ligne après installation | Mode avion : cycle complet + Studio fonctionnel (CA-08) |
| OS-7 | Produire une expérience « tableau, pas application » | Aucun élément technique visible en mode Frame (CA-12) |

---

## 6. Acteurs

| Acteur | Description | Relation au système |
|--------|-------------|---------------------|
| **Visiteur** | Spectateur de l'événement, devant le cadre. Aucune compétence technique. Ne manipule rien, ne sait pas qu'il y a une caméra. | Ne perçoit que le mode Frame (`/frame`) |
| **Organisateur** | Propriétaire de l'événement (mariés, hôtelier, entreprise). Non technique. | Utilise `/studio` pour configurer, lance `/frame` pour la démonstration |
| **Démonstrateur** | L'équipe projet (nous). Installe la tablette, diagnostique, présente. | Utilise `/preview`, `/studio`, connaît les URL et les modes de repli |
| **Support d'exécution** | Tablette dans le cadre physique, navigateur, caméra frontale. | Support technique de l'application |

*Hors V0 : administrateur distant, gestion d'une flotte de cadres, mise à jour à distance.*

---

## 7. Besoins

### 7.1 Besoins du Visiteur

| ID | Besoin |
|----|--------|
| B-V1 | Voir l'œuvre **réagir progressivement** à sa présence (pas un basculement brutal) |
| B-V2 | Vivre une expérience « œuvre d'art », pas un écran informatique |
| B-V3 | Recevoir un **message personnalisé** (émotion, bienvenue) |
| B-V4 | Voir l'œuvre **revenir naturellement** à son état initial |
| B-V5 | Être respecté : **aucune image enregistrée ni transmise** |

### 7.2 Besoins de l'Organisateur

| ID | Besoin |
|----|--------|
| B-O1 | Personnaliser l'événement, l'œuvre, le message et les timings **sans écrire de code** |
| B-O2 | Prévisualiser le résultat **sans mobiliser la caméra** (avant l'événement) |
| B-O3 | Être certain que l'expérience fonctionne **pendant l'événement, sans réseau** |
| B-O4 | Lancer le mode « cadre » en **une seule action** (plein écran, rien d'autre à l'écran) |
| B-O5 | Retrouver sa configuration après un redémarrage de la tablette |

### 7.3 Besoins du Démonstrateur

| ID | Besoin |
|----|--------|
| B-D1 | Tester la machine à états **sans caméra** (simulation) |
| B-D2 | **Diagnostiquer** les problèmes (caméra refusée, détection en échec) sans casser l'expérience client |
| B-D3 | Récupérer un **état stable** après toute erreur |

---

## 8. Exigences fonctionnelles

Priorités MoSCoW : **M** = indispensable au V0, **S** = souhaitable, **C** = optionnel.

### 8.1 Affichage (mode Frame)

| ID | Exigence | Prio |
|----|----------|------|
| EF-01 | Le mode Frame (`/frame`) occupe 100 % de l'écran, n'affiche **aucun élément d'interface** (bouton, texte technique, curseur visible), en orientation paysage prioritaire | M |
| EF-02 | En IDLE, le cadre affiche l'œuvre initiale (`idleImage`) | M |
| EF-03 | En ENGAGED/HOLD, le cadre affiche l'œuvre transformée (`engagedImage`) avec fondu, et le message avec apparition typographique élégante | M |

### 8.2 Détection

| ID | Exigence | Prio |
|----|----------|------|
| EF-04 | Le système détecte une **présence** devant le cadre via la caméra frontale, avec un traitement 100 % local, sans identification ni stockage d'images | M |
| EF-05 | Le système estime grossièrement la distance en 3 niveaux (FAR / NEAR / VERY_NEAR) par heuristique de taille de boîte détectée | M |
| EF-06 | Le système filtre le bruit de détection : confirmation temporisée de la présence **et** de l'absence (anti-scintillement) | M |

### 8.3 Interaction (machine à états)

| ID | Exigence | Prio |
|----|----------|------|
| EF-07 | Le comportement est piloté par une machine à états IDLE → APPROACH → ENGAGED → HOLD → RESET → IDLE, conforme à la table de transitions validée en Phase 1 | M |
| EF-08 | Pendant APPROACH, la transformation est **progressive**, son intensité liée au niveau de distance | S |
| EF-09 | Le message apparaît en fondu pendant ENGAGED et reste visible pendant HOLD | M |
| EF-10 | Le retour à IDLE se fait en fondu (RESET), sans re-déclenchement intempestif (politique de ré-armement — décision D1, §17) | M |

### 8.4 Studio

| ID | Exigence | Prio |
|----|----------|------|
| EF-11 | Le Studio permet d'éditer : l'événement (nom, date, thème), l'œuvre (2 images importées depuis l'appareil), le message, les 3 délais (réaction, durée du message, retour), et les 3 activations (détection / transformation / message) | M |
| EF-12 | Le Studio offre les boutons : **Prévisualiser**, **Enregistrer**, **Lancer le cadre** | M |
| EF-13 | Validation basique des saisies : message non vide si activé, délais dans des bornes raisonnables | S |

### 8.5 Persistance

| ID | Exigence | Prio |
|----|----------|------|
| EF-14 | La configuration et les images importées sont sauvegardées en **IndexedDB**, et rechargées au démarrage | M |
| EF-15 | Si le stockage est vide ou corrompu, une **configuration par défaut embarquée** est utilisée (œuvre de démonstration incluse) | M |

### 8.6 Preview

| ID | Exigence | Prio |
|----|----------|------|
| EF-16 | `/preview` permet de déclencher **manuellement** chaque état et de lire **automatiquement** le cycle complet, sans caméra | M |

### 8.7 Robustesse

| ID | Exigence | Prio |
|----|----------|------|
| EF-17 | Caméra refusée ou indisponible : aucune exception non gérée. En Frame : œuvre statique + indicateur discret ; en Studio : message clair ; Preview reste accessible | M |
| EF-18 | Erreur MediaPipe (initialisation, modèle) : repli silencieux sur l'œuvre statique, état IDLE stable | M |
| EF-19 | Quitter `/frame` libère la caméra et nettoie tous les timers et abonnements | M |

### 8.8 Kiosque

| ID | Exigence | Prio |
|----|----------|------|
| EF-20 | « Lancer le cadre » : navigation vers `/frame` + passage en plein écran + maintien de l'éveil (Wake Lock, avec repli silencieux si non supporté) | S |
| EF-21 | La route par défaut `''` redirige vers `/frame` | M |

---

## 9. Exigences non fonctionnelles

| ID | Catégorie | Exigence | Cible mesurable |
|----|-----------|----------|-----------------|
| ENF-P1 | Performance | Réactivité de la réaction | Entre confirmation de présence et début du fondu : ≤ 200 ms ; présence physique → début du fondu : ≤ 1,5 s (anti-rebond inclus) |
| ENF-P2 | Performance | Fluidité des animations | 60 fps sur tablette cible (uniquement propriétés `opacity` / `transform`) |
| ENF-P3 | Performance | Sobriété CPU | Analyse de détection throttlée (~8 échantillons/s), caméra limitée à 640×480, boucle de détection hors du cycle de détection Angular |
| ENF-O1 | Offline | Aucune dépendance réseau à l'exécution | Mode avion : cycle complet + Studio fonctionnels (CA-08) |
| ENF-O2 | Offline | Taille de la PWA raisonnable | ≈ 15 Mo maximum attendus (à confirmer en Phase 6 avec MediaPipe empaqueté) |
| ENF-PR1 | Confidentialité | Traitement local uniquement | Aucune image caméra stockée ou transmise ; aucun identifiant biométrique extrait (détection de présence, jamais identification — voir §10) |
| ENF-R1 | Robustesse | Erreurs maîtrisées | Aucune exception non gérée : permission refusée, caméra absente, modèle en échec, stockage indisponible |
| ENF-R2 | Robustesse | Pas de fuite de ressources | Caméra libérée, timers et abonnements nettoyés ; mémoire stable après 10 cycles |
| ENF-M1 | Maintenabilité | Code | TypeScript strict, zéro `any` non justifié, découplage détection / métier documenté |
| ENF-T1 | Testabilité | Moteur testable sans caméra | Machine à états testée unitairement via un adaptateur de détection factice |
| ENF-U1 | UX | Esthétique Frame | Premium, sobre, artistique ; typographie locale (police embarquée), aucun élément « dashboard » |
| ENF-C1 | Compatibilité | Cible matérielle | Tablettes Android / Chrome (cible principale de démo) ; iPad / Safari en objectif non garanti V0 |

---

## 10. Contraintes

1. **Stack imposée** : Angular moderne (v22 stable à ce jour — version figée en Phase 2), TypeScript strict, Angular Signals, SCSS, Angular Router, composants standalone, MediaPipe (Tasks Vision), `getUserMedia()`, IndexedDB, PWA.
2. **Interdits** : backend, base de données distante, serveur obligatoire à l'exécution, cloud, reconnaissance faciale, identification biométrique, génération d'images IA à l'exécution.
3. **⚠ Contrainte de déploiement — HTTPS** : `getUserMedia()` et l'installation PWA exigent un contexte **HTTPS** (ou `localhost`). « Pas de serveur » signifie *pas de serveur d'exécution* : l'application (fichiers statiques) doit être **servie une fois en HTTPS** pour être installée sur la tablette, puis fonctionne 100 % localement. Signalé conformément à la règle du prompt maître (§17).
4. **⚠ Contrainte MediaPipe — offline** : `@mediapipe/tasks-vision` et son modèle sont **chargés depuis un CDN par défaut**. Pour l'offline, les fichiers WASM et le modèle (`.tflite`) doivent être **copiés dans les assets locaux** et référencés en relatif. Faisable, éprouvé, prévu dès la Phase 6 — mais cela doit être validé **avant** d'écrire la moindre ligne de détection. C'est le risque n°1 du V0 (R1).
5. **Détection de présence ≠ reconnaissance faciale** : nous détectons *« quelqu'un est là »* (une boîte englobante), jamais *« qui »*. Aucune donnée biométrique n'est extraite, comparée ou conservée. Distinction juridiquement importante et à utiliser dans la communication client.
6. **Mono-poste, mono-œuvre, mono-scénario, mono-langue (FR)** en V0.
7. **Matériel** : caméra frontale de la tablette — l'ouverture du cadre physique ne doit pas obstruer l'objectif (contrainte de conception du cadre, Phase 9).

---

## 11. Scénarios d'utilisation

### SCU-01 — Visiteur : découverte (scénario nominal)
1. Personne absente → le cadre affiche l'œuvre initiale (IDLE).
2. Une personne entre dans le champ et s'approche → la présence est confirmée après stabilisation (APPROACH) → l'œuvre commence à changer **subtilement** (fondu partiel, intensité liée à la distance).
3. Elle s'arrête près du cadre (NEAR+) pendant le délai de réaction → transformation complète + le message apparaît en fondu (ENGAGED).
4. Le message reste affiché (HOLD) pendant la durée configurée.
5. Elle s'éloigne (ou la durée expire) → fondu de retour (RESET) → œuvre initiale (IDLE).
**Résultat** : émotion, aucune perception d'une interface technique.

### SCU-02 — Visiteur : passage rapide
Une personne traverse le champ à distance, brièvement. La présence n'est jamais confirmée. **Résultat** : le cadre reste en IDLE, aucun scintillement.

### SCU-03 — Visiteur : présence prolongée
Après un cycle complet, la personne reste devant le cadre. **Résultat** : l'œuvre reste dans son état initial ; un nouveau cycle ne démarre qu'après absence confirmée puis retour (politique mono-passe — décision D1).

### SCU-04 — Organisateur : préparation de l'événement
1. Ouvre `/studio`.
2. Saisit le nom, la date, le thème de l'événement.
3. Importe les deux photos (portrait neutre / portrait souriant — prises quasi identiques).
4. Saisit le message, règle les délais et les activations.
5. Clique **Prévisualiser** → vérifie le cycle → ajuste.
6. Clique **Enregistrer** puis **Lancer le cadre**.
**Résultat** : le cadre est prêt, en plein écran.

### SCU-05 — Organisateur : redémarrage
La tablette redémarre. L'organisateur rouvre la PWA. **Résultat** : configuration intacte, arrivée directe sur `/frame`.

### SCU-06 — Démonstrateur : démo sans caméra
Ouverture de `/preview` → lecture automatique du cycle → explication des états au client. **Résultat** : le scénario est démontrable même sans permission caméra.

### SCU-07 — Erreur : caméra refusée
`/frame` affiche l'œuvre statique avec un indicateur discret (interprétable par l'organisateur, invisible pour un visiteur) ; `/studio` affiche l'erreur clairement ; `/preview` reste disponible. **Résultat** : aucune panne visible, aucun crash.

### SCU-08 — Hors ligne
Mode avion activé après installation. **Résultat** : cycle complet fonctionnel, Studio charge et enregistre.

---

## 12. Périmètre V0

- 3 routes : `/frame`, `/studio`, `/preview`
- 1 œuvre configurable (2 images : initiale / engagée)
- 1 scénario éditorial (« Welcome ») — l'abstraction permettant d'autres scénarios existe, mais un seul est implémenté
- Détection de présence **mono-personne** (la plus grande boîte détectée), 3 niveaux de distance
- Machine à états complète : IDLE / APPROACH / ENGAGED / HOLD / RESET
- Studio en français, sans compte ni authentification
- Persistance IndexedDB + configuration par défaut embarquée
- Preview manuel + lecture automatique
- PWA installable, 100 % offline après installation
- Plein écran + Wake Lock (avec repli silencieux)
- Gestion d'erreurs définie (matrice en Phase 1, §14)
- Tests unitaires du moteur + procédure de test manuel de démonstration
- Documentation : README technique + guide d'installation sur tablette

## 13. Hors périmètre V0

*(l'architecture reste ouverte sur ces points — mention de la raison)*

| Hors périmètre | Pourquoi / ouverture |
|----------------|----------------------|
| Multi-visiteurs (compter, réagir à plusieurs personnes) | Complexité de détection et de scénario inutile pour la démo |
| Identification / reconnaissance faciale | **Interdit par le produit** (pas seulement le V0) |
| Son, musique | Alourdit la démo (autorisation, matériel), reporté |
| Séquences multi-œuvres, diaporamas | V1+ |
| Plusieurs scénarios éditoriaux (Corporate, Hôtel, Galerie…) | L'abstraction `Scenario` est prévue ; un seul interprété en V0 |
| Planification horaire, mode nuit | V1+ |
| Administration distante, télémétrie | Contradictoire avec « no cloud » |
| Multi-langue | V0 = français |
| Capteurs matériels (ESP32, capteur PIR, autre caméra) | **L'interface `DetectionAdapter` est conçue exactement pour ce remplacement** — c'est l'exigence d'évolution matérielle du prompt maître |
| Génération d'images IA à l'exécution | Interdit par le prompt maître |
| Effets vidéo complexes (particules, 3D) | Contredit l'esthétique « tableau » |
| Mode portrait testé | Paysage prioritaire ; rien ne doit *bloquer* le portrait |

---

## 14. Critères d'acceptation

| ID | Critère | Exigences couvertes | Vérification |
|----|---------|---------------------|--------------|
| CA-01 | Cycle nominal complet : IDLE → APPROACH → ENGAGED → HOLD → RESET → IDLE, dans l'ordre et dans les temps impartis | EF-07 | **Test auto (TEST-01)** |
| CA-02 | Sans présence : l'état reste IDLE indéfiniment | EF-07 | **Test auto (TEST-02)** |
| CA-03 | Anti-rebond : une absence < durée de confirmation ne provoque pas de RESET ; une présence brève ne provoque pas d'APPROACH | EF-06 | Test auto |
| CA-04 | Latence de réaction conforme (≤ 200 ms après confirmation) | EF-07, ENF-P1 | Test auto + vérification manuelle |
| CA-05 | Caméra refusée : aucune exception, œuvre statique, indicateur discret, Studio informatif, Preview accessible | EF-17 | **Test auto (TEST-03)** + manuel |
| CA-06 | MediaPipe en échec → repli stable sur œuvre statique, IDLE maintenu | EF-18 | Manuel (échec simulé) |
| CA-07 | Stockage vide/corrompu → configuration par défaut chargée, application fonctionnelle | EF-15 | Test auto |
| CA-08 | Mode avion après installation : cycle complet + Studio enregistre | ENF-O1 | Manuel |
| CA-09 | Après rechargement complet : configuration intacte (textes, délais, images importées) | EF-14 | Manuel |
| CA-10 | Message modifié dans le Studio → utilisé par le Frame au cycle suivant, sans rechargement forcé | EF-11, EF-14 | **Test auto (TEST-04)** + manuel |
| CA-11 | Quitter `/frame` : caméra libérée (témoin navigateur éteint), timers nettoyés, mémoire stable sur 10 cycles | EF-19, ENF-R2 | Manuel (outils dev) |
| CA-12 | Illusion « tableau » : 3 à 5 personnes ne perçoivent **aucun** élément technique pendant le cycle | EF-01, ENF-U1 | Test utilisateur informel |
| CA-13 | Preview : lecture automatique du cycle complet sans caméra | EF-16 | Manuel |

---

## 15. Risques

*Probabilité / Impact : F faible, M moyenne, É élevée.*

| ID | Risque | P | I | Parade |
|----|--------|---|---|---------|
| R1 | **MediaPipe offline** : WASM + modèle chargés via CDN par défaut → bloque l'offline | M | É | Empaquetage local dès la Phase 6 (copie des fichiers dans `/assets`) ; CA-08 en critère de sortie ; tailles vérifiées |
| R2 | **HTTPS & permission caméra** lors de la démo physique | M | É | Installation PWA + permission accordées **avant** la démo ; procédure documentée ; mode simulation en secours |
| R3 | **Éclairage / conditions de détection** variables selon le lieu | M | M | Seuils calibrables (constantes centralisées), hystérésis, tests sur site si possible avant la démo |
| R4 | **Performance tablette** bas de gamme (chaleur, lag) | M | M | Caméra 640×480, analyse ~8 Hz, animations GPU uniquement, délégué GPU MediaPipe |
| R5 | **Estimation de distance imprécise** (mono-caméra) | É | F (V0) | 3 niveaux grossiers, seuils larges, calibrage en Phase 6 ; le V0 tolère l'imprécision |
| R6 | **Ambiguïtés de la machine à états** → comportements incohérents (départ pendant HOLD, re-déclenchement…) | M | É | Table de transitions **complète** validée en Phase 1 (§6 du doc d'architecture) ; chaque ligne = un test unitaire |
| R7 | **Scintillement de détection** (présence/absence alternées) | É | M | Confirmation temporisée dans les deux sens (EF-06) |
| R8 | **Sur-ingénierie** (DSL de scénarios, multi-détection, abstractions inutiles) | M | É | Règle anti-sur-ingénierie stricte ; V0 = 1 scénario, pas de DSL ; chaque ajout justifié par une fonctionnalité V0 |
| R9 | **iOS/PWA** : stockage évacué après ~7 jours sans utilisation (Safari) | M | M (si iPad) | Cible **Android** pour la démo ; documented dans le guide d'installation |
| R10 | **Mise en veille de l'écran** pendant la démo | M | É | Wake Lock + réglage « rester allumé » de la tablette ; vérifié en Phase 9 |
| R11 | **Qualité du couple d'images** : l'effet « magique » exige 2 prises quasi identiques (même cadrage) | M | É (perçu) | Direction artistique des assets de démonstration (Phase 3) + mini-guide de prise de vue pour l'organisateur |
| R12 | **Mise à jour du service worker** pendant une démo | F | M | Version figée avant chaque démo ; pas de mise à jour automatique en kiosque |

---

## 16. Traçabilité : Besoin → Exigence → Fonctionnalité → Solution technique

### 16.1 Les quatre notions (à ne jamais confondre)

| Notion | Définition | Exemple fil rouge |
|--------|------------|-------------------|
| **Besoin** | Manque ou attente exprimé par un acteur, **indépendant de toute solution** | « Le visiteur veut que l'œuvre réagisse à sa présence » (B-V1) |
| **Exigence** | Ce que le système **doit faire / doit être** pour satisfaire le besoin — atomique, testable | « Le système détecte une présence devant le cadre en ≤ 1,5 s » (EF-04, ENF-P1) |
| **Fonctionnalité** | Capacité **observable dans l'interface**, qui réalise l'exigence | « Le mode Frame anime l'œuvre par fondu progressif en deux couches d'images » |
| **Solution technique** | Choix d'**implémentation** (bibliothèque, service, algorithme) — remplaçable sans changer l'exigence | « MediaPipe Face Detector encapsulé dans `DetectionAdapter` ; opacité CSS pilotée par signals » |

### 16.2 Chaînes de traçabilité

| Besoin | → Exigences | → Fonctionnalité | → Solution technique (V0) |
|--------|-------------|------------------|---------------------------|
| B-V1 : l'œuvre réagit à ma présence | EF-04, EF-05, EF-06, EF-07, EF-08 | Détection de présence + transformation progressive pilotée par la machine à états | MediaPipe encapsulé dans `DetectionAdapter` → `InteractionEngine` (FSM + anti-rebond) → deux calques d'images à opacité pilotée |
| B-V2 : une œuvre, pas un écran | EF-01, EF-02, EF-03, ENF-U1 | Frame plein écran sans aucune UI, esthétique premium | Route `/frame` lazy-loadée, composant sans chrome, police embarquée, animations `opacity` uniquement |
| B-V3 : un message pour moi | EF-03, EF-09 | Message typographique apparaissant en fondu | Calque texte en police serif locale, transition CSS retardée, contenu issu de la configuration |
| B-V4 : retour à la normale | EF-10 | Fondu de retour puis stabilité | Timer `resetDelayMs` dans le moteur, politique de ré-armement (décision D1) |
| B-V5 : confidentialité | ENF-PR1 | Aucune donnée ne quitte l'appareil, rien n'est enregistré | Traitement 100 % local MediaPipe (WASM), zéro requête réseau, aucun stockage d'images caméra |
| B-O1 : personnaliser sans code | EF-11, EF-12, EF-13 | Studio : formulaire complet + import d'images + prévisualisation | Formulaire réactif Angular, upload → Blob → IndexedDB (`StorageService`) |
| B-O2 : prévisualiser sans caméra | EF-16 | Preview : états manuels + lecture automatique du cycle | `ScriptedDetector` (implémentation de test de `DetectionAdapter`) branché sur le même moteur |
| B-O3 : ça doit marcher sans réseau | EF-14, EF-15, ENF-O1, ENF-O2 | PWA offline, config persistée, défauts embarqués | `@angular/pwa` + précache (app, WASM, modèle, polices, images) + IndexedDB |
| B-O4 : lancer en une action | EF-20, EF-21 | Bouton « Lancer le cadre » | Navigation `/frame` + Fullscreen API + Screen Wake Lock |
| B-O5 : retrouver sa config | EF-14, EF-15 | Persistance et reprise après redémarrage | IndexedDB (config + images) + amorçage des défauts si vide |
| B-D1 : tester sans caméra | EF-16, ENF-T1 | Preview identique au Frame, capteur simulé | Même `InteractionEngine`, adaptateur factice injecté |
| B-D2 / B-D3 : diagnostiquer et récupérer | EF-17, EF-18, EF-19 | Matrice d'erreurs avec replis stables | Statut de détection exposé (`DetectionStatus`), replis par mode (voir architecture §14) |

---

## 17. Décisions tranchées — validées le 29/09/2026 ✅

| ID | Décision | Décision retenue |
|----|----------|------------------|
| **D1** | **Politique de fin de cycle** : que se passe-t-il si la personne s'éloigne pendant ENGAGED/HOLD ? Et quand peut-on rejouer un cycle ? | **Grâce** : le message reste `holdDurationMs` même si la personne part ; **mono-passe** : un nouveau cycle exige une absence confirmée — l'œuvre « salue une fois par visite », pas de boucle mécanique |
| **D2** | **Détecteur V0** : détection de **visage** (modèle ~224 Ko, très rapide, distance fiable) ou détection de **personne** (modèle ~4–5 Mo, détecte même de profil/dos) ? | **Visage (BlazeFace short-range)** : le visiteur regarde l'œuvre de toute façon ; détecte une *présence*, jamais une *identité* (conforme à l'interdit de reconnaissance faciale) |
| **D3** | **Condition d'ENGAGED** : proximité (NEAR+) maintenue pendant `engageDelayMs`, ou simple durée de présence ? | **Proximité + délai** : cohérent avec la vision « l'œuvre réagit quand on *s'approche* » ; la distance ne fait que moduler l'intensité en APPROACH si l'on préfère la sécurité |
| **D4** | **Validation globale** du présent cahier des charges et de l'architecture proposée (document suivant) | — |

*Décisions mineures (tranchées par défaut, modifiables sans impact) : garder le nom `ScenarioEngineService` pour le gestionnaire de configuration (contenu volontairement mince en V0) ; champs date/thème de l'événement stockés mais non affichés dans le Frame (réservés au Studio / au message par défaut) ; Angular v22 figé en Phase 2.*

**Résultat de la validation (29/09/2026)** : D1 = **grâce + mono-passe** · D2 = **détection de visage (BlazeFace short-range)** · D3 = **proximité + délai** · D4 = documents validés en l'état. → Phase 2 lancée.
