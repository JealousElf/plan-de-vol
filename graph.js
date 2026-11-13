/* Plan de vol : les graphiques du carnet (barres, calendrier, courbe, barres segmentées, jauges, tableau de chiffres).
   Chaque fonction rend du HTML. init() branche une seule fois l'info-bulle, le viseur de la courbe et le clavier.
   Règles suivies : marques fines, une seule teinte par série, valeurs lisibles sans survol (libellés ou tableau). */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pc(v) { return (Math.round(v * 100) / 100) + '%'; }
  function bulleAttr(v, l) { return ' data-v="' + esc(v) + '"' + (l ? ' data-l="' + esc(l) + '"' : ''); }

  /**
   * Colonnes sur une ligne de base. items : [{ v, bulle, lib, x, cl, et }] ; o : { max, haut, aria, h }.
   * bulle et lib : la valeur et le libellé lus au survol ; x : texte sous la colonne ; et : valeur écrite sur la colonne.
   */
  function barres(items, o) {
    var max = o.max || 1, h = '<div class="barres g-nav" role="group" aria-label="' + esc(o.aria) + '" style="--h:' + (o.h || 96) + 'px">';
    h += '<span class="b-max" aria-hidden="true">' + esc(o.haut === undefined ? max : o.haut) + '</span>';
    items.forEach(function (it, i) {
      var p = Math.max(0, Math.min(100, 100 * it.v / max));
      h += '<span class="b-col' + (it.cl ? ' ' + it.cl : '') + '" tabindex="' + (i === (o.focus || 0) ? 0 : -1) + '" role="img" aria-label="' + esc(it.lib + ' : ' + it.bulle) + '"' + bulleAttr(it.bulle, it.lib) + '>' +
        (it.et ? '<b class="b-et" style="bottom:' + pc(p) + '">' + esc(it.et) + '</b>' : '') +
        (it.v > 0 ? '<i style="height:' + pc(Math.max(p, 4)) + '"></i>' : '') + '</span>';
    });
    h += '</div>';
    if (items.some(function (it) { return it.x; })) {
      h += '<div class="barres-x" aria-hidden="true">' + items.map(function (it) { return '<span' + (it.cl ? ' class="' + it.cl + '"' : '') + '>' + esc(it.x || '') + '</span>'; }).join('') + '</div>';
    }
    return h;
  }

  /**
   * Calendrier d'activité : une colonne par semaine, une case par jour, du plus clair au plus foncé.
   * sems : résultat de suivi.semaines ; o : { auj, aria, mois(jour), lib(jour), valeur(jour), jours, legende }.
   */
  function calendrier(sems, o) {
    var h = '<div class="cal" style="--sem:' + sems.length + '"><div class="cal-mois" aria-hidden="true">', dernier = -9, moisVu = null;
    sems.forEach(function (s, w) {
      var m = o.mois(s.lundi + 6);
      if (m !== moisVu && w - dernier >= 3 && w <= sems.length - 2) { h += '<span style="grid-column:' + (w + 2) + ' / span 3">' + esc(m) + '</span>'; dernier = w; }
      moisVu = m;
    });
    h += '</div><div class="cal-grille g-nav" data-pas="7" role="group" aria-label="' + esc(o.aria) + '">';
    (o.jours || []).forEach(function (t) { h += '<span class="cal-j" aria-hidden="true">' + esc(t) + '</span>'; });
    sems.forEach(function (s) {
      s.jours.forEach(function (j) {
        if (j.futur) { h += '<i class="futur" aria-hidden="true"></i>'; return; }
        var v = o.valeur(j), l = o.lib(j);
        h += '<i class="n' + j.niv + (j.jour === o.auj ? ' auj' : '') + '" tabindex="' + (j.jour === o.auj ? 0 : -1) + '" role="img" aria-label="' + esc(l + ' : ' + v) + '"' + bulleAttr(v, l) + '></i>';
      });
    });
    h += '</div><div class="cal-leg" aria-hidden="true"><span>' + esc(o.legende[0]) + '</span><i class="n0"></i><i class="n1"></i><i class="n2"></i><i class="n3"></i><i class="n4"></i><span>' + esc(o.legende[1]) + '</span></div></div>';
    return h;
  }

  /**
   * Courbe dans le temps. Les tracés sont étirés à la largeur disponible ; les textes et les pastilles restent nets, posés en pourcentages.
   * o : { x0, x1, y1, h, aria, reel: [[x, y]], prevu: [[x, y]], cible: { y, t }, repere: { x, t }, points: [{ x, y, cl }],
   *       etiquettes: [{ x, y, t, cl }], gradX: [{ x, t, cl }], gradY: [{ y, t }], lecture: [{ x, v, l }], sansAire }
   */
  function courbe(o) {
    var dx = (o.x1 - o.x0) || 1, y1 = o.y1 || 1;
    function px(x) { return Math.round(10000 * (x - o.x0) / dx) / 100; }
    function py(y) { return Math.round(10000 * (1 - y / y1)) / 100; }
    function chemin(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + px(p[0]) + ' ' + py(p[1]); }).join(''); }
    var lect = (o.lecture || []).map(function (p) { return [px(p.x), p.v, p.l]; });
    var h = '<div class="courbe" style="--h:' + (o.h || 160) + 'px"><div class="g-plot" tabindex="0" role="img" aria-label="' + esc(o.aria) + '" data-lect="' + esc(JSON.stringify(lect)) + '">';
    h += '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">';
    (o.gradY || []).forEach(function (g) { h += '<line class="g-grille" x1="0" x2="100" y1="' + py(g.y) + '" y2="' + py(g.y) + '"/>'; });
    if (o.cible) h += '<line class="g-cible" x1="0" x2="100" y1="' + py(o.cible.y) + '" y2="' + py(o.cible.y) + '"/>';
    if (o.repere) h += '<line class="g-repere" x1="' + px(o.repere.x) + '" x2="' + px(o.repere.x) + '" y1="0" y2="100"/>';
    if (o.reel && o.reel.length > 1 && !o.sansAire) {
      var a = o.reel[0], z = o.reel[o.reel.length - 1];
      h += '<path class="g-aire" d="' + chemin(o.reel) + 'L' + px(z[0]) + ' 100L' + px(a[0]) + ' 100Z"/>';
    }
    if (o.prevu && o.prevu.length > 1) h += '<path class="g-trait prevu" d="' + chemin(o.prevu) + '"/>';
    if (o.reel && o.reel.length > 1) h += '<path class="g-trait" d="' + chemin(o.reel) + '"/>';
    h += '</svg>';
    (o.gradY || []).forEach(function (g) { if (g.t) h += '<span class="g-gy" style="top:' + pc(py(g.y)) + '" aria-hidden="true">' + esc(g.t) + '</span>'; });
    if (o.cible) h += '<span class="g-gy cible" style="top:' + pc(py(o.cible.y)) + '" aria-hidden="true">' + esc(o.cible.t) + '</span>';
    if (o.repere) h += '<span class="g-rep' + (px(o.repere.x) > 80 ? ' fin' : '') + '" style="left:' + pc(px(o.repere.x)) + '" aria-hidden="true">' + esc(o.repere.t) + '</span>';
    (o.points || []).forEach(function (p) { h += '<i class="g-pt' + (p.cl ? ' ' + p.cl : '') + '" style="left:' + pc(px(p.x)) + ';top:' + pc(py(p.y)) + '" aria-hidden="true"></i>'; });
    (o.etiquettes || []).forEach(function (e) { h += '<span class="g-et' + (e.cl ? ' ' + e.cl : '') + '" style="left:' + pc(px(e.x)) + ';top:' + pc(py(e.y)) + '" aria-hidden="true">' + esc(e.t) + '</span>'; });
    h += '<i class="g-fil" hidden></i></div><div class="g-gx" aria-hidden="true">';
    (o.gradX || []).forEach(function (g) { h += '<span class="' + (g.cl || '') + '" style="left:' + pc(px(g.x)) + '">' + esc(g.t) + '</span>'; });
    return h + '</div></div>';
  }

  /** Barre fine découpée en parts (un tout). parts : [{ v, cl }]. Une part nulle ne dessine rien. */
  function segments(parts, aria) {
    return '<span class="seg" role="img" aria-label="' + esc(aria) + '">' + parts.filter(function (p) { return p.v > 0; }).map(function (p) {
      return '<i class="' + esc(p.cl) + '" style="flex-grow:' + p.v + '"></i>';
    }).join('') + '</span>';
  }

  /** Jauge : une valeur sur un maximum. */
  function jauge(v, max, aria) {
    return '<span class="metre" role="img" aria-label="' + esc(aria) + '"><i style="width:' + pc(Math.max(0, Math.min(100, 100 * v / max))) + '"></i></span>';
  }

  /** Les mêmes chiffres en tableau, repliés sous le graphique. entetes : textes ; lignes : tableaux de cellules (la première sert d'intitulé). */
  function tableau(titre, entetes, lignes) {
    var h = '<details class="releve"><summary>' + esc(titre) + '</summary><div class="releve-zone"><table><thead><tr>';
    entetes.forEach(function (e) { h += '<th scope="col">' + esc(e) + '</th>'; });
    h += '</tr></thead><tbody>';
    lignes.forEach(function (l) {
      h += '<tr>' + l.map(function (c, i) { return i ? '<td>' + esc(c) + '</td>' : '<th scope="row">' + esc(c) + '</th>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div></details>';
  }

  /* ---------- info-bulle, viseur, clavier ---------- */
  var bulle = null, cible = null, pret = false;
  function montrer(v, l, x, haut, bas) {
    var doc = racine.document;
    if (!bulle) {
      bulle = doc.createElement('div'); bulle.id = 'bulle'; bulle.className = 'bulle'; bulle.setAttribute('role', 'tooltip');
      bulle.appendChild(doc.createElement('b')); bulle.appendChild(doc.createElement('span'));
      doc.body.appendChild(bulle);
    }
    bulle.firstChild.textContent = v || ''; bulle.lastChild.textContent = l || '';
    bulle.hidden = false;
    var w = bulle.offsetWidth, ht = bulle.offsetHeight, vw = doc.documentElement.clientWidth;
    var y = haut - ht - 8;
    if (y < 6) y = (bas === undefined ? haut : bas) + 8;
    bulle.style.left = Math.round(Math.max(6, Math.min(vw - w - 6, x - w / 2))) + 'px';
    bulle.style.top = Math.round(y) + 'px';
  }
  function cacher() {
    if (bulle) bulle.hidden = true;
    if (cible && cible.classList && cible.classList.contains('g-plot')) { var f = cible.querySelector('.g-fil'); if (f) f.hidden = true; }
    cible = null;
  }
  function surMarque(el) {
    var m = el.querySelector('i') || el, r = m.getBoundingClientRect(), c = el.getBoundingClientRect();
    if (cible && cible !== el) cacher();
    cible = el;
    montrer(el.getAttribute('data-v'), el.getAttribute('data-l'), c.left + c.width / 2, r.top, r.bottom);
  }
  function lecture(plot) {
    if (!plot._lect) { try { plot._lect = JSON.parse(plot.getAttribute('data-lect') || '[]'); } catch (e) { plot._lect = []; } }
    return plot._lect;
  }
  function placer(plot, i) {
    var l = lecture(plot), p = l[i], fil = plot.querySelector('.g-fil');
    if (!p || !fil) return;
    if (cible && cible !== plot) cacher();
    cible = plot; plot._i = i;
    fil.hidden = false; fil.style.left = p[0] + '%';
    var r = plot.getBoundingClientRect();
    montrer(p[1], p[2], r.left + r.width * p[0] / 100, r.top, r.bottom);
  }
  function viser(plot, clientX) {
    var r = plot.getBoundingClientRect(), f = 100 * (clientX - r.left) / (r.width || 1), l = lecture(plot), mieux = -1, ecart = Infinity;
    l.forEach(function (p, i) { var e = Math.abs(p[0] - f); if (e < ecart) { ecart = e; mieux = i; } });
    if (mieux >= 0) placer(plot, mieux);
  }
  function proche(e, sel) { return e.target && e.target.closest ? e.target.closest(sel) : null; }

  /** À appeler une fois au lancement : survol, toucher et clavier pour tous les graphiques de la page. */
  function init() {
    var doc = racine.document;
    if (pret || !doc) return;
    pret = true;
    function pointe(e) {
      var plot = proche(e, '.g-plot'), m;
      if (plot) return viser(plot, e.clientX);
      m = proche(e, '[data-v]');
      if (m) surMarque(m); else if (cible) cacher();
    }
    doc.addEventListener('pointerover', pointe);
    doc.addEventListener('pointerdown', pointe);
    doc.addEventListener('pointermove', function (e) { var plot = proche(e, '.g-plot'); if (plot) viser(plot, e.clientX); });
    doc.addEventListener('focusin', function (e) {
      var m = proche(e, '[data-v]'), plot = proche(e, '.g-plot');
      if (m) surMarque(m);
      else if (plot && plot.matches(':focus-visible')) placer(plot, plot._i === undefined ? lecture(plot).length - 1 : plot._i);
    });
    doc.addEventListener('focusout', function (e) { if (proche(e, '[data-v]') || proche(e, '.g-plot')) cacher(); });
    // Au défilement : une bulle ouverte au clavier suit sa marque, une bulle ouverte au pointeur se ferme.
    racine.addEventListener('scroll', function () {
      if (!cible) return;
      if (doc.activeElement !== cible) cacher();
      else if (cible.classList.contains('g-plot')) placer(cible, cible._i || 0);
      else surMarque(cible);
    }, { passive: true });
    doc.addEventListener('keydown', function (e) {
      var plot = proche(e, '.g-plot'), nav = proche(e, '.g-nav'), n;
      if (e.key === 'Escape' && cible) return cacher();
      if (plot) {
        n = lecture(plot).length;
        var i = plot._i === undefined ? n - 1 : plot._i;
        if (e.key === 'ArrowLeft') i--; else if (e.key === 'ArrowRight') i++; else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = n - 1; else return;
        e.preventDefault(); placer(plot, Math.max(0, Math.min(n - 1, i)));
        return;
      }
      if (!nav) return;
      var marques = Array.prototype.slice.call(nav.querySelectorAll('[data-v]')), k = marques.indexOf(doc.activeElement), pas = +nav.getAttribute('data-pas') || 1;
      if (k < 0) return;
      if (e.key === 'ArrowRight') k += pas; else if (e.key === 'ArrowLeft') k -= pas;
      else if (e.key === 'ArrowDown' && pas > 1) k += 1; else if (e.key === 'ArrowUp' && pas > 1) k -= 1;
      else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = marques.length - 1; else return;
      e.preventDefault();
      k = Math.max(0, Math.min(marques.length - 1, k));
      marques.forEach(function (m, j) { m.setAttribute('tabindex', j === k ? 0 : -1); });
      marques[k].focus();
    });
  }

  DATA.graph = { barres: barres, calendrier: calendrier, courbe: courbe, segments: segments, jauge: jauge, tableau: tableau, init: init, cacher: cacher };
})(typeof window !== 'undefined' ? window : globalThis);
