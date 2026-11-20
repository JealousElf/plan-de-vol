/* Plan de vol : les actualités de l'accueil. Le robot du dépôt (outils/actualites.mjs) écrit data/news.json plusieurs fois par jour ;
   ce fichier le relit, écarte ce qui est mal formé et fabrique les cartes. Tout sauf suivre() se teste sans navigateur. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  var THEMES = { def: 'Défense', int: 'International', aero: 'Aéro et spatial', pol: 'Politique' };
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var MAX = 5, RELIRE = 30 * 60000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function valide(a) { return !!a && typeof a.t === 'string' && a.t !== '' && /^https:\/\//.test(a.u || '') && typeof a.s === 'string'; }
  /** Le contenu de data/news.json, nettoyé : la date de mise à jour et cinq articles bien formés au plus. null si illisible. */
  function lire(n) { return n && Array.isArray(n.articles) ? { maj: n.maj || null, articles: n.articles.filter(valide).slice(0, MAX) } : null; }

  /** « il y a 3 h », « hier », « le 12 nov. ». maintenant : en millisecondes, Date.now() par défaut. */
  function depuis(iso, maintenant) {
    var t = Date.parse(iso || ''); if (isNaN(t)) return '';
    var m = Math.round(((maintenant || Date.now()) - t) / 60000);
    if (m < 2) return 'à l\'instant';
    if (m < 60) return 'il y a ' + m + ' min';
    if (m < 1440) return 'il y a ' + Math.round(m / 60) + ' h';
    if (m < 2880) return 'hier';
    var d = new Date(t); return 'le ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS_C[d.getMonth()];
  }
  function carte(a, maintenant) {
    var quand = depuis(a.d, maintenant), th = THEMES[a.th] ? a.th : 'int', n = Math.floor(+a.n || 0);
    var img = /^https:\/\/[^\s"'<>]+$/.test(a.i || '') ? '<img src="' + esc(a.i) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '';
    return '<a class="news-carte" data-a="lien" data-lien href="' + esc(a.u) + '" target="_blank" rel="noopener">' +
      '<span class="news-img th-' + th + (img ? '' : ' vide') + '">' + img + '</span>' +
      '<span class="news-corps"><span class="news-theme th-' + th + '">' + THEMES[th] + '</span>' +
      '<span class="news-titre">' + esc(a.t) + '</span>' +
      '<span class="news-meta">' + esc(a.s) + (quand ? ', ' + esc(quand) : '') + '</span>' +
      (n > 1 ? '<span class="news-reprise">Racontée par ' + n + ' médias</span>' : '') + '</span></a>';
  }
  /** Le bloc « Actualités ». news : null tant que rien n'est arrivé. o : { horsLigne, maintenant }, facultatif. */
  function bloc(news, o) {
    o = o || {};
    var h = '<div class="bloc news" id="news"><div class="news-tete"><h2>Actualités</h2>';
    if (!news) return h + '</div><p class="note">Chargement des actualités…</p></div>';
    if (!news.articles.length) return h + '</div><p class="note">' + (o.horsLigne ? 'Les actualités s\'afficheront au retour du réseau.' : 'Actualités indisponibles pour l\'instant.') + '</p></div>';
    h += news.maj ? '<span class="news-maj">Mis à jour ' + esc(depuis(news.maj, o.maintenant)) + '</span>' : '';
    h += '</div><div class="news-rail" id="news-rail">' + news.articles.map(function (a) { return carte(a, o.maintenant); }).join('') + '</div>';
    return h + '<p class="note espace">Les histoires que les médias ont le plus suivies ces trois derniers jours. Touche une carte pour lire l\'article.</p></div>';
  }

  /** Branche les actualités sur la page. visible() dit si l'accueil est affiché sans séance en cours : le bloc y est alors remplacé sur place.
      Les titres sont relus quand on revient sur l'application après une demi-heure. */
  function suivre(visible) {
    var doc = racine.document, news = null, lu = 0;
    function html() { return bloc(news, { horsLigne: racine.navigator.onLine === false }); }
    function maj() { var el = doc.getElementById('news'); if (el && visible()) el.outerHTML = html(); }
    function charger() {
      if (!racine.fetch || !/^https?:$/.test(racine.location.protocol)) return;
      lu = Date.now();
      racine.fetch('data/news.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (n) {
        news = lire(n) || news || { maj: null, articles: [] };
        maj();
      }).catch(function () { if (!news) { news = { maj: null, articles: [] }; maj(); } });
    }
    /* Image d'illustration introuvable : on garde le motif à la place. */
    doc.addEventListener('error', function (e) {
      var t = e.target, p = t && t.parentNode;
      if (t && t.tagName === 'IMG' && p && p.classList && p.classList.contains('news-img')) { p.classList.add('vide'); p.removeChild(t); }
    }, true);
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible' && Date.now() - lu > RELIRE) charger();
    });
    return { charger: charger, bloc: html };
  }

  DATA.actualites = { THEMES: THEMES, valide: valide, lire: lire, depuis: depuis, carte: carte, bloc: bloc, suivre: suivre };
})(typeof window !== 'undefined' ? window : globalThis);
