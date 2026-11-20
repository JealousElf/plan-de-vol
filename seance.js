/* Plan de vol : le calcul des séances. Quelles fiches lire aujourd'hui, quelles révisions passer, dans quel ordre,
   et comment une réponse fait monter ou redescendre une fiche (répétition espacée).
   Ce fichier ne touche pas à la page : il reçoit les fiches et la progression, et rend des listes. Il se teste donc sans navigateur. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  var IV = [0, 1, 2, 4, 8, 16, 32];   // jours avant de revoir une fiche, selon son étape (1 à 6)
  var QUIZ = 20;                       // questions au plus dans le quiz du jour
  var AVANT_ORAL = 21;                 // tout doit avoir été vu trois semaines avant l'oral
  var MINI = 3;                        // jamais moins de trois nouvelles fiches par jour

  function neuve(cartes, f) { var c = cartes[f.id]; return !c || !c.b; }
  function tous(packs) { var r = []; packs.forEach(function (p) { r = r.concat(p.faits); }); return r; }

  /** Mélange sur place. hasard : une fonction comme Math.random (les tests en passent une prévisible). */
  function melange(a, hasard) {
    var h = hasard || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(h() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /** Les n prochaines fiches jamais vues, prises tour à tour dans chaque pack. */
  function nouveaux(packs, cartes, n) {
    var files = packs.map(function (p) { return p.faits.filter(function (f) { return neuve(cartes, f); }); });
    var out = [], i = 0, vides = 0;
    while (out.length < n && files.length && vides < files.length) {
      var q = files[i % files.length];
      if (q.length) { out.push(q.shift()); vides = 0; } else vides++;
      i++;
    }
    return out;
  }

  /** Les fiches à revoir aujourd'hui (jour : nombre de jours depuis 1970) : la plus en retard d'abord, puis la plus fragile. */
  function dusDuJour(faits, cartes, jour) {
    var dus = faits.filter(function (f) { var c = cartes[f.id]; return c && c.b >= 1 && c.due <= jour; });
    dus.sort(function (a, b) { var x = cartes[a.id], y = cartes[b.id]; return (x.due - y.due) || (x.b - y.b); });
    return dus;
  }

  /** Nouvelles fiches à lire au moins par jour pour avoir tout vu trois semaines avant l'oral.
      reste : fiches jamais vues ; restants : jours avant l'oral (null sans date). */
  function neufsMini(reste, restants) {
    if (!(restants > 0)) return MINI;   // pas de date, date passée ou illisible
    return Math.max(MINI, Math.ceil(reste / Math.max(1, restants - AVANT_ORAL)));
  }

  /** La séance du jour : d'abord les nouvelles fiches à lire, puis un quiz de QUIZ questions au plus qui réunit leurs questions
      et les révisions les plus urgentes. Quand les révisions s'accumulent, on lit moins de nouvelles fiches, sans descendre sous neufsMini.
      o : { packs, cartes, jours, rythme (nouveautés par jour), jour (aujourd'hui), restants (jours avant l'oral, ou null) }. */
  function planJour(o) {
    var faits = tous(o.packs), dus = dusDuJour(faits, o.cartes, o.jour), j = o.jours[o.jour] || {};
    var quota = Math.max(0, (+o.rythme || 10) - (j.neu || 0));
    var reste = faits.filter(function (f) { return neuve(o.cartes, f); }).length;
    var n = Math.min(quota, QUIZ, Math.max(neufsMini(reste, o.restants), QUIZ - dus.length));
    var neufs = nouveaux(o.packs, o.cartes, n), place = Math.max(0, QUIZ - neufs.length);
    return { dus: dus.slice(0, place), attente: Math.max(0, dus.length - place), total: dus.length, neufs: neufs,
      prevu: Math.min(quota, reste), fait: !!j.fait };
  }

  /** Les étapes d'une séance : la lecture des nouvelles fiches, une pause, puis le quiz mélangé.
      question(f) choisit la forme de la question pour une fiche (app.js : choix multiple, à écrire, à voix haute…). */
  function composer(dus, neufs, question, hasard) {
    var lecture = neufs.map(function (f) { return { id: f.id, fmt: 'decouverte' }; });
    var quiz = melange(neufs.concat(dus).map(function (f) { return question(f); }), hasard);
    return lecture.length && quiz.length ? lecture.concat([{ fmt: 'pause' }], quiz) : lecture.concat(quiz);
  }
  function indexPause(items) { for (var j = 0; j < items.length; j++) if (items[j] && items[j].fmt === 'pause') return j; return -1; }

  /** La fiche après une réponse. res : 'ok', 'mid' (à moitié) ou 'ko'. mode : 'normal', 'retry' (seconde chance dans la même séance),
      'diag' (test de positionnement) ou 'libre' (blitz : seule une erreur fait redescendre). Rend une copie ; t : l'heure de la réponse. */
  function noter(carte, res, mode, jour, t) {
    var c = carte ? JSON.parse(JSON.stringify(carte)) : { b: 0, due: 0, n: 0, ok: 0, t: 0 };
    c.n++; if (res === 'ok') c.ok++;
    if (mode === 'libre') { if (res === 'ko' && c.b) { c.b = 1; c.due = jour; } }
    else if (mode === 'diag') { if (res === 'ok') { c.b = 3; c.due = jour + IV[3]; } else { c.b = 1; c.due = jour; } }
    else if (mode === 'retry') { if (res === 'ok') { c.b = Math.max(1, c.b); c.due = jour + 1; } else { c.b = 1; c.due = jour; } }
    else if (res === 'ok') { c.b = Math.min(6, c.b + 1); c.due = jour + IV[c.b]; }
    else if (res === 'mid') { c.b = Math.max(1, c.b); c.due = jour + 1; }
    else { c.b = 1; c.due = jour; }
    c.t = t;
    return c;
  }

  DATA.seance = { IV: IV, QUIZ: QUIZ, melange: melange, nouveaux: nouveaux, dusDuJour: dusDuJour, neufsMini: neufsMini,
    planJour: planJour, composer: composer, indexPause: indexPause, noter: noter };
})(typeof window !== 'undefined' ? window : globalThis);
