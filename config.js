/* Plan de vol : les deux réglages propres à ce site. À adapter si tu héberges ta propre copie. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });

  /* Synchronisation par code : adresse de la base qui garde les progressions chiffrées
     (une base Firebase Realtime Database, par exemple https://mon-projet-default-rtdb.europe-west1.firebasedatabase.app).
     Vide : la synchronisation par code n'est pas proposée. Mise en place en dix minutes : docs/synchronisation.md */
  DATA.carnets = 'https://plan-de-vol-6ae7f-default-rtdb.europe-west1.firebasedatabase.app';

  /* Dépôt GitHub qui reçoit les signalements d'erreur sur les fiches. */
  DATA.depot = 'JealousElf/plan-de-vol';
})(typeof window !== 'undefined' ? window : globalThis);
