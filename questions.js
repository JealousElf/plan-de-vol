/* Plan de vol : la fabrication des questions. Pour une fiche : les formes de question possibles, celle qu'on pose,
   puis la question elle-même avec ses propositions.
   - Choix multiple : « sur » (la question de la fiche et ses mauvaises réponses), « quand » (l'année), « quoi » (l'événement
     d'après sa description), « encours » (le conflit toujours en cours).
   - À écrire ou à ordonner : « trou » (citation à trous), « nom », « annee », « ordre ». formats.js dit quelles fiches s'y prêtent
     et corrige les réponses.
   - « ouverte » : réponse à voix haute, puis on se note ; « decouverte » : la fiche à lire, sans question.
   Ce fichier ne touche pas à la page : il se teste sans navigateur. Il s'appuie sur formats.js et seance.js (mélange). */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  /** Fiche à question : la question q, la bonne réponse a et au moins trois mauvaises réponses x. */
  function aQcm(f) { return typeof f.q === 'string' && typeof f.a === 'string' && Array.isArray(f.x) && f.x.length >= 3; }
  /** Fiche datée : l'année y et la description d de l'événement. */
  function aDate(f) { return typeof f.y === 'number' && typeof f.d === 'string' && f.d !== ''; }
  /** La réponse de la fiche est une année : elle peut se demander à écrire. */
  function anneeEnReponse(f) { return aQcm(f) && /^\d{3,4}$/.test(f.a); }
  function annee(y) { y = Math.floor(y); return y < 0 ? (-y) + ' av. J.-C.' : String(y); }
  function dateFr(iso) {
    var p = String(iso || '').split('-'); if (p.length < 3) return '';
    var j = parseInt(p[2], 10);
    return (j === 1 ? '1er' : j) + ' ' + MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  /** La bonne réponse d'une question à écrire, telle qu'on l'affiche après la correction. */
  function attenduTexte(q) { return q.saisie.genre === 'annee' ? annee(q.saisie.attendu) : String(q.saisie.attendu); }
  /** Corrige une réponse écrite : 'ok', 'mid' (presque) ou 'ko'. f : la fiche de la question. */
  function corriger(q, txt, f) {
    var FMT = DATA.formats;
    if (q.saisie.genre === 'annee') return FMT.corrigerAnnee(q.saisie.attendu, txt);
    if (q.saisie.genre === 'mot') return FMT.corrigerMot(q.saisie.choix, txt);
    return FMT.corrigerNom(f, txt);
  }

  /** Les questions pour des fiches rangées en packs. o : { pack(id) : le pack d'une fiche (f.pack), avec p.ny = nombre d'années
      différentes ; part() : part des formats à écrire, une sur deux par défaut ; hasard() : comme Math.random, pour les tests }. */
  function creer(o) {
    var FMT = DATA.formats, SEA = DATA.seance, pack = o.pack;
    var hasard = o.hasard || Math.random, part = o.part || function () { return 0.5; };
    function melange(a) { return SEA.melange(a, hasard); }
    function auHasard(l) { return l[Math.floor(hasard() * l.length)]; }

    /* ---------- les formes possibles ---------- */
    function peutEnCours(f) { var p = pack(f.pack); return f.st === 'cours' && p.faits.filter(function (x) { return x.st === 'fin'; }).length >= 3; }
    /** Les autres repères datés du pack, d'une autre année si possible : les mauvaises réponses de « quoi ». */
    function voisins(f) {
      var p = pack(f.pack), y = Math.floor(f.y);
      var pool = p.faits.filter(function (x) { return x.id !== f.id && aDate(x) && Math.floor(x.y) !== y; });
      if (pool.length < 3) pool = p.faits.filter(function (x) { return x.id !== f.id && aDate(x) && x.d !== f.d; });
      return pool;
    }
    /** Les choix multiples possibles pour une fiche. */
    function formats(f) {
      if (aQcm(f)) return ['sur'];
      if (!aDate(f)) return [];
      var r = [];
      if (voisins(f).length >= 3) r.push('quoi');
      if (pack(f.pack).ny >= 4) r.push('quand');
      return r;
    }
    /** Les formats à écrire ou à ordonner possibles pour une fiche. */
    function libres(f) {
      var r = [], p = pack(f.pack), dates = aDate(f) && p && p.ny >= 4;
      if (f.trou && FMT.lireTrou(f.trou)) r.push('trou');
      if (FMT.estNom(f)) r.push('nom');
      if (anneeEnReponse(f) || dates) r.push('annee');
      if (dates && FMT.voisinsOrdre(f, p.faits, hasard)) r.push('ordre');
      return r;
    }
    /** Un choix multiple au hasard, ou « ouverte » si la fiche ne s'y prête pas. */
    function qcm(f) { var l = f ? formats(f) : []; return l.length ? auHasard(l) : 'ouverte'; }
    /** Une fois sur deux en moyenne, un format à écrire ou à ordonner quand la fiche s'y prête ; sinon un choix multiple. */
    function choisirFormat(f) {
      var l = libres(f);
      if (l.length && hasard() < part()) return auHasard(l);
      return qcm(f);
    }
    /** L'entrée de séance d'une fiche, selon son étape (carte : sa progression, ou rien) : à voix haute une fois acquise. */
    function item(f, carte) {
      var b = carte ? carte.b : 0, fmt;
      if (b >= 4) fmt = 'ouverte';
      else if (b >= 1 && hasard() < 0.3 && peutEnCours(f)) fmt = 'encours';
      else fmt = choisirFormat(f);
      return { id: f.id, fmt: fmt, dur: b >= 2 };
    }

    /* ---------- choix multiples ---------- */
    /** L'année, parmi quatre. dur : des années plus proches de la bonne. */
    function qQuand(f, dur) {
      var y = Math.floor(f.y), max = new Date().getFullYear();
      var k = y < 1000 ? 12 : y < 1700 ? 5 : y < 1900 ? 2 : 1;
      var pas = dur ? [1, 2, 3, 4, 5] : [3, 4, 6, 8, 10, 12, 15];
      var set = {}, n = 1, garde = 0; set[y] = 1;
      while (n < 4 && garde++ < 400) {
        var c = y + auHasard(pas) * k * (hasard() < 0.5 ? -1 : 1);
        if (c > max || c === 0 || set[c]) continue;
        set[c] = 1; n++;
      }
      var ys = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
      var debut = f.y2 !== undefined && f.y2 !== f.y;
      return { id: f.id, fmt: 'quand', petit: debut ? 'En quelle année cela commence-t-il ?' : 'En quelle année ?', grand: f.t, deux: true,
        opts: ys.map(function (v) { return { t: annee(v), ok: v === y }; }) };
    }
    function qSur(f) {
      var o = melange(f.x.slice()).slice(0, 3).map(function (t) { return { t: t, ok: false }; });
      o.push({ t: f.a, ok: true });
      if (o.every(function (x) { return /^\d{1,4}$/.test(x.t); })) o.sort(function (a, b) { return +a.t - +b.t; });
      else melange(o);
      return { id: f.id, fmt: 'sur', petit: f.g || 'Question', grand: f.q, deux: o.every(function (x) { return x.t.length <= 12; }), opts: o };
    }
    /** L'événement, d'après sa description. dur : des événements proches dans le temps. */
    function qQuoi(f, dur) {
      var p = pack(f.pack), pool = voisins(f);
      pool.sort(function (a, b) { return Math.abs(a.y - f.y) - Math.abs(b.y - f.y); });
      var cand = dur ? pool.slice(0, 6) : pool.slice(4);
      if (cand.length < 3) cand = pool;
      var choix = melange(cand.slice()).slice(0, 3);
      return { id: f.id, fmt: 'quoi', petit: p.quoi || (p.statuts ? 'Quel conflit ?' : 'Quel événement ?'), grand: f.d.charAt(0).toUpperCase() + f.d.slice(1),
        opts: melange([f].concat(choix)).map(function (x) { return { t: x.t, ok: x.id === f.id }; }) };
    }
    function qEnCours(f) {
      var p = pack(f.pack);
      var choix = melange(p.faits.filter(function (x) { return x.st === 'fin'; })).slice(0, 3);
      return { id: f.id, fmt: 'encours', petit: 'Situation au ' + dateFr(p.maj), grand: p.encours || 'Lequel de ces conflits est toujours en cours ?',
        opts: melange([f].concat(choix)).map(function (x) { return { t: x.t, ok: x.id === f.id }; }) };
    }

    /* ---------- à écrire ou à ordonner ---------- */
    function qTrou(f) {
      var t = FMT.lireTrou(f.trou);
      return { id: f.id, fmt: 'trou', petit: 'Complète la citation', grand: t.avant + '…' + t.apres, trou: t, auteur: f.a,
        saisie: { genre: 'mot', choix: t.choix, attendu: t.mot }, indice: 'Le mot manquant' };
    }
    function qNom(f) { return { id: f.id, fmt: 'nom', petit: f.g || 'Question', grand: f.q, saisie: { genre: 'nom', attendu: f.a }, indice: 'Écris le nom' }; }
    function qAnnee(f) {
      if (anneeEnReponse(f)) return { id: f.id, fmt: 'annee', petit: f.g || 'Question', grand: f.q, saisie: { genre: 'annee', attendu: +f.a }, indice: 'Année' };
      var debut = f.y2 !== undefined && f.y2 !== f.y;
      return { id: f.id, fmt: 'annee', petit: debut ? 'En quelle année cela commence-t-il ?' : 'En quelle année ?', grand: f.t,
        saisie: { genre: 'annee', attendu: Math.floor(f.y) }, indice: f.y < 0 ? 'Année (52 av. J.-C. par exemple)' : 'Année' };
    }
    function qOrdre(f) {
      var v = FMT.voisinsOrdre(f, pack(f.pack).faits, hasard) || [];
      return { id: f.id, fmt: 'ordre', petit: 'Du plus ancien au plus récent', grand: 'Remets ces événements dans l\'ordre',
        ordre: melange([f.id].concat(v.map(function (x) { return x.id; }))), choix: [] };
    }
    var A_ECRIRE = { trou: qTrou, nom: qNom, annee: qAnnee, ordre: qOrdre };

    /** La question à poser pour une entrée de séance it = { fmt, dur }. Si la fiche ne se prête pas au format demandé,
        un autre choix multiple, ou à défaut une réponse à voix haute. */
    function question(f, it) {
      if (it.fmt === 'decouverte') return { id: f.id, fmt: 'decouverte' };
      if (A_ECRIRE[it.fmt] && libres(f).indexOf(it.fmt) >= 0) return A_ECRIRE[it.fmt](f);
      var l = formats(f);
      if (it.fmt === 'ouverte' || !l.length) {
        return aQcm(f) ? { id: f.id, fmt: 'ouverte', petit: 'Réponds à voix haute, puis vérifie.', grand: f.q }
          : { id: f.id, fmt: 'ouverte', petit: 'Date, faits, portée : réponds à voix haute, puis vérifie.', grand: f.t };
      }
      if (it.fmt === 'encours' && peutEnCours(f)) return qEnCours(f);
      var fmt = l.indexOf(it.fmt) >= 0 ? it.fmt : auHasard(l);
      if (fmt === 'sur') return qSur(f);
      if (fmt === 'quand') return qQuand(f, it.dur);
      return qQuoi(f, it.dur);
    }

    return { formats: formats, libres: libres, qcm: qcm, choisirFormat: choisirFormat, peutEnCours: peutEnCours, item: item, question: question,
      anneeEnReponse: anneeEnReponse, attenduTexte: attenduTexte, corriger: corriger };
  }

  DATA.questions = { aQcm: aQcm, aDate: aDate, anneeEnReponse: anneeEnReponse, annee: annee, attenduTexte: attenduTexte, corriger: corriger, creer: creer };
})(typeof window !== 'undefined' ? window : globalThis);
