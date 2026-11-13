# Mettre en place la synchronisation par code

La synchronisation par code a besoin d'un endroit en ligne où ranger les progressions. Ce guide en crée un, gratuit, en dix minutes : une base **Firebase Realtime Database**, un service de Google. Il n'y a rien à installer et aucune carte bancaire à fournir.

Ce réglage se fait une seule fois, par la personne qui héberge l'application. Les utilisateurs n'ont besoin de rien : ni compte Google, ni compte GitHub, seulement d'un code à taper.

## Ce qui part en ligne

- Un code de seize caractères est créé sur l'appareil. Il ne quitte jamais l'appareil.
- À partir de ce code, l'application calcule une adresse (où ranger la progression) et une clé (pour la chiffrer). L'adresse ne permet pas de retrouver la clé.
- La progression est chiffrée sur l'appareil, puis envoyée à cette adresse. La base ne contient donc que des textes illisibles, rangés à des adresses impossibles à deviner.
- La personne qui gère la base ne peut pas lire les progressions, et personne ne peut en dresser la liste.

## Créer la base

Le plus confortable est de le faire sur un ordinateur. Les noms des boutons sont donnés en français, avec le nom anglais entre parenthèses quand la console s'affiche en anglais.

1. Ouvre <https://console.firebase.google.com/> et connecte-toi avec un compte Google.
2. Clique sur **Créer un projet** (*Create a project*). Donne-lui un nom, par exemple `plan-de-vol`, puis continue.
3. La console propose des options (assistance par IA, Google Analytics). Aucune n'est utile ici : désactive Google Analytics, puis clique sur **Créer un projet** (*Create project*). Attends la fin de la création et clique sur **Continuer**.
4. Dans le menu de gauche, ouvre **Realtime Database**. Selon la version de la console, l'entrée se trouve sous **Créer** (*Build*) ou sous **Bases de données et stockage** (*Databases & Storage*). Attention à ne pas choisir « Firestore Database », qui est un autre produit.
5. Clique sur **Créer une base de données** (*Create Database*). Choisis l'emplacement **Belgique (europe-west1)**, puis **Suivant**.
6. Choisis **Démarrer en mode verrouillé** (*Start in locked mode*), puis **Activer** (*Enable*).
7. Ouvre l'onglet **Règles** (*Rules*). Efface tout le texte affiché, colle à la place le bloc de la section suivante, puis clique sur **Publier** (*Publish*).
8. Reviens à l'onglet **Données** (*Data*). En haut de la page se trouve l'adresse de la base : elle commence par `https://` et se termine par `firebasedatabase.app` (ou `firebaseio.com`). Copie-la.

## Les règles à coller

```json
{
  "rules": {
    "carnets": {
      "$id": {
        ".read": "$id.length === 43",
        ".write": "$id.length === 43 && newData.exists()",
        ".validate": "newData.hasChildren(['v', 't', 'd'])",
        "v": { ".validate": "newData.isNumber() && newData.val() === 1" },
        "t": { ".validate": "newData.isNumber() && newData.val() > 0" },
        "d": { ".validate": "newData.isString() && newData.val().length < 600000" },
        "$autre": { ".validate": false }
      }
    }
  }
}
```

Ce que disent ces règles : chacun peut lire et écrire un carnet dont il connaît l'adresse exacte (43 caractères), et rien d'autre. Il est impossible de lister les carnets, d'en supprimer un, ou d'écrire autre chose qu'un carnet au bon format et de taille raisonnable.

## Brancher l'application

Dans le fichier `config.js`, à la racine du dépôt, colle l'adresse de la base :

```js
DATA.carnets = 'https://plan-de-vol-xxxxx-default-rtdb.europe-west1.firebasedatabase.app';
```

Lance ensuite `npm run sw` puis `npm test`, et publie. Dans Réglages, l'application propose alors « Créer un code de synchronisation ». Cette adresse n'est pas un secret : elle peut figurer dans un dépôt public.

Si tu héberges ta propre copie de l'application, crée ta propre base, ou vide ce réglage : l'application propose alors seulement la méthode par jeton GitHub.

## Limites à connaître

- L'offre gratuite de Firebase (« Spark ») ne demande aucun moyen de paiement. Elle accepte 1 Go de données, 10 Go de téléchargement par mois et 100 connexions simultanées ; un carnet pèse quelques dizaines de kilo-octets. Si une limite est atteinte, la synchronisation s'arrête jusqu'au mois suivant, mais chaque progression reste intacte sur son appareil. Voir <https://firebase.google.com/pricing>.
- Le code est la seule clé. Quelqu'un qui le connaît peut lire et modifier la progression correspondante ; quelqu'un qui le perd ne peut plus retrouver la copie en ligne (la progression reste sur l'appareil).
- Les règles laissent n'importe qui écrire un carnet au bon format : une personne malveillante pourrait remplir l'espace gratuit. Dans ce cas, supprime le dossier `carnets` depuis l'onglet Données : chaque appareil renvoie sa progression à la synchronisation suivante.
- Google peut envoyer un courriel signalant des règles « ouvertes ». C'est attendu ici : l'accès est limité au dossier `carnets` et son contenu est chiffré.

## En cas de problème

- **« Synchronisation interrompue »** dès la création d'un code : les règles n'ont pas été publiées, ou l'adresse dans `config.js` n'est pas la bonne. Vérifie l'onglet Règles, puis l'adresse (sans rien après `.app`).
- **« Aucune progression ne correspond à ce code »** : le premier appareil n'a pas encore envoyé sa progression. Attends qu'il affiche « Synchronisé », puis réessaie.
- **L'option n'apparaît pas dans Réglages** : `config.js` est vide, ou l'application n'a pas encore été mise à jour sur l'appareil (ferme-la et rouvre-la).
