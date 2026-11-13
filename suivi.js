/* Plan de vol : calculs du carnet de vol (prévision, régularité, points faibles, oraux).
   Ce fichier ne touche pas à la page : il reçoit la progression et rend des chiffres. Il se teste donc sans navigateur. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  var JOUR = 86400000;
  var PALIER = 4;        // étape à partir de laquelle un repère compte comme acquis
  var DELAI_ACQUIS = 7;  // jours entre la découverte d'un repère et son acquisition si tout est juste (1 + 2 + 4)
  var RYTHMES = [5, 8, 10, 15, 20];

  /** Jour (nombre de jours depuis 1970, heure locale) vers date civile. s : jour de la semaine, 0 = lundi. */
  function dateDe(jour) {
    var d = new Date(jour * JOUR);
    return { j: d.getUTCDate(), m: d.getUTCMonth(), a: d.getUTCFullYear(), s: (d.getUTCDay() + 6) % 7 };
  }
  function actif(jours, d) { return !!(jours[d] && jours[d].n); }
  function premierJour(jours) {
    var p = null, k;
    for (k in jours) if (actif(jours, k) && (p === null || +k < p)) p = +k;
    return p;
  }

  /** Nouveautés par jour : le rythme observé sur deux semaines s'il y a assez de recul, sinon le rythme réglé. */
  function rythme(jours, auj, regle) {
    var premier = premierJour(jours);
    var fin = jours[auj] && jours[auj].neu ? auj : auj - 1;
    var debut = Math.max(fin - 13, premier === null ? fin + 1 : premier);
    var nb = Math.max(0, fin - debut + 1), neu = 0, actifs = 0, d;
    for (d = debut; d <= fin; d++) if (actif(jours, d)) { actifs++; neu += jours[d].neu || 0; }
    if (nb < 3 || actifs < 2) return { v: regle, source: 'regle', jours: nb, actifs: actifs };
    return { v: neu / nb, source: 'reel', jours: nb, actifs: actifs };
  }

  /** Le plus petit réglage de rythme qui atteint le besoin, ou null si même le plus fort ne suffit pas. */
  function reglagePour(besoin) {
    for (var i = 0; i < RYTHMES.length; i++) if (RYTHMES[i] >= besoin) return RYTHMES[i];
    return null;
  }

  /**
   * Serai-je prêt à temps ? o : { total, vus, acquis, jours, auj, exam (jour ou null), regle }.
   * etat : debut (rien vu), fini (tout acquis), vu (tout vu, pas tout acquis), avance, retard, libre (pas de date), passe.
   */
  function prevision(o) {
    var neufs = Math.max(0, o.total - o.vus), r = rythme(o.jours, o.auj, o.regle);
    var p = { total: o.total, vus: o.vus, acquis: o.acquis, neufs: neufs, rythme: r.v, source: r.source,
      jourVu: null, jourAcquis: null, reste: o.exam === null ? null : o.exam - o.auj, marge: null, manque: 0, besoin: null, conseil: null, etat: 'libre' };
    if (!neufs) { p.jourVu = o.auj; p.jourAcquis = o.acquis >= o.total ? o.auj : o.auj + DELAI_ACQUIS; }
    else if (r.v > 0) { p.jourVu = o.auj + Math.ceil(neufs / r.v); p.jourAcquis = p.jourVu + DELAI_ACQUIS; }
    if (p.reste !== null) {
      if (p.jourAcquis !== null) p.marge = o.exam - p.jourAcquis;
      p.manque = Math.max(0, neufs - Math.floor(r.v * Math.max(0, p.reste)));
      if (neufs && p.reste > 0 && (p.marge === null || p.marge < 0)) {
        p.besoin = Math.ceil(neufs / Math.max(1, p.reste - DELAI_ACQUIS));
        p.conseil = reglagePour(p.besoin);
      }
    }
    if (o.total && o.acquis >= o.total) p.etat = 'fini';
    else if (p.reste !== null && p.reste < 0) p.etat = 'passe';
    else if (!neufs) p.etat = 'vu';
    else if (p.reste === null) p.etat = o.vus ? 'libre' : 'debut';
    else if (p.marge !== null && p.marge >= 0) p.etat = o.vus ? 'avance' : 'debut';
    else p.etat = 'retard';
    return p;
  }

  /** Repères vus, jour par jour, du jour « depuis » à aujourd'hui : on repart du total actuel et on retire les nouveautés de chaque jour. */
  function historique(jours, auj, vus, depuis) {
    var pts = [], c = vus, d;
    for (d = auj; d >= depuis; d--) { pts.push({ jour: d, v: c }); c = Math.max(0, c - ((jours[d] && jours[d].neu) || 0)); }
    return pts.reverse();
  }

  /** Suite de la courbe : un point par jour, d'aujourd'hui à « fin », au rythme donné, plafonné au total. */
  function projection(vus, total, rythmeJour, auj, fin) {
    var pts = [], d;
    for (d = auj; d <= fin; d++) pts.push({ jour: d, v: Math.min(total, Math.round(vus + rythmeJour * (d - auj))) });
    return pts;
  }

  /** Séries, jours travaillés, réussite et temps de travail sur sept jours (et sur les sept précédents, pour comparer). */
  function regularite(jours, auj) {
    var r = { enCours: 0, record: 0, actifs30: 0, n7: 0, ok7: 0, ms7: 0, actifs7: 0, nAvant: 0, okAvant: 0, total: 0, premier: premierJour(jours) };
    var d = actif(jours, auj) ? auj : auj - 1, suite = 0;
    while (actif(jours, d)) { r.enCours++; d--; }
    if (r.premier !== null) for (d = r.premier; d <= auj; d++) {
      if (actif(jours, d)) { suite++; r.total++; if (suite > r.record) r.record = suite; } else suite = 0;
    }
    for (d = auj - 29; d <= auj; d++) if (actif(jours, d)) r.actifs30++;
    for (d = auj - 6; d <= auj; d++) if (actif(jours, d)) { r.actifs7++; r.n7 += jours[d].n; r.ok7 += jours[d].ok || 0; r.ms7 += jours[d].ms || 0; }
    for (d = auj - 13; d <= auj - 7; d++) if (actif(jours, d)) { r.nAvant += jours[d].n; r.okAvant += jours[d].ok || 0; }
    r.taux7 = r.n7 ? r.ok7 / r.n7 : null;
    r.tauxAvant = r.nAvant ? r.okAvant / r.nAvant : null;
    return r;
  }

  /** Calendrier d'activité : nb semaines du lundi au dimanche, la dernière étant la semaine en cours. niv : 0 (rien) à 4. */
  function semaines(jours, auj, nb) {
    var lundi = auj - dateDe(auj).s, debut = lundi - 7 * (nb - 1), actifs = [], d, w, s;
    for (d = debut; d <= auj; d++) if (actif(jours, d)) actifs.push(jours[d].n);
    actifs.sort(function (a, b) { return a - b; });
    var max = actifs.length ? actifs[actifs.length - 1] : 0, mediane = actifs.length ? actifs[Math.floor(actifs.length / 2)] : 0;
    var ref = Math.max(1, Math.min(max, 2 * mediane));   // une journée hors norme n'écrase pas les autres
    var out = [];
    for (w = 0; w < nb; w++) {
      var sem = { lundi: debut + 7 * w, jours: [], n: 0, ok: 0, actifs: 0 };
      for (s = 0; s < 7; s++) {
        d = sem.lundi + s;
        var x = jours[d], n = x ? x.n || 0 : 0, q = n / ref;
        sem.jours.push({ jour: d, n: n, ok: x ? x.ok || 0 : 0, futur: d > auj, niv: !n ? 0 : q >= 0.75 ? 4 : q >= 0.5 ? 3 : q >= 0.25 ? 2 : 1 });
        if (n) { sem.n += n; sem.ok += x.ok || 0; sem.actifs++; }
      }
      out.push(sem);
    }
    return out;
  }

  /** Révisions déjà programmées pour les nb prochains jours. La case 0 compte aussi les révisions en retard. */
  function aVenir(cartes, existe, auj, nb) {
    var r = [], i, id;
    for (i = 0; i < nb; i++) r.push(0);
    for (id in cartes) {
      var c = cartes[id];
      if (!c || !c.b || !existe(id)) continue;
      i = Math.max(0, c.due - auj);
      if (i < nb) r[i]++;
    }
    return r;
  }

  /** État de chaque pack : repères acquis, en cours, à découvrir, et taux de bonnes réponses. */
  function parPack(packs, cartes) {
    return packs.map(function (p) {
      var r = { id: p.id, titre: p.titre, theme: p.theme, n: p.faits.length, acquis: 0, cours: 0, neuf: 0, rep: 0, ok: 0 };
      p.faits.forEach(function (f) {
        var c = cartes[f.id];
        if (!c || !c.b) r.neuf++; else if (c.b >= PALIER) r.acquis++; else r.cours++;
        if (c) { r.rep += c.n || 0; r.ok += c.ok || 0; }
      });
      r.taux = r.rep ? r.ok / r.rep : null;
      return r;
    });
  }

  /** Les repères qui résistent : au moins deux erreurs et pas encore acquis, les plus ratés d'abord. */
  function fragiles(cartes, faits, max) {
    var l = [], id;
    for (id in cartes) {
      var c = cartes[id], ech = (c.n || 0) - (c.ok || 0);
      if (faits[id] && c.b && c.b < PALIER && ech >= 2) l.push({ id: id, ech: ech, n: c.n, taux: c.n ? c.ok / c.n : 0 });
    }
    l.sort(function (a, b) { return b.ech - a.ech || a.taux - b.taux || (a.id < b.id ? -1 : 1); });
    return l.slice(0, max);
  }

  /** Oraux blancs : notes dans l'ordre, moyenne générale et moyenne par critère (le plus faible est signalé à partir de deux oraux). */
  function oraux(liste, nbCriteres) {
    var r = { n: liste.length, points: [], moyenne: null, criteres: [], faible: -1, dernier: null, meilleur: null }, i, somme = 0;
    liste.forEach(function (o) { r.points.push({ t: o.t, total: o.total, titre: o.titre }); somme += o.total; if (r.meilleur === null || o.total > r.meilleur) r.meilleur = o.total; });
    if (!r.n) return r;
    r.moyenne = somme / r.n; r.dernier = liste[r.n - 1].total;
    for (i = 0; i < nbCriteres; i++) {
      var s = 0, k = 0;
      liste.forEach(function (o) { if (o.notes && typeof o.notes[i] === 'number' && o.notes[i] >= 0) { s += o.notes[i]; k++; } });
      r.criteres.push(k ? s / k : null);
    }
    if (r.n >= 2) r.criteres.forEach(function (m, j) { if (m !== null && (r.faible < 0 || m < r.criteres[r.faible])) r.faible = j; });
    return r;
  }

  /** Borne haute « ronde » pour une échelle : 37 donne 40, 112 donne 150, 319 donne 400. */
  function plafond(v) {
    if (v <= 5) return 5;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), q = v / p;
    return (q <= 1 ? 1 : q <= 1.5 ? 1.5 : q <= 2 ? 2 : q <= 3 ? 3 : q <= 4 ? 4 : q <= 5 ? 5 : q <= 8 ? 8 : 10) * p;
  }

  DATA.suivi = { PALIER: PALIER, DELAI_ACQUIS: DELAI_ACQUIS, RYTHMES: RYTHMES, dateDe: dateDe, rythme: rythme, reglagePour: reglagePour,
    prevision: prevision, historique: historique, projection: projection, regularite: regularite, semaines: semaines,
    aVenir: aVenir, parPack: parPack, fragiles: fragiles, oraux: oraux, plafond: plafond };
})(typeof window !== 'undefined' ? window : globalThis);
