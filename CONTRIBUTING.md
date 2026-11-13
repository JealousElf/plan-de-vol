# Contribuer à Plan de vol

Merci de ton aide. Le plus utile, dans l'ordre : signaler une erreur, proposer une fiche, améliorer le code.

## Signaler une erreur dans une fiche

Dans l'application, le lien « Signaler une erreur » sous la fiche ouvre un signalement prérempli. Indique ce qui est faux, la correction proposée et une source publique que tout le monde peut consulter.

## Proposer ou modifier une fiche

Les fiches sont dans `data/`, un fichier par pack. Il en existe deux sortes.

Une fiche datée : l'application fabrique elle-même les questions (quel événement, quelle année).

```js
{ id: "op-serval", g: "Afrique", y: 2013, y2: 2014, d: "11 janvier 2013 - juillet 2014",
  t: "Opération Serval (Mali)",
  r: "Deux ou trois phrases : ce qui s'est passé, les noms et les chiffres clés.",
  o: "Une phrase à placer à l'oral : l'enjeu, la portée." }
```

Une fiche à question écrite : tu fournis la question, la bonne réponse et au moins trois mauvaises réponses plausibles.

```js
{ id: "og-art15", g: "Constitution et décision", t: "Le chef des armées",
  q: "Quel article de la Constitution fait du président de la République le chef des armées ?",
  a: "L'article 15", x: ["L'article 5", "L'article 20", "L'article 35"],
  r: "L'explication affichée après la réponse.",
  o: "Facultatif : la phrase à placer à l'oral." }
```

| Champ | Rôle |
| --- | --- |
| `id` | Identifiant unique, préfixé par le pack (`fr-`, `cf-`, `om-`, `ae-`, `op-`, `pg-`, `og-`). Ne change jamais un identifiant existant : il porte la progression des utilisateurs. |
| `g` | Groupe affiché dans la liste des fiches. Les fiches d'un même groupe se suivent. |
| `t` | Titre court, en forme d'événement pour une fiche datée. |
| `y`, `y2`, `d` | Année de début (nombre), année de fin (`null` si c'est en cours), date en toutes lettres. |
| `q`, `a`, `x` | Question, bonne réponse, mauvaises réponses de même forme que la bonne. |
| `r`, `o` | Résumé, puis phrase « à placer à l'oral ». |
| `st`, `sl` | Statut d'un conflit ou d'une opération : `cours`, `fragile` ou `fin`, et son libellé. |
| `maj` | `1` si la fiche décrit une situation qui évolue : la date de vérification du pack s'affiche alors. |

Règles de rédaction :

- uniquement des informations publiques, tirées de sources que chacun peut consulter. Rien de classifié, rien d'issu de documents internes ;
- des faits datés et vérifiables, sur un ton neutre. Pas de prise de position partisane ;
- des phrases courtes, écrites avec tes propres mots : ne recopie pas une source ;
- pour un fait récent, cite la source dans ta demande et mets à jour le champ `maj` du pack.

Avant d'envoyer :

```bash
node --test tests/donnees.test.mjs   # vérifie le format des fiches
npm run sw                           # met à jour la liste des fichiers hors connexion
npm test                             # tout vérifier, si tu as installé Playwright
```

## Modifier le code

- L'application est écrite en JavaScript simple, sans framework ni compilation : `index.html`, `styles.css`, `app.js`, et deux modules à part, `suivi.js` (calculs du carnet) et `graph.js` (graphiques). Une nouvelle fonction se range de préférence dans un module testable sans navigateur, comme `suivi.js`.
- Ajoute ou adapte un test dans `tests/` pour tout changement de comportement.
- Garde l'interface en français, les textes courts, et respecte les réglages d'accessibilité (contrastes, navigation au clavier, animations désactivables).
- Lance `npm run sw` puis `npm test` avant d'ouvrir ta demande de fusion.

## Comment les propositions sont traitées

Les mainteneurs relisent chaque signalement et chaque demande de fusion, vérifient les sources, puis intègrent, demandent une précision ou expliquent un refus. Une fiche intégrée est publiée pour tous les utilisateurs à la mise à jour suivante.

## Conduite

Reste courtois et factuel. Les attaques personnelles, les propos discriminatoires et le militantisme n'ont pas leur place ici.
