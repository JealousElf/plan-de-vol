# Journal des versions

## 1.9.1, 20 novembre 2026

Suite du rangement, sans changement visible.

- La fabrication des questions sort de `app.js` : `questions.js` dit quelles formes de question une fiche permet, choisit celle qu'on pose et prépare les propositions. Elle est désormais testée sans navigateur (années proposées, mauvaises réponses du même pack, conflit en cours, formats à écrire, correction).
- `app.js` perd une fonction devenue inutile, et le point d'accès réservé aux tests ne garde que ce que les tests utilisent.
- Un test du chiffrement échouait par hasard environ une fois sur deux cents (le texte chiffré contenait parfois « 1789 ») : il vérifie maintenant des caractères qui ne peuvent pas apparaître dans un texte chiffré.

## 1.9.0, 20 novembre 2026

Rangement du code, sans changement visible dans les séances.

- Chaque fiche porte désormais son paragraphe « En savoir plus » : le fichier à part `data/contexte.js` disparaît, la page a un fichier de moins à charger.
- La synchronisation par jeton GitHub est supprimée : le code de synchronisation reste la seule méthode, et l'écran Réglages s'en trouve simplifié. Sur un appareil encore réglé avec un jeton, celui-ci est effacé et la progression reste sur l'appareil ; un code la relie de nouveau. Le fichier privé créé sur GitHub par l'ancienne méthode peut être supprimé.
- Trois blocs sortent de `app.js` : le calcul des séances (`seance.js`, désormais testé sans navigateur), la synchronisation (`synchronisation.js`) et les actualités de l'accueil (`actualites.js`).
- Tests : calcul des séances et étapes de la répétition espacée, cartes d'actualités, reprise de la synchronisation après une coupure de réseau.

## 1.8.0, 18 novembre 2026

- Flèche retour dans les séances. Pendant la lecture, elle ramène à la fiche précédente, à côté de « Suivant », et aussi depuis l'écran « Place au quiz ». Pendant le quiz, elle réaffiche les questions déjà corrigées avec leur fiche, sans pouvoir changer la réponse ; « Retour à la question » reprend là où tu en étais.
- Les questions ne sont plus seulement à choix multiple. Une fois sur deux en moyenne, quand la fiche s'y prête, l'appli propose une citation à trous (retrouver le mot manquant), un nom à écrire (l'auteur d'une citation, un aviateur, un chef, un lieu, un programme), une année à écrire ou quatre événements à remettre dans l'ordre.
- Les réponses écrites sont corrigées avec indulgence : accents, majuscules, grade et petites fautes de frappe ne comptent pas, le nom de famille suffit, et une année à un an près vaut « Presque ». Si la correction se trompe, « J'avais bon » rétablit la note.
- Le blitz chronométré et le diagnostic restent en choix multiple.
- Tests : les parcours ne dépendent plus du pack d'actualité de la semaine.

## 1.7.0, 14 novembre 2026

- La séance du jour se fait en deux temps. D'abord la lecture : les nouvelles fiches défilent une par écran, sans question. Ensuite le quiz, proposé tout de suite ou plus tard dans la journée : il mélange les questions sur les fiches lues et les révisions.
- Le quiz du jour compte 20 questions au plus, les révisions les plus urgentes d'abord. Quand elles s'accumulent, l'appli donne moins de nouvelles fiches, sans descendre sous le rythme nécessaire pour avoir tout vu trois semaines avant l'oral. Après le quiz, « Réviser encore » propose les révisions restantes.
- Une erreur n'est plus reposée qu'une fois dans la même séance.

## 1.6.0, 14 novembre 2026

- « En savoir plus » : les 33 dernières fiches de l'ordre mondial ont leur paragraphe. Les 376 fiches des 8 packs ont désormais toutes un paragraphe de contexte.

## 1.5.3, 14 novembre 2026

- « En savoir plus » : 46 paragraphes de plus. Tous les packs ont désormais un paragraphe pour chaque fiche, sauf les dates clés de l'ordre mondial (36 sur 69) ; 343 fiches sur 376 sont couvertes.

## 1.5.2, 14 novembre 2026

- « En savoir plus » : 72 paragraphes de plus (fiches 25 à 36 de chaque pack). Les packs Armée de l'Air et de l'Espace, Opérations et Programmes sont entièrement couverts ; 297 fiches sur 376 ont leur paragraphe.
- Actualités : les sujets utiles pour l'oral (géopolitique, défense, institutions) passent devant les faits divers.

## 1.5.1, 14 novembre 2026

