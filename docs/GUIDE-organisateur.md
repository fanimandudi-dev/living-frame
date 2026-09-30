# Living Frame — Guide de l'organisateur

*Préparer, lancer et surveiller votre cadre pour l'événement.*

---

## 1. Ce qu'est Living Frame

Un cadre qui contient une œuvre d'art. Quand un visiteur s'approche, l'œuvre
s'anime doucement — le regard du portrait se tourne vers lui, un sourire
apparaît — puis un message de bienvenue s'efface et l'œuvre redevient elle-même.
Le visiteur voit un tableau vivant, jamais un écran d'ordinateur.

**Confidentialité** : tout se passe à l'intérieur du cadre. La caméra sert
uniquement à savoir si quelqu'un est présent. Aucune image n'est enregistrée,
aucune donnée ne quitte l'appareil, aucune identification n'est effectuée.

## 2. Installer le cadre sur la tablette (une seule fois)

1. Ouvrez l'adresse du cadre fournie par votre prestataire dans **Chrome**
   (tablette Android). L'adresse doit être en `https://`.
2. Menu ⋮ → **« Installer l'application »** → valider.
3. Une icône *Living Frame* apparaît sur l'écran d'accueil.
4. Ouvrez l'application depuis cette icône (elle s'affiche plein écran, sans navigateur).
5. Menu ⋮ → **Autorisations** → Caméra → **Autoriser** (une fois, avant l'événement).
6. Paramètres Android → Écran → **Mise en veille : 30 minutes** (l'application
   maintient l'écran allumé d'elle-même pendant qu'elle est affichée).

Conseil : gardez la tablette sur chargeur pendant l'événement.

## 3. Préparer votre événement (le Studio)

Ouvrez l'application, puis rendez-vous sur l'adresse `/studio`
(ex. `https://votre-adresse/studio`).

### L'œuvre — la clé de l'effet magique

L'illusion repose sur **deux photos presque identiques** :

- **Image initiale** : la pose au repos (regard neutre, lointain) ;
- **Image interactive** : la même scène, même cadrage, même lumière — mais le
  regard tourné vers le spectateur et/ou un sourire.

Conseils de prise de vue :
- posez la tablette/appareil **sur un trépied** entre les deux prises ;
- même distance, même hauteur, même lumière ;
- seuls les yeux et la bouche changent ;
- format paysage de préférence.

L'œuvre de démonstration incluse permet de tester sans vos propres photos.

### Le défilé (optionnel)

Vous pouvez ajouter **plusieurs photos** en plus de l'image interactive :
pendant que le visiteur regarde, elles apparaissent comme une encre qui
diffuse, comme un album qui se raconte — et le déroulé change un peu à
chaque visite. Dans le Studio, section Œuvre,
utilisez « Ajouter une photo » (et le ✕ pour retirer). Prenez-les si
possible dans la même séance, avec le même cadrage et la même lumière.

### La scène et son intensité

Dans le Studio, choisissez la **scène visuelle** : *Golden Welcome*
(or chaleureux, classique) ou *Aurora* (argent, contemporain) — puis son
**intensité** (Subtil, Élégant ou Spectaculaire). Vous pouvez tout essayer
avec le bouton Prévisualiser.

### Les autres réglages

| Réglage | Effet |
|---|---|
| **Message** | Le texte qui apparaît en surimpression (ex. « Bienvenue dans notre histoire ») |
| **Délai avant réaction** | Temps de présence requis avant que l'œuvre se transforme (défaut 1,2 s) |
| **Durée du message** | Temps d'affichage du message (défaut 5 s) |
| **Délai de retour** | Douceur du retour à l'œuvre initiale (défaut 2 s) |
| **Détection de présence** | Active/désactive la caméra (désactivé = tableau statique) |

### Les trois boutons

- **Prévisualiser** : enregistre et joue le cycle complet tout seul (sans caméra) ;
- **Enregistrer** : enregistre la configuration (elle survivra à un redémarrage) ;
- **Lancer le cadre** : plein écran + anti-veille, prêt pour les visiteurs.

## 4. Le jour J

1. Ouvrez l'application (icône de l'écran d'accueil).
2. Le tableau s'affiche. **Touchez-le une fois** : il passe en plein écran et reste allumé.
3. C'est tout. Les visiteurs déclenchent l'animation en s'approchant.

### Le petit point en bas à droite

Un témoin discret (à peine visible) indique l'état de la détection :

| Couleur | Signification | Que faire |
|---|---|---|
| **Vert** | Détection active | Rien — tout va bien |
| **Ambre** | Initialisation | Patienter 2–3 s |
| **Rouge** | Caméra refusée / absente / erreur | Voir « En cas de pépin » |

### Commandes discrètes (clavier branché, pour vous seulement)

| Touche | Action |
|---|---|
| `D` | Mode démonstration automatique (sans caméra) |
| `C` | Réactiver la détection par caméra |
| `1`–`5` | Forcer les états (IDLE, APPROACH, ENGAGED, HOLD, RESET) |

## 5. En cas de pépin

| Symptôme | Cause probable | Solution |
|---|---|---|
| Point rouge + « caméra refusée » | Permission refusée | Menu ⋮ → Autorisations → Caméra → Autoriser, puis touche `C` |
| Point rouge + « aucune caméra » | Ouvert en HTTP (pas HTTPS) ou matériel sans caméra | Vérifier l'adresse `https://` |
| L'œuvre reste animée très longtemps | Comportement normal : elle reste animée **tant que quelqu'un est devant** | Rien — elle revient au repos quand la personne s'éloigne |
| Je m'éloigne puis reviens aussitôt : plus d'animation | Comportement normal : une salutation par approche (mono-passe) | S'éloigner quelques secondes de plus, puis revenir |
| Le tableau reste figé | Veille du navigateur | Toucher l'écran une fois ; vérifier le réglage de veille (30 min) |
| L'animation « clignote » quand on bouge | Seuils à ajuster pour votre emplacement | Demander un ajustement à votre prestataire (calibration) |
| Rien ne va plus | — | Fermer et rouvrir l'application — la configuration est conservée |

## 6. Après l'événement

- La configuration et les photos restent sur la tablette (rien à faire).
- Pour tout effacer : outils du navigateur → « Effacer les données du site »
  — ou demander la remise à zéro à votre prestataire.

---

*Living Frame V0 — prototype. Les réglages fins (seuils de détection,
calibration du lieu) sont effectués par votre prestataire.*
