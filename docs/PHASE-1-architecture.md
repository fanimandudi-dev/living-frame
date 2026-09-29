# Living Frame V0 — Proposition d'architecture

**Phase 1 — Architecture**

| | |
|---|---|
| **Version** | 0.1 |
| **Statut** | ✅ Validé le 29/09/2026 — grâce + mono-passe · détecteur visage · ENGAGED = proximité + délai |
| **Date** | 29 septembre 2026 |
| **Prérequis** | `PHASE-0-cahier-des-charges.md` validé |
| **Prochaine étape** | Phase 2 — Initialisation Angular |

---

## Sommaire

1. Principes directeurs
2. Vue d'ensemble
3. Structure des dossiers (et écarts justifiés)
4. Responsabilités par module
5. Modèles de données (contrats TypeScript)
6. Machine à états
7. Couche détection
8. InteractionEngine
9. ScenarioEngine (V0 volontairement mince)
10. StorageService (IndexedDB)
11. Flux de données nominal
12. Routing et shell applicatif
13. Offline & PWA
14. Matrice de gestion d'erreurs
15. Stratégie de tests
16. Performance
17. Choix refusés (anti-sur-ingénierie)
18. Décisions à valider

---

## 1. Principes directeurs

| # | Principe | Conséquence concrète |
|---|----------|----------------------|
| P1 | **Le métier ne connaît pas le capteur.** | Le moteur d'interaction dépend uniquement de l'interface `DetectionAdapter`. Remplacer MediaPipe par un ESP32 = écrire un nouvel adaptateur, zéro ligne de métier modifiée. |
| P2 | **Une seule source de vérité par concept.** | L'état du cadre → `InteractionEngine` (signals). La configuration → `ScenarioEngine`. Les octets persistés → `StorageService`. |
| P3 | **Tout ce qui est testable sans navigateur est testé sans navigateur.** | La FSM, l'anti-rebond et les timers sont testés unitairement avec un adaptateur factice et des timers virtuels. |
| P4 | **Offline by design.** | Aucun CDN à l'exécution. Tout asset requis (WASM MediaPipe, modèle, polices, images) est empaqueté dans la PWA. |
| P5 | **YAGNI strict.** | Chaque service doit répondre à : « quelle exigence EF-xx du cahier des charges me justifie ? » |
| P6 | **Le renderer est stupide.** | `FrameComponent` traduit `(état, distance, configuration)` → visuel. Aucune décision, aucune temporisation. |

---

## 2. Vue d'ensemble

```
┌─────────────┐  MediaStream   ┌─────────────────────────┐  PresenceSample   ┌───────────────────────────┐
│   Caméra    ├───────────────►│  MediaPipeDetector      ├──────────────────►│  InteractionEngine        │
│ (tablette)  │                │  (implémentation de     │    (~8 Hz)        │  FSM + anti-rebond +      │
└─────────────┘                │   DetectionAdapter)     │                   │  timers → Signals         │
                               └─────────────────────────┘                   └────────────┬──────────────┘
                               ┌─────────────────────────┐                                │ state(), distance(),
                               │  ScriptedDetector       │── (preview / repli) ──────────►│ personPresent()
                               │  (implémentation de     │                                ▼
                               │   DetectionAdapter)     │                   ┌───────────────────────────┐
                               └─────────────────────────┘                   │  FrameComponent (renderer)│
                                                                            │  état+config → images,    │
                               ┌─────────────────────────┐   FrameConfig     │  opacités, message        │
                               │  StorageService         ├──────────────────►└────────────▲──────────────┘
                               │  (IndexedDB)            │                                │
                               └────────────┬────────────┘                   ┌───────────────────────────┐
                                            └───────────────────────────────┤  ScenarioEngine           │
                                                                            │  (config active, toggles) │
                                                                            └───────────────────────────┘
```

**Chaîne du prompt maître** : CAMERA → DETECTION ADAPTER → INTERACTION ENGINE → SCENARIO ENGINE → RENDERER → FRAME. Elle est respectée à l'identique ; `ScenarioEngine` alimente le renderer et le moteur en **paramètres** (il n'est pas dans le flux image/détection, c'est un fournisseur de configuration).

**Règle d'or du découplage** : les flèches ne remontent jamais. Le détecteur ne connaît pas la FSM ; la FSM ne connaît pas MediaPipe ; le renderer ne décide de rien.

---

## 3. Structure des dossiers