- « En savoir plus » : 84 paragraphes de plus, pour les fiches 13 à 24 de chaque pack (225 fiches en ont un désormais).
- Actualités : une histoire n'est plus confondue avec une autre qui partage seulement un ou deux mots du titre.

## 1.5.0, 14 novembre 2026

- Actualités : au lieu de 48 titres, les cinq histoires les plus importantes des trois derniers jours, chacune avec une petite image du média. Le robot retient celles que plusieurs médias racontent ou que Le Monde et franceinfo mettent à la une, deux au plus par thème, dont au moins une de défense ; la carte indique combien de médias en parlent.

## 1.4.0, 14 novembre 2026

- Après une bonne réponse, l'application attend désormais que tu touches « Continuer ». L'enchaînement automatique reste possible dans Réglages, après 3, 5 ou 8 secondes, et ouvrir une fiche le suspend.
- La séance du jour est gardée jusqu'au soir : si tu la quittes, l'accueil propose de la reprendre à la question où tu t'étais arrêté, même après avoir fermé l'application.
- Nouveau bloc « Actualités » sur l'accueil : les gros titres défense, international, aéronautique et spatial, politique française, à faire défiler et à filtrer par thème. Chaque titre ouvre l'article sur le site du média. Les titres sont mis à jour plusieurs fois par jour par un robot du dépôt (`outils/actualites.mjs`).
- Bouton « En savoir plus » sur les fiches : un paragraphe de contexte pour mieux comprendre le sujet, et un lien vers Wikipédia. Les douze premières fiches de chaque pack ont leur paragraphe ; les autres suivront dans l'ordre où l'application les présente.
- Nouveau pack « Citations célèbres » (thème Culture générale) : 57 citations, en priorité de chefs militaires français, mais aussi d'aviateurs, de grandes figures françaises et de stratèges étrangers. Pour chacune : l'auteur à retrouver, le contexte et l'usage à l'oral.

## 1.3.0, 13 novembre 2026

- La synchronisation par code est en service sur le site : Réglages, « Créer un code de synchronisation ».
- Bouton « Réglages » explicite dans l'en-tête ; l'état de synchronisation reste affiché sous le nom de l'application.
- Réglages affiche la version installée et propose « Rechercher une mise à jour » ; après une mise à jour, l'accueil annonce la nouvelle version.
- Si la synchronisation par code s'interrompt, Réglages en donne la raison en clair.

## 1.2.0, 13 novembre 2026

- Synchronisation par code : un code de seize caractères, créé sur un appareil et tapé une fois sur l'autre, remplace le jeton GitHub. Ni compte ni mot de passe.
- La progression est chiffrée sur l'appareil (AES-GCM, clé dérivée du code) avant d'être envoyée : le service en ligne ne garde qu'un texte illisible.
- Le jeton GitHub reste disponible comme autre méthode.
- Les réponses partent en ligne dès la fin d'une séance et quand l'application passe à l'arrière-plan, sans attendre.
- Guide de mise en place du service de synchronisation : `docs/synchronisation.md`.

## 1.1.0, 13 novembre 2026

- Carnet de vol refait : prévision jusqu'au jour de l'oral (courbe des repères vus, réelle puis prolongée), rythme conseillé en un geste en cas de retard, calendrier de régularité sur quinze semaines, révisions à venir, maîtrise par thème, repères qui résistent avec séance de rattrapage, notes et critères des oraux blancs.
- Chaque graphique se lit au survol, au toucher et au clavier, et ses chiffres sont aussi donnés en tableau.
- Première ouverture guidée : date de l'oral et rythme se règlent depuis l'accueil.
- Écran large : accueil et carnet sur deux colonnes, onglets dans l'en-tête.
- Apparence claire, sombre ou automatique, au choix sur chaque appareil.
- Temps de travail compté par jour ; l'historique des journées est gardé plus d'un an.
- Calculs du carnet et graphiques rangés dans deux modules (`suivi.js`, `graph.js`), avec leurs tests.

## 1.0.0, 13 novembre 2026

Première version publique.

- 319 fiches en 7 packs, 20 sujets de grand oral avec corrigé, pack d'actualité hebdomadaire.
- Séances par répétition espacée, blitz, frise chronologique, grand oral blanc à deux sujets au choix.
- Séances repensées pour le téléphone : réponses en bas de l'écran, fiche en feuille basse, enchaînement automatique après une bonne réponse (réglable).
- Application installable, utilisable hors connexion, synchronisation facultative par un gist privé.
- Signalement d'une erreur en un geste, vers les issues du dépôt.
- Tests des fiches et des parcours, outils de développement, documentation.
