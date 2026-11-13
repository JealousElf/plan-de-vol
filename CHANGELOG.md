# Journal des versions

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