```
src/
├── public/                                  # convention Angular 17+ — servi à la racine
│   ├── artworks/demo/            # œuvre de démonstration (idle.jpg, engaged.jpg)
│   ├── fonts/                    # police du message (woff2, embarquée → offline, Phase 8)
│   └── mediapipe/
│       ├── wasm/                 # fichiers WASM MediaPipe copiés du package npm (Phase 6)
│       └── models/               # modèle BlazeFace .tflite (Phase 6)
│
└── app/
    ├── core/
    │   ├── detection/
    │   │   ├── detection-adapter.ts          # CONTRAT : types + interface DetectionAdapter
    │   │   ├── camera.service.ts             # cycle de vie getUserMedia (permissions, stream)
    │   │   ├── mediapipe-detector.service.ts # implémentation MediaPipe du contrat
    │   │   └── scripted-detector.service.ts  # implémentation simulée (Preview, repli)
    │   │
    │   ├── interaction/
    │   │   ├── interaction-state.ts          # FrameState, DistanceLevel, paramètres de timings
    │   │   └── interaction-engine.service.ts # machine à états
    │   │
    │   ├── scenario/
    │   │   └── scenario-engine.service.ts    # configuration active + scénario courant
    │   │
    │   ├── kiosk.service.ts                 # plein écran + Wake Lock, replis silencieux (Phase 4)
    │   │
    │   └── storage/
    │       ├── image-registry.service.ts    # ImageRef → URL (assets / object URLs) (Phase 4)
    │       └── storage.service.ts           # IndexedDB : config + images (Phase 5)
    │
    ├── features/
    │   ├── frame/                             # RENDERER — le « tableau »
    │   │   ├── frame.component.ts / .html / .scss
    │   ├── studio/                            # configuration organisateur
    │   │   ├── studio.component.ts / .html / .scss
    │   └── preview/                           # simulation d'états sans caméra
    │       ├── preview.component.ts / .html / .scss
    │
    ├── shared/
    │   ├── models/
    │   │   ├── artwork.model.ts
    │   │   ├── scenario.model.ts
    │   │   └── frame-config.model.ts
    │   └── components/
    │       └── artwork-stage/                 # la scène d'œuvre, partagée Frame/Preview (Phase 4)
    │           └── artwork-stage.component.ts / .html / .scss
    │
    ├── app.routes.ts
    ├── app.config.ts
    └── app.component.ts                       # shell minimal : <router-outlet />
```

### Écarts par rapport à la structure proposée dans le prompt maître (tous justifiés)

| Écart | Justification |
|-------|---------------|
| ➕ `camera.service.ts` | Le cycle de vie `getUserMedia` (permission, stream, libération) est isolé du code MediaPipe. On peut ainsi distinguer « caméra refusée » de « détecteur en échec » (deux replis différents) et libérer le flux proprement en quittant `/frame`. |
| ➕ `scripted-detector.service.ts` | C'est lui qui rend `/preview` **et** le mode simulation possibles en réutilisant exactement le même moteur. C'est aussi la pièce maîtresse des tests unitaires. Une seule abstraction, trois usages : réel, démo, test. |
| ➕ `app.config.ts` | Standard Angular moderne (providers, router). Incontournable depuis Angular 17+. |
| ➖ Pas de dossier `shared/components/` | Il n'existe pas encore de composant réellement partagé. Créé quand (et seulement si) un besoin réel apparaît. Un dossier vide est du bruit. |
| 🔀 Types de détection (`FrameState`, `DistanceLevel`, `PresenceSample`) dans `core/`, pas dans `shared/models/` | Ces types font partie du **contrat technique** de détection, au plus près de l'interface qui les utilise. `shared/models/` ne contient que le domaine métier (œuvre, scénario, configuration). |

---

## 4. Responsabilités par module

| Élément | Responsabilité | Ne fait **jamais** |
|---------|----------------|--------------------|
| `CameraService` | Obtenir/libérer le flux caméra, exposer le statut de permission (`granted / denied / unavailable`), fournir l'élément vidéo | N'interprète pas les images, ne connaît pas MediaPipe |
| `DetectionAdapter` *(interface)* | Contrat : produire des `PresenceSample` et un statut, démarrer/arrêter | Ne dépend pas d'Angular (hors injection), ne connaît pas le métier |
| `MediaPipeDetectorService` | Convertit les frames vidéo en échantillons de présence (throttle ~8 Hz, seuils de distance) | Ne décide d'aucune transition, ne rend rien |
| `ScriptedDetectorService` | Rejoue des échantillons programmés (scénario temporel) | N'accède jamais à la caméra |
| `InteractionEngineService` | FSM, anti-rebond, timers, exposition de l'état via Signals | Ne sait pas ce qu'est une caméra ; ne connaît ni MediaPipe, ni l'œuvre ; ne rend rien |
| `ScenarioEngineService` | Charger/exposer/sauvegarder la configuration active ; exposer le scénario et ses toggles | N'interprète pas de DSL d'actions (V0) ; ne dessine pas |
| `StorageService` | IndexedDB (config + images), amorçage des défauts, résolution d'images en object URLs | Aucune logique métier |
| `FrameComponent` | Rendu : traduire état + distance + config en visuel (opacités, message) | Aucune décision de transition, aucun timer |
| `StudioComponent` | Édition, validation de saisie, import d'images, actions | Ne touche pas au moteur d'interaction |
| `PreviewComponent` | Piloter le `ScriptedDetector` / forcer des états | Rien d'autre (aucune logique métier propre) |

---

## 5. Modèles de données (contrats TypeScript)

> Ces définitions sont des **contrats d'architecture**, validés ici. L'implémentation complète arrive en Phase 2/3. TypeScript strict, aucun `any`.

### 5.1 État et interaction (`core/interaction/interaction-state.ts`)

```ts
/** Les 5 états obligatoires du cadre. */
export type FrameState = 'IDLE' | 'APPROACH' | 'ENGAGED' | 'HOLD' | 'RESET';

/** Niveaux de distance estimés (heuristique, calibrés en Phase 6). */
export type DistanceLevel = 'FAR' | 'NEAR' | 'VERY_NEAR';

/** Paramètres temporels du moteur (millisecondes). */
export interface InteractionTimings {
  presenceConfirmMs: number;  // présence stable requise avant APPROACH (déf. 600)
  absenceConfirmMs: number;   // absence stable requise avant RESET     (déf. 1200)
  engageDelayMs: number;      // délai avant réaction dans APPROACH     (déf. 1200)
  engageTransitionMs: number; // durée de la phase de transformation    (déf. 2000)
  holdDurationMs: number;     // durée d'affichage du message           (déf. 5000)
  resetDelayMs: number;       // durée du fondu de retour               (déf. 2000)
}
```

*Note : les trois délais exposés dans le Studio (EF-11) sont `engageDelayMs`, `holdDurationMs`, `resetDelayMs`. Les autres sont des constantes techniques non exposées, surchargeables par la configuration.*

### 5.2 Détection (`core/detection/detection-adapter.ts`)

```ts
/** Statut du sous-système de détection. */
export type DetectionStatus =
  | 'IDLE'          // pas démarré
  | 'STARTING'      // initialisation (caméra + modèle)
  | 'RUNNING'       // échantillons produits
  | 'DENIED'        // permission caméra refusée
  | 'UNAVAILABLE'   // pas de caméra
  | 'ERROR';        // échec détecteur (ex. MediaPipe)

/** Un échantillon de présence, émis à chaque analyse (~8 Hz). */
export interface PresenceSample {
  readonly present: boolean;
  readonly distance: DistanceLevel | null; // null si personne
  readonly timestamp: number;              // performance.now()
}

/** CONTRAT abstrait de détection — le moteur métier ne connaît QUE ceci. */
export interface DetectionAdapter {
  start(): Promise<void>;
  stop(): void;
  readonly status: DetectionStatus;
  readonly lastSample: PresenceSample | null;
  /** Enregistre un auditeur d'échantillons ; retourne la fonction de désabonnement. */
  onSample(listener: (sample: PresenceSample) => void): () => void;
}
```

**Pourquoi cette évolution par rapport au brouillon du prompt maître** (`isPersonPresent()` / `getDistanceLevel()`) :

| Brouillon | Contrat final | Raison |
|-----------|---------------|--------|
| `isPersonPresent(): boolean` | `lastSample` + `onSample()` | Une lecture ponctuelle oblige le moteur à *poller*. Le flux d'échantillons pousse l'information au moteur, qui garde la main sur les temporisations. Les deux lectures restent possibles via `lastSample`. |
| — | `DetectionStatus` | Exigences EF-17/EF-18 : le Frame doit distinguer *caméra refusée*, *caméra absente*, *détecteur en échec* pour choisir le bon repli — sans cela, impossible de gérer proprement les erreurs. |
| — | `distance: DistanceLevel \| null` | Une seule structure cohérente au lieu de deux appels désynchronisables. |

### 5.3 Domaine métier (`shared/models/`)

```ts
// artwork.model.ts
/** Référence d'image : soit un asset embarqué, soit un blob IndexedDB. */
export type ImageRef =
  | { source: 'asset'; path: string }     // ex. assets/artworks/demo/idle.jpg
  | { source: 'stored'; key: string };    // import Studio → IndexedDB

export interface Artwork {
  id: string;
  name: string;
  idleImage: ImageRef;
  engagedImage: ImageRef;
}
```

```ts
// scenario.model.ts
/** V0 : un seul scénario 'welcome'. Le type reste ouvert pour V1+. */
export interface Scenario {
  id: string;                       // 'welcome'
  name: string;                     // ex. « Wedding Welcome »
  detectionEnabled: boolean;        // EF-11 : Détection activée
  transformationEnabled: boolean;   // EF-11 : Transformation activée
  messageEnabled: boolean;          // EF-11 : Message activé
  engageDelayMs: number;            // EF-11 : Délai avant réaction
  holdDurationMs: number;           // EF-11 : Durée du message
  resetDelayMs: number;             // EF-11 : Délai de retour
  message?: string;                 // ex. « Bienvenue dans notre histoire »
}
```

```ts
// frame-config.model.ts
export interface EventInfo {
  name: string;                     // ex. « Mariage d'Aline & Marc »
  date?: string;                    // affichage Studio + gabarit de message
  theme?: string;                   // métadonnée (non rendue en Frame en V0)
}

export interface FrameConfig {
  version: 1;                       // migrations futures de la config persistée
  event: EventInfo;
  artwork: Artwork;
  scenario: Scenario;
}
```

*Ajouts par rapport aux modèles du prompt maître : `ImageRef` (deux provenances d'images sans dupliquer le modèle), toggles du scénario (exigés par le Studio §13), `version` (la config est persistée → migrations). Rien de plus.*

---

## 6. Machine à états

### 6.1 Les cinq états

| État | Signification | Visuel (renderer) | Entrée / Sortie |
|------|---------------|-------------------|-----------------|
| **IDLE** | Aucune présence confirmée | Œuvre initiale seule, opacité engagée = 0 | — |
| **APPROACH** | Présengement | Fondu **partiel** vers l'œuvre engagée, intensité liée à la distance (FAR ≈ 0.25 / NEAR ≈ 0.55 / VERY_NEAR ≈ 0.85) | Entrée : démarre `T_ENGAGE` |
| **ENGAGED** | Engagement (proche + délai écoulé — décision D3) | Transformation complète (opacité → 1) + le message apparaît en fondu retardé (~800 ms) | Entrée : démarre `T_TRANSITION` |
| **HOLD** | Phase stable du message | Message visible, œuvre engagée | Entrée : démarre `T_HOLD` |
| **RESET** | Retour | Fondu de retour vers l'œuvre initiale, message disparaît | Entrée : démarre `T_RESET` |

### 6.2 Événements et timers

- **Événements externes** : réception d'un `PresenceSample` ; `forceState(s)` (Preview uniquement) ; `reset()` (organisateur).
- **Timers internes** : `T_ENGAGE` (engageDelayMs), `T_TRANSITION` (engageTransitionMs), `T_HOLD` (holdDurationMs), `T_RESET` (resetDelayMs). Tous centralisés, tous effacés à chaque transition et au détachement.

### 6.3 Stabilisation (anti-rebond, EF-06)

```
À chaque échantillon :
  présent ?  → incrémenter le compteur de présence ; si absence confirmée était acquise
              pendant ≥ presenceConfirmMs  → émettre PRÉSENCE_CONFIRMÉE
  absent  ?  → incrémenter le compteur d'absence ; si présence était acquise
              pendant ≥ absenceConfirmMs   → émettre ABSENCE_CONFIRMÉE
  (un échantillon contraire remet le compteur correspondant à zéro)
```

### 6.4 Table de transitions

| # | État | Déclencheur | Garde | Actions | État suivant |
|---|------|-------------|-------|---------|--------------|
| T1 | IDLE | PRÉSENCE_CONFIRMÉE | `armed` | démarre `T_ENGAGE` | APPROACH |
| T2 | IDLE | PRÉSENCE_CONFIRMÉE | `!armed` (cycle déjà joué) | — (silence : politique mono-passe, D1) | IDLE |
| T3 | APPROACH | échantillon | `engageDelayMs` écoulés **et** distance ≥ NEAR (D3) | stop `T_ENGAGE`, démarre `T_TRANSITION`, `armed ← false` | ENGAGED |
| T4 | APPROACH | échantillon | délai écoulé mais distance = FAR | — (attend la proximité ; l'œuvre « sent » la présence, sans plus) | APPROACH |
| T5 | APPROACH | ABSENCE_CONFIRMÉE | — | stop `T_ENGAGE`, démarre `T_RESET` | RESET |
| T6 | ENGAGED | `T_TRANSITION` écoulé | — | démarre `T_HOLD` | HOLD |
| T7 | ENGAGED | ABSENCE_CONFIRMÉE | politique « grâce » (D1) | — (le cycle se termine de lui-même) | ENGAGED |
| T8 | ENGAGED / HOLD | ABSENCE_CONFIRMÉE | politique « coupe » (D1) | stop timers, démarre `T_RESET` | RESET |
| T9 | HOLD | `T_HOLD` écoulé | — | démarre `T_RESET` | RESET |
| T10 | RESET | `T_RESET` écoulé | — | si absence confirmée depuis ≥ `absenceConfirmMs` → `armed ← true` | IDLE |
| T11 | RESET | échantillon présent | — | — (on termine le fondu ; pas de re-déclenchement en plein retour) | RESET |
| T12 | tous | `forceState(s)` | mode simulation uniquement | efface tous les timers, applique `s` et ses timers d'entrée | `s` |
| T13 | tous | `reset()` | — | efface timers, `armed ← true` | IDLE |

**Chaque ligne de cette table = un cas de test unitaire** (voir §15).

### 6.5 Diagramme logique

```
                 PRÉSENCE_CONFIRMÉE (armed)
     ┌────────────────────────────────────────────┐
     │                                            ▼
┌────────┐  engageDelay + distance ≥ NEAR   ┌───────────┐  fin de transition
│  IDLE  │ ───────────────────────────────► │ APPROACH  │ ────────────────┐
│(œuvre  │                                   │(fondu     │                 ▼
│ repos) │                                   │ subtil)   │           ┌─────────┐
└────────┘                                   └───────────┘           │ ENGAGED │
     ▲                                          │        ▲            │(transfo.│
     │                                          │        │            │ + msg)  │
     │                                     ABSENCE_CONFIRMÉE          └─────────┘
     │                                          │        │(grâce: rien)   │
     │                                          ▼        │                ▼ fin T_TRANSITION
     │                                     ┌────────┐    │           ┌─────────┐
     │  fin T_RESET                    ┌───►│ RESET  │    │           │  HOLD   │
     │  (fondu retour,                 │    │(fondu  │◄───┼───────────│(message │
     │   re-armement)                  └────│ retour)│    │(coupe)    │ persiste)│
     └───────────────────────────────────────└────────┘    │           └─────────┘
                                            ▲              │                │ fin T_HOLD
                                            └──────────────┴────────────────┘
                                              (ABSENCE_CONFIRMÉE selon politique, ou fin de durée)
```

### 6.6 Politiques configurables (décisions D1/D3 du cahier des charges)

| Politique | Options | Défaut proposé |
|-----------|---------|----------------|
| Fin de cycle si départ pendant ENGAGED/HOLD | `grace` (le cycle se termine) / `cut` (RESET immédiat gracieux) | `grace` |
| Ré-armement | mono-passe (nouveau cycle après absence confirmée) / boucle tant que présence | mono-passe |
| Condition d'ENGAGED | proximité NEAR+ maintenue + `engageDelayMs` / délai seul | proximité + délai |

*Implémentation : une enum de politique dans `Scenario` (V0 : valeurs par défaut seulement, non exposées dans le Studio).*

---

## 7. Couche détection

### 7.1 `CameraService`

- `getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })`.
- Mappe les exceptions du navigateur vers un statut : `NotAllowedError` → `DENIED`, `NotFoundError/OverconstrainedError` → `UNAVAILABLE`, autre → `ERROR`.
- `stop()` : coupe **toutes** les pistes du stream (le témoin caméra du navigateur doit s'éteindre — critère CA-11).
- L'élément `<video>` est maintenu **hors écran** (1 px, opacité 0 — pas `display:none`, certains navigateurs cessent de décoder) ; le Frame ne l'affiche jamais.

### 7.2 `MediaPipeDetectorService` (Phase 6 uniquement)

- Package `@mediapipe/tasks-vision`, fichier WASM **copié depuis `node_modules` vers `assets/wasm/`** au build, modèle `.tflite` dans `assets/models/` → `FilesetResolver.forVisionTasks('/wasm')` en chemin **relatif**. Zéro CDN (R1).
- Détecteur proposé (D2) : **Face Detector, BlazeFace short-range** (~224 Ko, latence CPU ~3 ms/image). Détection de **présence** uniquement — aucune extraction de caractéristiques, aucune comparaison, aucun stockage (ENF-PR1).
- Boucle d'analyse : `setInterval` ~125 ms (≈ 8 Hz) hors zone Angular ; on prend la **plus grande boîte** détectée (personne principale).
- Distance : `ratio = hauteurBoîte / hauteurVidéo` → `VERY_NEAR ≥ 0.32 > NEAR ≥ 0.18 > FAR` (ordres de grandeur, calibrés en Phase 6).
- Échec d'initialisation → statut `ERROR`, aucune exception propagée au Frame (EF-18).
- Dégradation éclairage : le seuil de confiance du modèle reste celui par défaut ; c'est l'anti-rebond (§6.3) qui absorbe l'instabilité.

### 7.3 `ScriptedDetectorService`

Même contrat, aucune caméra : il émet des `PresenceSample` selon un scénario temporel (ex. « présent FAR à t=0, NEAR à t=3 s, absent à t=10 s »). Trois usages : `/preview` (EF-16), repli simulation après erreur (EF-17), et base des adaptateurs factices de test (ENF-T1).

---

## 8. InteractionEngine

**Problème** — La logique de transition entre IDLE, APPROACH, ENGAGED, HOLD et RESET ne doit appartenir **ni** au composant visuel, **ni** au détecteur. Sinon : logique métier non testable, couplage caméra→rendu, timers orphelins.

**Décision** — Un `InteractionEngineService` autonome, injectable, qui :
1. s'abonne à un `DetectionAdapter` (n'importe lequel) via `attach(adapter)` ;
2. applique l'anti-rebond (§6.3) et la table de transitions (§6.4) ;
3. expose l'état, la distance et la présence en **Signals** (lecture fine par le renderer, pas de re-rendu global) ;
4. centralise et nettoie tous les timers.

```ts
@Injectable({ providedIn: 'root' })
export class InteractionEngineService {
  readonly state: Signal<FrameState>;
  readonly distance: Signal<DistanceLevel | null>;
  readonly personPresent: Signal<boolean>;

  attach(adapter: DetectionAdapter): void;  // abonnement + runOutsideAngular
  detach(): void;                           // désabonnement + effacement des timers
  applyTimings(scenario: Scenario): void;   // reconfiguration à chaud (Studio)
  forceState(s: FrameState): void;          // simulation uniquement (Preview)
  reset(): void;                            // retour IDLE + ré-armement (T13)
}
```

- Le moteur ne **rend** rien et ne **décide** pas du visuel : il publie des faits (`state`, `distance`).
- `forceState` est réservé au mode simulation : il efface les timers avant d'appliquer l'état (sinon timers fantômes).
- Testable sans navigateur : adaptateur factice + `fakeAsync`/`tick()` de Zone.js pour les timers.

---

## 9. ScenarioEngine (V0 volontairement mince)

**Problème** — Le prompt maître prévoit un moteur de scénarios (TRIGGER/ACTION, six scénarios futurs). En V0, il n'y a **qu'un** scénario. Un interprète d'actions serait du sur-ingénierie (R8).

**Décision** — En V0, `ScenarioEngineService` = **fournisseur de la configuration active** :

```ts
@Injectable({ providedIn: 'root' })
export class ScenarioEngineService {
  readonly config: Signal<FrameConfig>;     // chargée ou configuration par défaut

  load(): Promise<void>;                    // StorageService → sinon défauts embarqués
  save(config: FrameConfig): Promise<void>; // persiste + met à jour le signal
  resetToDefault(): Promise<void>;          // EF-15
}
```

- Il **applique** les toggles du scénario : `detectionEnabled=false` → le Frame n'attache pas de détecteur (IDLE permanent) ; `transformationEnabled=false` → le renderer garde l'opacité à 0 mais le message suit son cours ; `messageEnabled=false` → pas de calque message.
- Il **propage les délais** au moteur (`applyTimings`).
- **Évolution prévue (V1+)** : quand plusieurs scénarios existeront, ce service deviendra l'interprète (sélection du scénario, composition d'actions). Le reste de l'application n'y verra rien — c'est précisément l'intérêt de l'avoir isolé.
- *Transparence : en V0, son contenu ressemble à un « ConfigService ». On garde le nom `ScenarioEngine` pour la continuité avec la vision produit ; à renommer si tu préfères l'honnêteté du nommage.*

---

## 10. StorageService (IndexedDB)

**Pourquoi IndexedDB et pas localStorage** — les images importées depuis le Studio (photos de mariage) pèsent plusieurs Mo ; localStorage est limité à ~5 Mo au total et stocke des chaînes. IndexedDB stocke des `Blob` nativement. Aucune bibliothèque : un wrapper minimal (~80 lignes) suffit (voir §17).

```
Base « living-frame », version 1
├── store "config"  (keyPath "id", clé unique 'active')  → FrameConfig (JSON)
└── store "images"  (sans keyPath, clé = string)         → Blob (images importées)
```

- **Amorçage** : premier lancement → si `config` vide, copie de la configuration par défaut (textes) ; les images de démonstration restent des `assets` (`ImageRef.source === 'asset'`) — pas de duplication inutile en base.
- **Résolution d'images** : `resolveImage(ref: ImageRef): Promise<string>` → object URL, avec **cache** et révocation lors du remplacement (fuite mémoire évitée, CA-11).
- **Erreurs** : quota dépassé / base indisponible → le Studio affiche un message clair, le Frame fonctionne avec la config en mémoire (aucun crash — ENF-R1).

---

## 11. Flux de données nominal (SCU-01)

```
 1. Ouverture /frame
 2. FrameComponent (init) ──► ScenarioEngine.load() ──► StorageService (IndexedDB ou défauts)
 3. StorageService ──► resolveImage(idle / engaged) ──► object URLs, PRÉCHARGÉES (pas de flash au 1er ENGAGED)
 4. si scenario.detectionEnabled : MediaPipeDetector.start()
      └─ CameraService.getUserMedia → statut RUNNING → boucle d'analyse ~8 Hz (hors zone Angular)
 5. Personne détectée : PresenceSample{present:true, distance:'FAR'}
 6. InteractionEngine : stabilité 600 ms → PRÉSENCE_CONFIRMÉE → state = APPROACH (signal)
 7. FrameComponent : opacité engagée ≈ 0.25 (fondu CSS)
 8. La personne approche : samples NEAR → opacité ≈ 0.55 (le moteur relaye la distance en signal)
 9. engageDelayMs écoulés + distance NEAR → state = ENGAGED → opacité → 1, message en fondu (retard 800 ms)
10. engageTransitionMs → state = HOLD (T_HOLD démarre)
11. La personne s'éloigne : absence confirmée 1200 ms → politique « grâce » : rien (T7)
12. T_HOLD écoulé → state = RESET → fondu de retour (resetDelayMs), message disparaît
13. T_RESET écoulé → state = IDLE ; armed reste false (personne encore là) ou re-armé (absence confirmée)
14. Quitter /frame → detach() + detector.stop() → caméra libérée, timers effacés
```

**Flux d'erreur caméra refusée** : `start()` rejette → statut `DENIED` → le Frame reste IDLE (œuvre statique) + indicateur discret ; le Studio affiche l'erreur et un lien vers `/preview` ; aucune exception (CA-05).

---

## 12. Routing et shell applicatif

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'frame' },        // EF-21 : kiosque direct
  { path: 'frame',   loadComponent: () => import('./features/frame/frame.component')
                        .then(m => m.FrameComponent) },         // EF-01
  { path: 'studio',  loadComponent: () => import('./features/studio/studio.component')
                        .then(m => m.StudioComponent) },
  { path: 'preview', loadComponent: () => import('./features/preview/preview.component')
                        .then(m => m.PreviewComponent) },
  { path: '**', redirectTo: 'frame' },
];
```

- `AppComponent` = `<router-outlet />` **uniquement**. Aucune barre de navigation globale : en mode kiosque, rien ne doit s'afficher autour de l'œuvre (EF-01). Le Studio et le Preview sont accessibles par URL ; depuis le Studio, « Lancer le cadre » navigue vers `/frame` + Fullscreen API + Wake Lock (EF-20).
- `loadComponent` (lazy) : le visiteur ne télécharge jamais le code du Studio — démarrage du Frame plus rapide, PWA plus légère.

---

## 13. Offline & PWA

| Sujet | Décision |
|-------|----------|
| Génération | `@angular/pwa` (ngsw). Precache : app shell, polices, images de démo, **WASM MediaPipe**, **modèle .tflite** |
| WASM + modèle | Copiés dans `assets/` au build (script de copie post-install), référencés en **chemin relatif** — jamais de CDN (R1) |
| Taille estimée | App Angular ~1–2 Mo + WASM ~5–7 Mo + modèle ~0,3 Mo (visage) / ~4–5 Mo (personne) + polices/images ~1–2 Mo → **≈ 8–12 Mo** (sous la cible ENF-O2 ; à confirmer en Phase 6) |
| Runtime réseau | **Zéro requête** après installation (ENF-O1) — vérifié en mode avion (CA-08) |
| Mises à jour SW | Version figée avant une démo ; pas d'update check en kiosque (R12) |
| Déploiement | Servie **une fois** en HTTPS (hébergement statique quelconque) pour installation sur tablette, puis 100 % autonome — clarification du « pas de cloud » : pas de serveur **d'exécution** |

---

## 14. Matrice de gestion d'erreurs

| Erreur | Comportement en Frame (visiteur) | Comportement en Studio | Technique |
|--------|----------------------------------|------------------------|-----------|
| Caméra refusée (`DENIED`) | Œuvre statique IDLE + indicateur discret (petit point coin bas, interprétable par l'organisateur, invisible de loin) | Message clair + proposition « Tester sans caméra » → `/preview` | `CameraService` mappe `NotAllowedError` ; le moteur n'est pas attaché |
| Caméra absente (`UNAVAILABLE`) | Idem | Message clair | Idem (`NotFoundError`) |
| MediaPipe échoue (`ERROR`) | Œuvre statique IDLE, pas de crash visible | Message + `/preview` proposé | `start()` résout en statut plutôt qu'en exception ; Frame garde la config en mémoire |
| Config absente/corrompue | Œuvre de démonstration par défaut | Champs préremplis avec les défauts | `ScenarioEngine.load()` → défauts embarqués (EF-15) |
| IndexedDB indisponible / quota | Frame tourne avec la config en mémoire (perdue au redémarrage) | Message « enregistrement impossible » | `StorageService` catch + statut |
| Réveil de l'appareil | — | — | Wake Lock demandé au lancement du cadre, repli silencieux si refusé |

**Règle générale** : toute erreur de détection dégrade l'expérience vers « tableau statique », jamais vers « écran d'erreur ». Le visiteur ne doit voir aucune interface technique (EF-17, ENF-U1).

---

## 15. Stratégie de tests

| Test du cahier des charges | Ce qu'on teste | Outil |
|---------------------------|----------------|-------|
| **TEST-01** (cycle nominal) | `InteractionEngineService` + adaptateur factice + `fakeAsync` : IDLE → APPROACH → ENGAGED → HOLD → RESET → IDLE dans l'ordre et les temps impartis | Test unitaire (Karma/Jasmine par défaut Angular) |
| **TEST-02** (aucune personne) | Aucun échantillon présent → l'état reste IDLE sur 10 s virtuelles | Test unitaire |
| **TEST-03** (caméra refusée) | `start()` du détecteur rejette → statut `DENIED`, aucune exception, moteur jamais attaché, état IDLE | Test unitaire |
| **TEST-04** (message modifié) | `ScenarioEngine.save()` → signal config mis à jour → le rendu du Frame utilise le nouveau message | Test unitaire (TestBed sur `FrameComponent`) |
| **Lignes T1–T13** de la table de transitions | Un cas de test par ligne, y compris les cas limites (départ pendant APPROACH, présence maintenue en FAR, re-déclenchement, forceState) | Tests unitaires |
| Anti-rebond (CA-03) | Absences/présences brèves < seuils → aucune transition | Test unitaire |
| Persistance | Round-trip IndexedDB (config + blob image) + amorçage des défauts si base vide | Test unitaire (IndexedDB dispo dans le navigateur de test) |
| Nettoyage (CA-11) | Après `detach()` : plus aucun timer actif, désabonnement effectif | Test unitaire |
| Offline (CA-08), démo physique (CA-12) | Check-list manuelle de démonstration (procédure écrite, Phase 9) | Manuel |

---

## 16. Performance

| Mesure | Où | Pourquoi |
|--------|-----|----------|
| `ChangeDetectionStrategy.OnPush` partout + Signals | Composants | Le renderer ne recalcule que ce qui dépend de `state` / `distance` / `config` |
| Boucle de détection **hors zone Angular** (`runOutsideAngular`) | `MediaPipeDetectorService` | 8 échantillons/s ne doivent pas déclencher de cycle de détection |
| Analyse throttlée ~8 Hz, caméra 640×480 | Détection | ENF-P3 : sobriété CPU/GPU sur tablette |
| Préchargement des deux images dès l'ouverture du Frame | `FrameComponent` | Évite le « flash blanc » au premier ENGAGED |
| Animations **uniquement** `opacity` / `transform` | SCSS | Compositing GPU, 60 fps (ENF-P2) |
| Cache d'object URLs + révocation | `StorageService` | Pas de fuite mémoire sur 10 cycles (ENF-R2) |
| Lazy loading des routes | `app.routes.ts` | Le Frame ne charge jamais le code du Studio |
| Élément vidéo hors écran 1 px (jamais `display:none`) | `CameraService` | Certains navigateurs suspendent le décodage si masqué |

---

## 17. Choix refusés (règle anti-sur-ingénierie)

| Choix possible | Décision | Raison | Réévaluer si… |
|----------------|----------|--------|---------------|
| **XState** (bibliothèque de machine à états) | ❌ Refusé en V0 | 5 états, 13 transitions : une FSM manuelle de ~150 lignes, lisible et 100 % testable, zéro dépendance. XState ajouterait de la Learning curve et du poids pour aucun gain V0. | Les scénarios V1 introduisent des états parallèles ou de l'historique |
| Bibliothèque de state management (NgRx…) | ❌ Refusé | Signals suffisent : un seul propriétaire d'état (moteur), lecture par composants | Plusieurs sources d'état indépendantes et synchronisées |
| **Angular Material / bibliothèque UI** pour le Studio | ❌ Refusé | 3 formulaires et 3 boutons : du SCSS fait maison suffit, ~300 Ko et une police d'icônes en moins dans la PWA offline. Le Studio doit rester sobre, pas « Material » | Le Studio devient une vraie interface d'administration multi-étapes |
| `idb` (wrapper IndexedDB) | ❌ Refusé | Deux stores, quatre opérations : ~80 lignes à nous, zéro dépendance | Besoin de requêtes, index multiples, migrations complexes |
| DSL de scénarios (TRIGGER/ACTION interprété) | ❌ Différé V1 | Un seul scénario en V0 — l'interpréter serait du sur-ingénierage pur. Le modèle `Scenario` est déjà conçu pour s'étendre | Plusieurs scénarios éditoriaux réellement livrés |
| Détection multi-personnes | ❌ Refusé | La démo ne le nécessite pas ; la plus grande boîte suffit | Produit V1 (statistiques de fréquentation, etc.) |
| Dossier `shared/components` | ❌ Différé | Aucun composant réellement partagé n'existe encore | Un composant apparaît dans 2 features |

---

## 18. Décisions tranchées — validées le 29/09/2026 ✅

| ID | Décision validée |
|----|------------------|
| D1 | **Grâce + mono-passe** : le cycle se termine de lui-même si la personne part ; re-armement après absence confirmée |
| D2 | **Détection de visage** — BlazeFace short-range (~224 Ko), présence sans identification |
| D3 | **ENGAGED = proximité NEAR+ maintenue pendant `engageDelayMs`** |
| D4 | Cahier des charges + architecture validés en l'état |

**→ Phase 2 : initialisation Angular — lancée.** Projet : `living-frame/` (Angular v22, TypeScript strict, SCSS, composants standalone, lazy routes).
sants standalone, lazy routes).
