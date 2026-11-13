(function () {
  'use strict';

  var DATA = window.PDV || (window.PDV = { packs: [], sujets: [] });
  var app = document.getElementById('app');
  var LS = 'pdv.progression.v1';
  /* Dépôt qui reçoit les signalements d'erreur. À changer seulement si tu maintiens ta propre version des fiches. */
  var DEPOT = DATA.depot || 'JealousElf/plan-de-vol';
  var VERSION_APP = '13 novembre 2026';
  var JOUR = 86400000;
  var IV = [0, 1, 2, 4, 8, 16, 32];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var FACTS = {};
  var SUIVI = DATA.suivi, G = DATA.graph;
  var JOURS_SEM = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var THEME = 'pdv.theme';

  /* ---------- outils ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function auj() { var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / JOUR); }
  function melange(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function annee(y) { y = Math.floor(y); return y < 0 ? (-y) + ' av. J.-C.' : String(y); }
  function dateFr(iso) {
    var p = String(iso || '').split('-'); if (p.length < 3) return '';
    var j = parseInt(p[2], 10);
    return (j === 1 ? '1er' : j) + ' ' + MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function jourIso(iso) {
    var p = String(iso).split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / JOUR);
  }
  function mmss(ms) { var s = Math.max(0, Math.round(ms / 1000)); var m = Math.floor(s / 60); s = s % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function pluriel(n, un, des) { return n + ' ' + (n > 1 ? des : un); }
  function jourTexte(jour, court) { var d = SUIVI.dateDe(jour); return (d.j === 1 ? '1er' : d.j) + ' ' + (court ? MOIS_C[d.m] : MOIS[d.m]); }
  function jourLong(jour) { return JOURS_SEM[SUIVI.dateDe(jour).s] + ' ' + jourTexte(jour); }
  function initiale(jour) { return JOURS_SEM[SUIVI.dateDe(jour).s].charAt(0).toUpperCase(); }
  function pourcent(x) { return Math.round(100 * x) + '\u00a0%'; }
  function virgule(x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }
  function duree(ms) { var m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- données ---------- */
  function aQcm(f) { return typeof f.q === 'string' && typeof f.a === 'string' && Array.isArray(f.x) && f.x.length >= 3; }
  function aDate(f) { return typeof f.y === 'number' && typeof f.d === 'string' && f.d !== ''; }
  function indexer() {
    FACTS = {};
    DATA.packs.forEach(function (p) {
      var ans = {};
      (p.faits || []).forEach(function (f) { f.pack = p.id; FACTS[f.id] = f; if (aDate(f)) ans[Math.floor(f.y)] = 1; });
      p.ny = Object.keys(ans).length;
    });
  }
  function pack(id) { for (var i = 0; i < DATA.packs.length; i++) if (DATA.packs[i].id === id) return DATA.packs[i]; return null; }
  function tous() { var r = []; DATA.packs.forEach(function (p) { r = r.concat(p.faits); }); return r; }
  function faitsDe(pid) { var p = pid ? pack(pid) : null; return p ? p.faits : tous(); }
  function packValide(p) {
    return p && typeof p.id === 'string' && typeof p.titre === 'string' && Array.isArray(p.faits) && p.faits.length > 0 &&
      p.faits.every(function (f) {
        return f && typeof f.id === 'string' && typeof f.t === 'string' && typeof f.r === 'string' &&
          (aDate(f) || (aQcm(f) && f.x.every(function (s) { return typeof s === 'string'; })));
      });
  }
  function parTheme() {
    var noms = [], par = {};
    DATA.packs.forEach(function (p) { var t = p.theme || 'Autres repères'; if (!par[t]) { par[t] = []; noms.push(t); } par[t].push(p); });
    return noms.map(function (t) { return { nom: t, packs: par[t] }; });
  }
  function ajouterPack(p) {
    p = clone(p); if (!p.court) p.court = p.titre; if (!p.sous) p.sous = pluriel(p.faits.length, 'repère', 'repères'); if (!p.maj) p.maj = '';
    for (var i = 0; i < DATA.packs.length; i++) if (DATA.packs[i].id === p.id) { DATA.packs[i] = p; return; }
    DATA.packs.push(p);
  }

  /* ---------- progression ---------- */
  function vide() {
    return { v: 1, epoch: 0, cards: {}, days: {}, best: {}, oraux: [], flags: {}, diag: 0,
      set: { exam: null, neu: 10, prep: 30, expo: 10, quest: 10, blitz: 15, auto: 1, t: 0 } };
  }
  function normaliser(p) {
    var b = vide(), k;
    if (!p || typeof p !== 'object') return b;
    ['cards', 'days', 'best', 'flags'].forEach(function (c) { if (p[c] && typeof p[c] === 'object' && !Array.isArray(p[c])) b[c] = p[c]; });
    if (Array.isArray(p.oraux)) b.oraux = p.oraux.filter(function (o) { return o && typeof o.t === 'number'; });
    if (p.set && typeof p.set === 'object') {
      for (k in b.set) if (Object.prototype.hasOwnProperty.call(p.set, k) && (p.set[k] !== null || k === 'exam')) b.set[k] = p.set[k];
    }
    b.diag = +p.diag || 0; b.epoch = +p.epoch || 0;
    return b;
  }
  function lireLocal() {
    try { var s = window.localStorage.getItem(LS); if (s) return normaliser(JSON.parse(s)); } catch (e) { /* stockage absent */ }
    return vide();
  }
  function ecrireLocal() { try { window.localStorage.setItem(LS, JSON.stringify(P)); } catch (e) { /* stockage absent */ } }
  var P = lireLocal();
  function commit() { elaguer(); ecrireLocal(); Sync.pousser(); }
  function elaguer() {
    var d = auj(), k;
    for (k in P.days) if (+k < d - 400) delete P.days[k];
    if (P.oraux.length > 60) P.oraux = P.oraux.slice(-60);
  }

  function fusionChamp(a, b, m, champ, plusRecent) {
    var ids = {}, k, r = { a: false, b: false };
    for (k in a[champ]) ids[k] = 1;
    for (k in b[champ]) ids[k] = 1;
    for (k in ids) {
      var x = a[champ][k], y = b[champ][k];
      if (x !== undefined && (y === undefined || plusRecent(x, y))) { m[champ][k] = x; r.a = true; }
      else if (y !== undefined && (x === undefined || plusRecent(y, x))) { m[champ][k] = y; r.b = true; }
      else m[champ][k] = x;
    }
    return r;
  }
  function fusion(a, b) {
    if ((a.epoch || 0) > (b.epoch || 0)) return { m: a, aPlus: true, bPlus: false };
    if ((b.epoch || 0) > (a.epoch || 0)) return { m: b, aPlus: false, bPlus: true };
    var m = vide(), A = false, B = false, r;
    m.epoch = a.epoch || 0;
    r = fusionChamp(a, b, m, 'cards', function (x, y) { return (x.t || 0) > (y.t || 0); }); A = A || r.a; B = B || r.b;
    r = fusionChamp(a, b, m, 'days', function (x, y) { return (x.n || 0) > (y.n || 0); }); A = A || r.a; B = B || r.b;
    r = fusionChamp(a, b, m, 'best', function (x, y) { return x > y; }); A = A || r.a; B = B || r.b;
    r = fusionChamp(a, b, m, 'flags', function (x, y) { return (x.t || 0) > (y.t || 0); }); A = A || r.a; B = B || r.b;
    var vus = {}, ta = {}, tb = {};
    a.oraux.forEach(function (o) { vus[o.t] = o; ta[o.t] = 1; });
    b.oraux.forEach(function (o) { tb[o.t] = 1; if (!vus[o.t]) { vus[o.t] = o; B = true; } });
    a.oraux.forEach(function (o) { if (!tb[o.t]) A = true; });
    m.oraux = Object.keys(vus).map(function (k) { return vus[k]; }).sort(function (x, y) { return x.t - y.t; }).slice(-60);
    if ((a.set.t || 0) > (b.set.t || 0)) { m.set = a.set; A = true; }
    else if ((b.set.t || 0) > (a.set.t || 0)) { m.set = b.set; B = true; }
    else m.set = a.set;
    m.diag = Math.max(a.diag || 0, b.diag || 0);
    if ((a.diag || 0) > (b.diag || 0)) A = true;
    if ((b.diag || 0) > (a.diag || 0)) B = true;
    return { m: m, aPlus: A, bPlus: B };
  }

  /* ---------- synchronisation entre appareils ---------- */
  var LIB = {
    local: 'Progression sur cet appareil',
    wait: 'Connexion…',
    late: 'Synchronisation lente',
    sync: 'Synchronisation…',
    ok: 'Synchronisé',
    off: 'Synchronisation interrompue',
    full: 'Espace de synchronisation plein',
    hors: 'Hors connexion, synchronisation au retour du réseau',
    refus: 'Jeton refusé par GitHub'
  };
  var CFG = 'pdv.sync.v1', CHEZ_CLAUDE = /claude|anthropic/i.test(window.location.hostname || '');
  var Sync = (function () {
    var ref = null, etat = 'local', sale = false, ecrit = false, pret = false, t1 = 0, t2 = 0, essais = 0;
    function dire(s) {
      etat = s;
      var el = document.getElementById('sync'); if (el) { el.textContent = LIB[s]; el.setAttribute('data-s', s); }
      var d = document.getElementById('sync-detail'); if (d) d.textContent = LIB[s];
    }
    /* Hors de Claude : la progression vit dans un gist privé du compte GitHub de l'utilisateur. */
    var API = 'https://api.github.com', FICHIER = 'plan-de-vol-progression.json';
    var git = lireCfg(), enVol = false, encore = false, dernier = 0, ecoute = false;
    function lireCfg() {
      try { var c = JSON.parse(window.localStorage.getItem(CFG) || 'null'); return c && typeof c.token === 'string' && c.token ? c : null; } catch (e) { return null; }
    }
    function ecrireCfg() {
      try { if (git) window.localStorage.setItem(CFG, JSON.stringify(git)); else window.localStorage.removeItem(CFG); } catch (e) { /* stockage absent */ }
    }
    function appel(methode, chemin, corps) {
      var o = { method: methode, cache: 'no-store', headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + git.token } };
      if (corps) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corps); }
      return window.fetch(API + chemin, o).then(function (r) {
        if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; }
        return r.json();
      });
    }
    function trouver() {
      if (git.gist) return Promise.resolve(git.gist);
      return appel('GET', '/gists?per_page=100').then(function (l) {
        for (var i = 0; i < (l || []).length; i++) if (l[i] && l[i].files && l[i].files[FICHIER]) { git.gist = l[i].id; ecrireCfg(); return git.gist; }
        return null;
      });
    }
    function lireGist(id) {
      if (!id) return Promise.resolve(null);
      return appel('GET', '/gists/' + id).then(function (g) {
        var f = g && g.files && g.files[FICHIER];
        if (!f) return null;
        if (f.truncated) throw new Error('tronqué');
        return f.content || '';
      }, function (e) {
        if (e && e.status === 404) { git.gist = null; ecrireCfg(); return null; }
        throw e;
      });
    }
    function cycle() {
      if (!git) return;
      if (enVol) { encore = true; return; }
      if (window.navigator.onLine === false) { dire('hors'); return; }
      var moi = git;
      enVol = true; encore = false; dire(pret ? 'sync' : 'wait');
      trouver().then(lireGist).then(function (txt) {
        if (git !== moi) return null;
        var envoyer = !git.gist;
        if (txt) {
          var dist = null;
          try { dist = normaliser(JSON.parse(txt)); } catch (e) { dist = null; }
          if (dist) {
            var r = fusion(P, dist);
            if (r.bPlus) { P = r.m; ecrireLocal(); distant(); }
            envoyer = envoyer || r.aPlus;
          } else envoyer = true;
        } else if (git.gist) envoyer = true;
        pret = true; sale = false;
        if (!envoyer) return null;
        var corps = { files: {} };
        corps.files[FICHIER] = { content: JSON.stringify(P) };
        if (git.gist) return appel('PATCH', '/gists/' + git.gist, corps);
        corps.description = 'Plan de vol : progression (fichier géré par l\'application)';
        corps['public'] = false;
        return appel('POST', '/gists', corps).then(function (g) { if (git === moi && g && g.id) { git.gist = g.id; ecrireCfg(); } });
      }).then(function () {
        enVol = false;
        if (git !== moi) return;
        dernier = Date.now(); dire('ok');
        if (encore || sale) planifier();
      }).catch(function (e) {
        enVol = false;
        if (git !== moi) return;
        var s = e && e.status;
        sale = true;
        if (s === 401 || s === 403) dire('refus');
        else dire(window.navigator.onLine === false ? 'hors' : 'off');
      });
    }
    function planifier() { clearTimeout(t2); t2 = setTimeout(cycle, 5000); }
    function demarrerGit() {
      pret = false; dire('wait'); cycle();
      if (ecoute) return;
      ecoute = true;
      window.addEventListener('online', function () { if (git) cycle(); });
      window.addEventListener('offline', function () { if (git) dire('hors'); });
      document.addEventListener('visibilitychange', function () {
        if (git && document.visibilityState === 'visible' && (sale || Date.now() - dernier > 60000)) cycle();
      });
    }
    function activer(jeton) { git = { token: jeton, gist: null }; ecrireCfg(); ref = null; demarrerGit(); }
    function couper() { git = null; ecrireCfg(); clearTimeout(t2); pret = false; dire('local'); }

    function init() { if (git) demarrerGit(); else chercher(0); }
    function chercher(n) {
      if (git) return;
      var c = window.claude;
      if (!c || typeof c.use !== 'function') {
        if (n === 0) dire('local');
        if (n < 30) setTimeout(function () { chercher(n + 1); }, 500);
        return;
      }
      dire('wait');
      Promise.all([c.use('db'), c.use('user')]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user || typeof user.id !== 'function') { dire('local'); return null; }
        chargerPacks(db);
        return user.id().then(function (uid) {
          if (!uid) { dire('local'); return; }
          try { ref = db.doc('data/users/' + uid + '/progression'); } catch (e) { ref = null; dire('local'); return; }
          t1 = setTimeout(function () { if (!pret) dire('late'); }, 10000);
          ref.onSnapshot(recu, function () { clearTimeout(t1); ref = null; dire('off'); });
        });
      }).catch(function () { dire('local'); });
    }
    function recu(snap) {
      var meta = snap.metadata || {};
      if (meta.hasPendingWrites) return;
      var sur = !meta.fromCache;
      if (snap.exists) {
        var r = fusion(P, normaliser(clone(snap.data())));
        if (r.bPlus) { P = r.m; ecrireLocal(); distant(); }
        if (r.aPlus) sale = true;
      } else if (sur && (Object.keys(P.cards).length || P.oraux.length || P.set.t)) {
        sale = true;
      }
      if (sur) { pret = true; clearTimeout(t1); }
      if (!pret) return;
      if (sale) bientot(); else if (!ecrit) dire('ok');
    }
    function bientot() { if (!ref || !pret) return; dire('sync'); clearTimeout(t2); t2 = setTimeout(ecrire, 1500); }
    function ecrire() {
      if (!ref || ecrit || !sale) return;
      ecrit = true; sale = false;
      ref.set(clone(P)).then(function () {
        ecrit = false; essais = 0;
        if (sale) bientot(); else dire('ok');
      }).catch(function (e) {
        ecrit = false;
        var code = e && e.code;
        if ((code === 'unavailable' || code === 'resource_exhausted') && essais < 2) {
          essais++; sale = true; clearTimeout(t2); t2 = setTimeout(ecrire, 6000 + Math.random() * 4000);
        } else if (code === 'quota_exceeded') { dire('full'); }
        else { sale = true; dire('off'); }
      });
    }
    function pousser() {
      sale = true; essais = 0;
      if (git) { if (enVol) encore = true; else planifier(); return; }
      if (ref && pret) bientot();
    }
    function chargerPacks(db) {
      try {
        db.collection('packs').get().then(function (qs) {
          var n = 0;
          (qs.docs || []).forEach(function (d) { var p = d.data(); if (packValide(p)) { ajouterPack(p); n++; } });
          if (n) { indexer(); distant(); }
        }).catch(function () { /* pas de packs distants */ });
      } catch (e) { /* idem */ }
    }
    return { init: init, pousser: pousser, etat: function () { return etat; }, git: function () { return !!git; }, activer: activer, couper: couper };
  })();

  /* ---------- pack d'actualité servi comme fichier, et fonctionnement hors connexion ---------- */
  function chargerActu() {
    if (!window.fetch || !/^https?:$/.test(window.location.protocol)) return;
    window.fetch('data/actu.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (p) {
      if (p && packValide(p)) { ajouterPack(p); indexer(); distant(); }
    }).catch(function () { /* hors connexion et pas encore de copie */ });
  }
  var HORS = { etat: 'non' };
  function horsConnexion() {
    var sw = window.navigator.serviceWorker;
    if (!sw || CHEZ_CLAUDE || !/^https?:$/.test(window.location.protocol)) return;
    var premier = !sw.controller, recharge = false;
    HORS.etat = 'attente';
    sw.register('sw.js').catch(function () { if (HORS.etat === 'attente') HORS.etat = 'non'; });
    function dire(s) { HORS.etat = s; var e = document.getElementById('hors-detail'); if (e) e.textContent = LIB_HORS[s]; }
    sw.ready.then(function () { dire('pret'); });
    setTimeout(function () { if (HORS.etat === 'attente') dire('non'); }, 12000);
    sw.addEventListener('controllerchange', function () {
      if (premier) { premier = false; return; }
      if (recharge || S.ses || S.frise || S.choix || S.oral) return;
      recharge = true; window.location.reload();
    });
  }
  var LIB_HORS = {
    non: 'Cette page a besoin du réseau.',
    attente: 'Préparation du mode hors connexion…',
    pret: 'Prête à fonctionner sans réseau.'
  };
  function distant() {
    if (S.ses || S.frise || S.choix) return;
    if (S.oral && page() === 'oral') return;
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    rendre();
  }

  /* ---------- répétition espacée ---------- */
  function etat(f) { var c = P.cards[f.id]; if (!c || !c.b) return 'neuf'; return c.b >= 4 ? 'acquis' : 'cours'; }
  function bilan(faits) {
    var r = { n: faits.length, acquis: 0, cours: 0, neuf: 0, pts: 0 };
    faits.forEach(function (f) { var c = P.cards[f.id]; r[etat(f)]++; if (c && c.b) r.pts += Math.min(c.b, 5) / 5; });
    r.pct = r.n ? Math.round(100 * r.pts / r.n) : 0;
    return r;
  }
  function nouveaux(n) {
    var files = DATA.packs.map(function (p) { return p.faits.filter(function (f) { var c = P.cards[f.id]; return !c || !c.b; }); });
    var out = [], i = 0, vides = 0;
    while (out.length < n && files.length && vides < files.length) {
      var q = files[i % files.length];
      if (q.length) { out.push(q.shift()); vides = 0; } else vides++;
      i++;
    }
    return out;
  }
  function planJour() {
    var d = auj();
    var dus = tous().filter(function (f) { var c = P.cards[f.id]; return c && c.b >= 1 && c.due <= d; });
    dus.sort(function (a, b) { return P.cards[a.id].due - P.cards[b.id].due; });
    var jour = P.days[d] || {};
    var quota = Math.max(0, (+P.set.neu || 10) - (jour.neu || 0));
    return { dus: dus.slice(0, 40), attente: Math.max(0, dus.length - 40), neufs: nouveaux(quota) };
  }
  function joursRestants() { return P.set.exam ? jourIso(P.set.exam) - auj() : null; }
  function serie() {
    var d = auj(), n = 0;
    if (!(P.days[d] && P.days[d].n)) d--;
    while (P.days[d] && P.days[d].n) { n++; d--; }
    return n;
  }

  /* ---------- fabrication des questions ---------- */
  function peutEnCours(f) { var p = pack(f.pack); return f.st === 'cours' && p.faits.filter(function (x) { return x.st === 'fin'; }).length >= 3; }
  function qQuand(f, dur) {
    var y = Math.floor(f.y), max = new Date().getFullYear();
    var k = y < 1000 ? 12 : y < 1700 ? 5 : y < 1900 ? 2 : 1;
    var pas = dur ? [1, 2, 3, 4, 5] : [3, 4, 6, 8, 10, 12, 15];
    var set = {}, n = 1, garde = 0; set[y] = 1;
    while (n < 4 && garde++ < 400) {
      var c = y + pas[Math.floor(Math.random() * pas.length)] * k * (Math.random() < 0.5 ? -1 : 1);
      if (c > max || c === 0 || set[c]) continue;
      set[c] = 1; n++;
    }
    var ys = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    var debut = f.y2 !== undefined && f.y2 !== f.y;
    return { id: f.id, fmt: 'quand', petit: debut ? 'En quelle année cela commence-t-il ?' : 'En quelle année ?', grand: f.t, deux: true,
      opts: ys.map(function (v) { return { t: annee(v), ok: v === y }; }) };
  }
  function voisins(f) {
    var p = pack(f.pack), y = Math.floor(f.y);
    var pool = p.faits.filter(function (x) { return x.id !== f.id && aDate(x) && Math.floor(x.y) !== y; });
    if (pool.length < 3) pool = p.faits.filter(function (x) { return x.id !== f.id && aDate(x) && x.d !== f.d; });
    return pool;
  }
  function formats(f) {
    if (aQcm(f)) return ['sur'];
    if (!aDate(f)) return [];
    var r = [];
    if (voisins(f).length >= 3) r.push('quoi');
    if (pack(f.pack).ny >= 4) r.push('quand');
    return r;
  }
  function qSur(f) {
    var o = melange(f.x.slice()).slice(0, 3).map(function (t) { return { t: t, ok: false }; });
    o.push({ t: f.a, ok: true });
    if (o.every(function (x) { return /^\d{1,4}$/.test(x.t); })) o.sort(function (a, b) { return +a.t - +b.t; });
    else melange(o);
    return { id: f.id, fmt: 'sur', petit: f.g || 'Question', grand: f.q, deux: o.every(function (x) { return x.t.length <= 12; }), opts: o };
  }
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
  function question(f, it) {
    if (it.fmt === 'decouverte') return { id: f.id, fmt: 'decouverte' };
    var l = formats(f);
    if (it.fmt === 'ouverte' || !l.length) {
      return aQcm(f) ? { id: f.id, fmt: 'ouverte', petit: 'Réponds à voix haute, puis vérifie.', grand: f.q }
        : { id: f.id, fmt: 'ouverte', petit: 'Date, faits, portée : réponds à voix haute, puis vérifie.', grand: f.t };
    }
    if (it.fmt === 'encours' && peutEnCours(f)) return qEnCours(f);
    var fmt = l.indexOf(it.fmt) >= 0 ? it.fmt : l[Math.floor(Math.random() * l.length)];
    if (fmt === 'sur') return qSur(f);
    if (fmt === 'quand') return qQuand(f, it.dur);
    return qQuoi(f, it.dur);
  }
  function qcm(f) { var l = f ? formats(f) : []; return l.length ? l[Math.floor(Math.random() * l.length)] : 'ouverte'; }
  function item(f, plus) {
    var c = P.cards[f.id], b = c ? c.b : 0, fmt;
    if (b >= 4) fmt = 'ouverte';
    else if (b >= 1 && Math.random() < 0.3 && peutEnCours(f)) fmt = 'encours';
    else fmt = qcm(f);
    var it = { id: f.id, fmt: fmt, dur: b >= 2 };
    if (plus) for (var k in plus) it[k] = plus[k];
    return it;
  }
  function composer(dus, neufs) {
    var rev = melange(dus.slice()).map(function (f) { return item(f); }), seq = [], i;
    for (i = 0; i < neufs.length; i++) {
      seq.push({ id: neufs[i].id, fmt: 'decouverte' });
      if (i > 0) seq.push(item(neufs[i - 1]));
      if (rev.length) seq.push(rev.shift());
    }
    if (neufs.length) { seq = seq.concat(rev.splice(0, 2)); seq.push(item(neufs[neufs.length - 1])); }
    return seq.concat(rev);
  }

  /* ---------- état de l'interface ---------- */
  var S = { ses: null, frise: null, choix: null, oral: null, tirage: null, msg: null, raz: false, haut: false, fiches: { pack: null, q: '', st: '' } };
  var chrono = { id: 0, fin: 0, dur: 0, auto: 0 };

  function lancer(kind, items, opt) {
    if (!items.length) return;
    S.choix = null;
    S.ses = { kind: kind, items: items, i: 0, ok: 0, n: 0, rates: [], score: 0, serie: 0, q: null, rep: null, opt: opt || {}, fini: false, reste: 1, tm: Date.now() };
    suivante();
  }
  function suivante() {
    var s = S.ses; arreterChrono();
    while (s.i < s.items.length && !FACTS[s.items[s.i].id]) s.i++;
    if (s.i >= s.items.length) return debrief();
    s.q = question(FACTS[s.items[s.i].id], s.items[s.i]); s.rep = null; s.auto = false; s.frais = true;
    S.haut = true; rendre();
    if (s.kind === 'blitz') demarrerChrono();
  }
  function demarrerChrono() {
    chrono.dur = (+P.set.blitz || 15) * 1000; chrono.fin = Date.now() + chrono.dur;
    chrono.id = setInterval(battre, 100); battre();
  }
  function battre() {
    var s = S.ses; if (!s || s.fini) return arreterChrono();
    var r = Math.max(0, chrono.fin - Date.now()); s.reste = r / chrono.dur;
    var el = document.getElementById('chrono'); if (el) el.textContent = Math.ceil(r / 1000) + ' s';
    var b = document.getElementById('chrono-b'); if (b) b.style.width = (100 * s.reste).toFixed(1) + '%';
    if (r <= 0) repondre(-1);
  }
  function arreterChrono() {
    if (chrono.id) { clearInterval(chrono.id); chrono.id = 0; }
    if (chrono.auto) { clearTimeout(chrono.auto); chrono.auto = 0; }
  }
  function noter(it, res) {
    var s = S.ses, d = auj();
    var c = P.cards[it.id] ? clone(P.cards[it.id]) : { b: 0, due: 0, n: 0, ok: 0, t: 0 };
    var jour = P.days[d] ? clone(P.days[d]) : { n: 0, ok: 0, neu: 0 };
    var libre = s.kind === 'blitz';
    jour.n++; if (res === 'ok') jour.ok++;
    var top = Date.now(); jour.ms = (jour.ms || 0) + Math.min(120000, Math.max(0, top - (s.tm || top))); s.tm = top;
    if (!c.b && !libre) jour.neu = (jour.neu || 0) + 1;
    P.days[d] = jour;
    c.n++; if (res === 'ok') c.ok++;
    if (libre) { if (res === 'ko' && c.b) { c.b = 1; c.due = d; } }
    else if (s.kind === 'diag') { if (res === 'ok') { c.b = 3; c.due = d + IV[3]; } else { c.b = 1; c.due = d; } }
    else if (it.retry) { if (res === 'ok') { c.b = Math.max(1, c.b); c.due = d + 1; } else { c.b = 1; c.due = d; } }
    else if (res === 'ok') { c.b = Math.min(6, c.b + 1); c.due = d + IV[c.b]; }
    else if (res === 'mid') { c.b = Math.max(1, c.b); c.due = d + 1; }
    else { c.b = 1; c.due = d; }
    c.t = Date.now(); P.cards[it.id] = c;
    commit();
  }
  function rater(it) {
    var s = S.ses;
    if (s.rates.indexOf(it.id) < 0) s.rates.push(it.id);
    if (s.kind === 'jour' || s.kind === 'avance' || s.kind === 'erreurs') {
      var deja = it.essais || 0;
      if (deja < 2) s.items.push({ id: it.id, fmt: it.fmt === 'ouverte' ? 'ouverte' : qcm(FACTS[it.id]), dur: false, retry: true, essais: deja + 1 });
    }
  }
  function repondre(i) {
    var s = S.ses; if (!s || s.fini || s.rep !== null || !s.q || !s.q.opts) return;
    arreterChrono();
    var it = s.items[s.i], bon = i >= 0 && !!s.q.opts[i] && s.q.opts[i].ok;
    s.rep = i; s.n++;
    noter(it, bon ? 'ok' : 'ko');
    if (bon) {
      s.ok++; s.serie++;
      if (s.kind === 'blitz') s.score += 100 + Math.round(50 * s.reste) + Math.min(50, 10 * (s.serie - 1));
    } else {
      s.serie = 0;
      if (s.kind === 'blitz' && i >= 0) s.score = Math.max(0, s.score - 30);
      rater(it);
    }
    s.auto = bon && (s.kind === 'blitz' || P.set.auto !== 0);
    rendre();
    if (s.auto) chrono.auto = setTimeout(function () { chrono.auto = 0; avancer(); }, s.kind === 'blitz' ? 700 : 1600);
  }
  function autoEval(res) {
    var s = S.ses; if (!s || s.rep !== 'vu') return;
    var it = s.items[s.i];
    s.n++; noter(it, res);
    if (res === 'ok') s.ok++; else if (res === 'ko') rater(it);
    s.i++; suivante();
  }
  function avancer() {
    var s = S.ses; if (!s || s.fini) return;
    if (s.q.fmt !== 'decouverte' && (s.rep === null || s.rep === 'vu')) return;
    s.i++; suivante();
  }
  function debrief() {
    var s = S.ses; arreterChrono(); s.fini = true;
    if (s.kind === 'blitz') {
      var k = 'blitz:' + (s.opt.pack || 'tout');
      if (s.score > (P.best[k] || 0)) { P.best[k] = s.score; s.record = true; commit(); }
    }
    if (s.kind === 'diag') { P.diag = Date.now(); commit(); }
    S.haut = true; rendre();
  }
  function fermer() { arreterChrono(); S.ses = null; S.frise = null; S.choix = null; }

  /* ---------- fragments ---------- */
  function libStatut(f) { return f.sl || (f.st === 'cours' ? 'En cours' : f.st === 'fragile' ? 'Trêve fragile' : 'Terminé'); }
  function pilule(f) {
    if (!f.st || (f.st === 'fin' && !(pack(f.pack) || {}).statuts)) return '';
    return ' <span class="pill ' + esc(f.st) + '">' + esc(libStatut(f)) + '</span>';
  }
  function signale(id) { return !!(P.flags[id] && P.flags[id].on); }
  function lienSignalement(f) {
    var p = pack(f.pack);
    return 'https://github.com/' + DEPOT + '/issues/new?template=erreur-fiche.yml&title=' + encodeURIComponent('Erreur : ' + f.t) +
      '&fiche=' + encodeURIComponent(f.id + ' : ' + f.t + (p ? ' (' + p.titre + ')' : ''));
  }
  function boutonFlag(f) {
    return '<a class="lien" data-a="flag" data-lien data-id="' + esc(f.id) + '" href="' + esc(lienSignalement(f)) + '" target="_blank" rel="noopener">Signaler une erreur</a>';
  }
  function ficheHtml(f, p, o) {
    o = o || {};
    var h = o.sansTitre ? '' : '<p class="fait-t">' + esc(f.t) + '</p>';
    if (f.d && !o.sansDate) h += '<p class="fait-d">' + esc(f.d.charAt(0).toUpperCase() + f.d.slice(1)) + pilule(f) + '</p>';
    if (aQcm(f)) {
      if (!o.sansQ) h += '<p class="fait-q">' + esc(f.q) + '</p>';
      if (!o.sansA) h += '<p class="fait-a">' + esc(f.a) + '</p>';
    }
    h += '<p class="fait-r">' + esc(f.r) + '</p>';
    if (f.o) h += '<div class="oral-bloc"><small>À placer à l\'oral</small>' + esc(f.o) + '</div>';
    if (f.maj && p && p.maj) h += '<p class="note espace">Situation vérifiée le ' + dateFr(p.maj) + '.</p>';
    return h;
  }
  function record(prefixe, pid) { return P.best[prefixe + ':' + (pid || 'tout')] || 0; }
  function meilleur(prefixe) { var m = 0, k; for (k in P.best) if (k.indexOf(prefixe + ':') === 0 && P.best[k] > m) m = P.best[k]; return m; }

  /* ---------- accueil ---------- */
  function phraseSeance(nd, nn) {
    var a = [];
    if (nd) a.push(pluriel(nd, 'révision', 'révisions'));
    if (nn) a.push(pluriel(nn, 'nouveauté', 'nouveautés'));
    return a.join(' et ');
  }
  function vusEtAcquis() {
    var r = { vus: 0, acquis: 0 };
    tous().forEach(function (f) { var c = P.cards[f.id]; if (c && c.b) { r.vus++; if (c.b >= SUIVI.PALIER) r.acquis++; } });
    return r;
  }
  function prevoir() {
    var c = vusEtAcquis();
    return SUIVI.prevision({ total: tous().length, vus: c.vus, acquis: c.acquis, jours: P.days, auj: auj(), exam: P.set.exam ? jourIso(P.set.exam) : null, regle: +P.set.neu || 10 });
  }
  function rythmeTexte(p) {
    var n = Math.round(p.rythme);
    if (p.source === 'regle') return 'À raison de ' + pluriel(n, 'nouveauté', 'nouveautés') + ' par jour';
    return 'À ton rythme actuel (' + (n < 1 ? 'moins d\'une nouveauté' : pluriel(n, 'nouveauté', 'nouveautés')) + ' par jour)';
  }
  function avantOral(marge) { return marge === 0 ? 'le jour même de l\'oral' : marge === 1 ? 'la veille de l\'oral' : marge + ' jours avant l\'oral'; }
  /* La prévision en clair : un titre, un ton (ok, attn ou rien), une phrase complète, une phrase courte pour l'accueil, et le rythme à proposer. */
  function lirePrevision(p) {
    var r = { titre: '', ton: '', texte: '', court: '', bouton: 0 }, regle = +P.set.neu || 10;
    var vu = p.jourVu !== null ? jourTexte(p.jourVu) : '', acq = p.jourAcquis !== null ? jourTexte(p.jourAcquis) : '';
    if (p.etat === 'fini') {
      r.titre = 'Programme bouclé'; r.ton = 'ok';
      r.texte = 'Les ' + p.total + ' repères sont acquis. Il reste à les entretenir\u00a0: la séance du jour s\'en charge.';
    } else if (p.etat === 'passe') {
      r.titre = 'Oral passé';
      r.texte = 'La date de l\'oral est passée. Change-la dans les réglages pour préparer le prochain.';
    } else if (p.etat === 'vu') {
      r.titre = 'Programme vu'; r.ton = 'ok';
      r.texte = 'Tout le programme est vu. Il reste ' + pluriel(p.total - p.acquis, 'repère', 'repères') + ' à consolider\u00a0: la séance du jour les ramène au bon moment.';
      r.court = 'Tout le programme est vu\u00a0: il reste à consolider.';
    } else if (p.etat !== 'retard') {
      if (p.jourVu === null) {
        r.texte = 'Aucune nouveauté ces derniers jours\u00a0: ' + pluriel(p.neufs, 'repère reste', 'repères restent') + ' à découvrir.';
      } else {
        r.texte = rythmeTexte(p) + ', tout le programme est vu le ' + vu;
        r.texte += p.reste === null ? '. Indique la date de l\'oral pour savoir si tu es dans les temps.' : ' et peut être acquis vers le ' + acq + ', ' + avantOral(p.marge) + '.';
        r.court = (p.source === 'regle' ? 'À ' + pluriel(Math.round(p.rythme), 'nouveauté', 'nouveautés') + ' par jour' : 'À ton rythme actuel') + ', programme vu le ' + vu + '.';
      }
      if (p.etat === 'avance') { r.titre = 'Dans les temps'; r.ton = 'ok'; }
    } else {
      r.titre = 'En retard sur le plan'; r.ton = 'attn';
      if (p.reste === 0) r.texte = 'L\'oral est aujourd\'hui et ' + pluriel(p.neufs, 'repère n\'a pas été vu', 'repères n\'ont pas été vus') + '. Révise ce que tu connais déjà.';
      else {
        r.texte = p.manque > 0 ? rythmeTexte(p) + ', ' + pluriel(p.manque, 'repère restera', 'repères resteront') + ' à découvrir le jour de l\'oral.'
          : rythmeTexte(p) + ', tout est vu le ' + vu + ', trop tard pour être consolidé avant l\'oral.';
        r.court = p.manque > 0 ? 'À ce rythme, ' + pluriel(p.manque, 'repère manquera', 'repères manqueront') + ' le jour de l\'oral.' : 'À ce rythme, les derniers repères arrivent trop tard.';
        if (p.conseil === null) r.texte += ' Même à 20 nouveautés par jour, tout le programme ne tient plus avant l\'oral\u00a0: commence par les thèmes les plus probables.';
        else if (p.conseil > regle) { r.texte += ' Passe à ' + p.conseil + ' nouveautés par jour pour tout voir une semaine avant.'; r.bouton = p.conseil; }
        else r.texte += ' Tiens ' + pluriel(regle, 'nouveauté', 'nouveautés') + ' par jour, tous les jours, pour tout voir une semaine avant.';
      }
    }
    return r;
  }
  function titreAccueil(jr) { return jr === null ? 'Cap sur l\'oral' : jr > 0 ? 'Oral dans ' + pluriel(jr, 'jour', 'jours') : jr === 0 ? 'Oral aujourd\'hui' : 'Oral passé'; }
  /* Après un changement de date depuis l'accueil : on corrige le titre et la piste sans redessiner la page (le champ garde la main). */
  function majEcheance() {
    var jr = joursRestants(), t = document.querySelector('#app h1.page-t'), p = document.querySelector('#app .piste'), n = p ? p.querySelector('.numero') : null;
    if (page() !== 'accueil' || S.ses || S.frise || S.choix || !t) return;
    t.textContent = titreAccueil(jr);
    if (n) n.textContent = jr !== null && jr > 0 ? 'J-' + jr : '';
    if (p) p.classList.toggle('sans-num', !(jr !== null && jr > 0));
  }
  function accueil() {
    var b = bilan(tous()), plan = planJour(), jr = joursRestants(), premiere = !Object.keys(P.cards).length && !P.diag;
    var pa = b.n ? 100 * b.acquis / b.n : 0, pc = b.n ? 100 * (b.acquis + b.cours) / b.n : 0;
    var h = '<section class="cols vaste"><div class="pile"><div class="bloc"><h1 class="page-t">' + titreAccueil(jr) + '</h1>';
    h += '<div class="piste espace' + (jr !== null && jr > 0 ? '' : ' sans-num') + '" role="img" aria-label="' + b.acquis + ' repères acquis, ' + b.cours + ' en cours, ' + b.neuf + ' à découvrir">' +
      '<span class="encours" style="width:' + pc.toFixed(1) + '%"></span><span class="acquis" style="width:' + pa.toFixed(1) + '%"></span>' +
      '<span class="seuil"></span><span class="axe"></span><span class="numero">' + (jr !== null && jr > 0 ? 'J-' + jr : '') + '</span></div>';
    h += '<div class="legende"><span class="l-acquis">' + b.acquis + ' acquis</span><span class="l-encours">' + b.cours + ' en cours</span><span>' + b.neuf + ' à découvrir</span></div>';
    if (!premiere) {
      var lp = lirePrevision(prevoir());
      if (lp.court) h += '<p class="cap-ligne' + (lp.ton === 'attn' ? ' attn' : '') + '"><a href="#carnet">' + esc(lp.court) + '</a></p>';
      if (!P.set.exam) h += '<div class="ligne seule"><label for="a-exam">Date de l\'oral</label><input id="a-exam" type="date" data-set="exam" value=""></div>';
    }
    h += '</div>';

    var nd = plan.dus.length, nn = plan.neufs.length;
    if (premiere) {
      h += '<div class="bloc seance"><h2>Avant le décollage</h2><p class="chiffres">Dix minutes par jour : chaque repère revient juste avant que tu l\'oublies, de plus en plus rarement.</p>' +
        '<div class="ligne"><label for="a-exam">Date de l\'oral</label><input id="a-exam" type="date" data-set="exam" value="' + esc(P.set.exam || '') + '"></div>' +
        '<div class="ligne"><label for="a-neu">Nouveautés par jour</label><select id="a-neu" data-set="neu">' + options([5, 8, 10, 15, 20], P.set.neu) + '</select></div>' +
        '<button class="btn primaire large espace" data-a="jour">Lancer la première séance</button>' +
        '<p class="note espace">Tu connais déjà une partie du programme ? <button class="lien" data-a="diag">Passe le test de positionnement</button> pour ne pas tout revoir.</p></div>';
    } else {
      h += '<div class="bloc seance"><h2>Séance du jour</h2>';
      if (nd + nn > 0) {
        h += '<p class="chiffres">' + phraseSeance(nd, nn) + ', ' + Math.max(1, Math.ceil((nd * 20 + nn * 45) / 60)) + ' min environ.</p>';
        h += '<button class="btn primaire large" data-a="jour">Lancer la séance</button>';
        if (plan.attente) h += '<p class="note espace">' + pluriel(plan.attente, 'autre révision attend', 'autres révisions attendent') + ' : relance une séance ensuite.</p>';
      } else {
        var reste = nouveaux(1).length;
        h += '<p class="chiffres">Séance du jour terminée.' + (reste ? '' : ' Tous les repères sont découverts.') + '</p>';
        if (reste) h += '<button class="btn large" data-a="avance">Prendre de l\'avance : ' + (+P.set.neu || 10) + ' nouveautés</button>';
      }
      h += '</div>';
    }

    h += '<div class="bloc"><h2>Check-list de maîtrise</h2>';
    parTheme().forEach(function (t) {
      h += '<p class="groupe">' + esc(t.nom) + '</p>';
      t.packs.forEach(function (p) {
        h += '<button class="check" data-a="fiches" data-p="' + esc(p.id) + '"><span class="nom">' + esc(p.titre) + '</span><span class="pts"></span><span class="val">' + bilan(p.faits).pct + ' %</span></button>';
      });
    });
    h += '</div></div>';

    var rb = meilleur('blitz'), rf = meilleur('frise'), dernier = P.oraux.length ? P.oraux[P.oraux.length - 1] : null;
    h += '<div class="pile"><div class="pile serre"><h2 class="titre2">Entraînements</h2>';
    h += '<button class="strip" data-a="choix" data-m="blitz"><b>Blitz chrono</b><span class="desc">20 questions, ' + (+P.set.blitz || 15) + ' secondes chacune</span><span class="meta">' + (rb ? 'Record ' + rb : '') + '</span></button>';
    h += '<button class="strip" data-a="choix" data-m="frise"><b>Frise</b><span class="desc">Remets cinq événements dans l\'ordre</span><span class="meta">' + (rf ? 'Record ' + rf + ' / 15' : '') + '</span></button>';
    h += '<a class="strip" href="#oral"><b>Grand oral</b><span class="desc">Deux sujets au choix, ' + P.set.prep + ' min de préparation, exposé, questions</span><span class="meta">' + (dernier ? 'Dernier ' + dernier.total + ' / 20' : '') + '</span></a>';
    h += '</div>';

    var sr = serie(), d = auj(), sept = [], maxJ = 0, i;
    for (i = 6; i >= 0; i--) {
      var x = P.days[d - i], n = x ? x.n || 0 : 0;
      if (n > maxJ) maxJ = n;
      sept.push({ v: n, bulle: n ? pluriel(n, 'réponse', 'réponses') + ', ' + pluriel(x.ok || 0, 'juste', 'justes') : 'Repos', lib: i === 0 ? 'Aujourd\'hui' : jourLong(d - i), x: initiale(d - i), cl: i === 0 ? 'auj' : '' });
    }
    h += '<div class="bloc"><h2>Carnet de vol</h2>';
    if (maxJ) {
      h += '<p class="note">' + (sr ? 'Série en cours : ' + pluriel(sr, 'jour', 'jours') + '.' : 'Série interrompue.') + ' Réponses des sept derniers jours :</p>' +
        G.barres(sept, { max: SUIVI.plafond(maxJ), aria: 'Réponses par jour sur les sept derniers jours', h: 72, focus: 6 }) + '<p class="espace"><a href="#carnet">Ouvrir le carnet</a></p>';
    } else if (Object.keys(P.days).length) h += '<p class="note">Aucune séance depuis une semaine. <a href="#carnet">Ouvrir le carnet</a></p>';
    else h += '<p class="note">Aucune séance pour l\'instant : le carnet se remplit dès la première.</p>';
    return h + '</div></div></section>';
  }

  /* ---------- séance ---------- */
  function barre() {
    var s = S.ses, n = s.items.length;
    var h = '<div class="q-top"><button class="lien" data-a="quitter">Quitter</button>' +
      '<div class="jauge" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + s.i + '" aria-label="Avancement"><i style="width:' + Math.round(100 * s.i / n) + '%"></i></div>' +
      '<span class="compte">' + (s.i + 1) + ' / ' + n + '</span>';
    if (s.kind === 'blitz') h += '<span class="chrono" id="chrono"></span>';
    h += '</div>';
    if (s.kind === 'blitz') h += '<div class="chrono-b" id="chrono-b" style="width:100%"></div>';
    return h;
  }
  function feuille(cl, corps) {
    return '<div class="feuille' + (cl ? ' ' + cl : '') + '" id="retour" data-a="lire" aria-live="polite">' + corps + '</div>';
  }
  function vueQuestion() {
    var s = S.ses, q = s.q, f = FACTS[q.id], p = pack(f.pack);
    var h = '<section class="ecran-seance' + (s.frais ? ' entre' : '') + '">' + barre();
    s.frais = false;
    h += '<p class="contexte">' + esc(p.titre) + (s.kind === 'blitz' ? ', ' + s.score + ' points' : '') + '</p>';
    if (q.fmt === 'decouverte') {
      return h + '<p class="petit">Nouveau repère</p><h1 class="enonce">' + esc(f.t) + '</h1>' + ficheHtml(f, p, { sansTitre: true }) +
        '<div class="bas"><button class="btn primaire large" data-a="suite">Compris</button></div></section>';
    }
    h += '<p class="petit">' + esc(q.petit) + '</p><h1 class="enonce">' + esc(q.grand) + '</h1><div class="bas">';
    if (q.opts) {
      h += '<div class="opts' + (q.deux ? ' deux' : '') + '">';
      q.opts.forEach(function (o, i) {
        var cl = 'opt';
        if (s.rep !== null) { if (o.ok) cl += ' juste'; else if (i === s.rep) cl += ' faux'; }
        h += '<button class="' + cl + '" data-a="rep" data-i="' + i + '"' + (s.rep !== null ? ' disabled' : '') + '><span class="k">' + (i + 1) + '</span><span>' + esc(o.t) + '</span></button>';
      });
      h += '</div></div></section>';
      if (s.rep === null) return h;
      var bon = s.rep >= 0 && q.opts[s.rep].ok;
      if (bon && s.kind === 'blitz') return h;
      var juste = q.opts.filter(function (o) { return o.ok; })[0];
      return h + feuille(bon ? 'ok' : 'ko',
        '<p class="verdict ' + (bon ? 'ok' : 'ko') + '">' + (bon ? 'Juste.' : s.rep < 0 ? 'Temps écoulé.' : 'Raté.') + '</p>' +
        (bon || !juste ? '' : '<p class="bonne">Bonne réponse : <b>' + esc(juste.t) + '</b></p>') +
        ficheHtml(f, p, q.fmt === 'sur' ? { sansQ: true, sansA: true } : null) +
        '<div class="actions"><button class="btn primaire' + (s.auto ? ' rebours' : '') + '" data-a="suite">Continuer</button>' + boutonFlag(f) + '</div>');
    }
    if (s.rep === null) return h + '<button class="btn primaire large" data-a="voir">Afficher le corrigé</button></div></section>';
    return h + '</div></section>' + feuille('', ficheHtml(f, p, { sansQ: true }) +
      '<p class="note espace">Note-toi sans indulgence : « Su » veut dire ' + (aQcm(f) ? 'la bonne réponse, expliquée, sans hésiter' : 'date, faits et portée, sans hésiter') + '.</p>' +
      '<div class="actions"><div class="auto"><button class="btn ko" data-a="auto" data-r="ko">À revoir</button><button class="btn mid" data-a="auto" data-r="mid">Presque</button><button class="btn ok" data-a="auto" data-r="ok">Su</button></div></div>' + boutonFlag(f));
  }
  function vueDebrief() {
    var s = S.ses, h = '<section class="pile"><h1 class="page-t">Débriefing</h1><div class="bloc">';
    if (s.kind === 'blitz') {
      h += '<p class="score">' + s.score + ' <small>points</small></p><p class="espace">' + pluriel(s.ok, 'bonne réponse', 'bonnes réponses') + ' sur ' + s.n + '.' + (s.record ? ' Nouveau record.' : '') + '</p>';
    } else {
      h += '<p class="score">' + s.ok + ' <small>/ ' + s.n + '</small></p>';
      if (s.kind === 'diag') h += '<p class="espace">Les repères réussis reviendront dans quatre jours ; les autres passent en tête de tes prochaines séances.</p>';
      else h += '<p class="espace">' + (s.rates.length ? pluriel(s.rates.length, 'repère à retravailler : il revient', 'repères à retravailler : ils reviennent') + ' dès la prochaine séance.' : 'Sans faute. Les intervalles de révision s\'allongent.') + '</p>';
    }
    h += '</div>';
    if (s.rates.length) {
      h += '<div class="bloc"><h2>À relire</h2><ul class="rates">' + s.rates.map(function (id) {
        var f = FACTS[id]; return '<li><span class="d">' + esc(f.d || f.g || '') + '</span><span>' + esc(f.t) + '</span></li>';
      }).join('') + '</ul></div>';
    }
    h += '<div class="rangee"><button class="btn primaire" data-a="accueil">Revenir à l\'accueil</button>';
    if (s.kind === 'blitz') h += '<button class="btn" data-a="rejouer">Rejouer</button>';
    else if (s.rates.length) h += '<button class="btn" data-a="erreurs">Revoir les erreurs</button>';
    return h + '</div></section>';
  }

  /* ---------- choix du pack, blitz, frise ---------- */
  function vueChoix() {
    var m = S.choix.m, blitz = m === 'blitz';
    var h = '<section class="pile"><div class="q-top"><button class="lien" data-a="quitter">Retour</button></div><h1 class="page-t">' + (blitz ? 'Blitz chrono' : 'Frise') + '</h1>';
    h += '<p class="note">' + (blitz ? '20 questions, ' + (+P.set.blitz || 15) + ' secondes chacune. Une bonne réponse rapporte jusqu\'à 150 points, plus un bonus de série ; une erreur en coûte 30.' : 'Trois frises de cinq événements à remettre dans l\'ordre.') + '</p>';
    var total = 0;
    parTheme().forEach(function (t) {
      var lignes = '';
      t.packs.forEach(function (p) {
        var n = jouables(p.faits, blitz).length, r = record(m, p.id);
        if (blitz ? !n : p.ny < 5) return;
        total += n;
        lignes += '<button class="strip" data-a="go" data-p="' + esc(p.id) + '"><b>' + esc(p.titre) + '</b><span class="desc">' + pluriel(n, 'repère', 'repères') + '</span><span class="meta">' + (r ? 'Record ' + r + (blitz ? '' : ' / 15') : '') + '</span></button>';
      });
      if (lignes) h += '<p class="groupe">' + esc(t.nom) + '</p>' + lignes;
    });
    var rt = record(m, '');
    h += '<p class="groupe">Tous les thèmes</p><button class="strip" data-a="go" data-p=""><b>Tout mélanger</b><span class="desc">' + pluriel(total, 'repère', 'repères') + '</span><span class="meta">' + (rt ? 'Record ' + rt + (blitz ? '' : ' / 15') : '') + '</span></button>';
    return h + '</section>';
  }
  function jouables(faits, blitz) {
    return faits.filter(function (f) { return blitz ? formats(f).length > 0 : aDate(f) && pack(f.pack).ny >= 5; });
  }
  function lancerBlitz(pid) {
    var items = melange(jouables(faitsDe(pid), true)).slice(0, 20).map(function (f) {
      var c = P.cards[f.id];
      return { id: f.id, fmt: (peutEnCours(f) && Math.random() < 0.2) ? 'encours' : qcm(f), dur: !!(c && c.b >= 2) };
    });
    lancer('blitz', items, { pack: pid || '' });
  }
  function friseNouvelle(pid) { S.choix = null; S.frise = { pack: pid || '', manche: 0, bons: 0, total: 0, cur: null, fini: false, record: false }; friseManche(); }
  function friseManche() {
    var g = S.frise, src = melange(jouables(faitsDe(g.pack), false)), vus = {}, sel = [];
    for (var i = 0; i < src.length && sel.length < 5; i++) { var y = Math.floor(src[i].y); if (!vus[y]) { vus[y] = 1; sel.push(src[i]); } }
    g.cur = { items: sel, ordre: [], valide: false, score: 0 };
    S.haut = true; rendre();
  }
  function vueFrise() {
    var g = S.frise, c = g.cur, h = '<section>';
    if (g.fini) {
      return '<section class="pile"><h1 class="page-t">Débriefing</h1><div class="bloc"><p class="score">' + g.bons + ' <small>/ ' + g.total + '</small></p><p class="espace">' +
        (g.record ? 'Nouveau record.' : 'Événements placés au bon rang sur trois frises.') + '</p></div><div class="rangee"><button class="btn primaire" data-a="accueil">Revenir à l\'accueil</button><button class="btn" data-a="refrise">Rejouer</button></div></section>';
    }
    h += '<div class="q-top"><button class="lien" data-a="quitter">Quitter</button><div class="jauge"><i style="width:' + Math.round(100 * g.manche / 3) + '%"></i></div><span class="compte">Frise ' + (g.manche + 1) + ' / 3</span></div>';
    if (!c.valide) {
      h += '<p class="petit">Touche les événements du plus ancien au plus récent.</p><div class="frise espace">';
      c.items.forEach(function (f) {
        var r = c.ordre.indexOf(f.id);
        h += '<button class="frise-item' + (r >= 0 ? ' pose' : '') + '" data-a="frise-tap" data-id="' + esc(f.id) + '"><span class="rang">' + (r >= 0 ? r + 1 : '') + '</span><span>' + esc(f.t) + '</span></button>';
      });
      h += '</div><button class="btn primaire large espace" data-a="frise-ok"' + (c.ordre.length < c.items.length ? ' disabled' : '') + '>Valider l\'ordre</button>';
    } else {
      var bon = c.items.slice().sort(function (a, b) { return a.y - b.y; });
      h += '<p class="petit">' + c.score + ' sur ' + bon.length + ' au bon rang. L\'ordre exact :</p><div class="frise espace">';
      bon.forEach(function (f, i) {
        h += '<div class="frise-item ' + (c.ordre[i] === f.id ? 'juste' : 'faux') + '"><span class="rang">' + (i + 1) + '</span><span>' + esc(f.t) + '</span><span class="quand">' + esc(f.d) + '</span></div>';
      });
      h += '</div><button class="btn primaire large espace" data-a="frise-suite">' + (g.manche >= 2 ? 'Voir le résultat' : 'Frise suivante') + '</button>';
    }
    return h + '</section>';
  }

  /* ---------- fiches ---------- */
  function listeFiches(p) {
    var q = norm(S.fiches.q), st = S.fiches.st, h = '', g = null, n = 0, dates = p.faits.some(aDate);
    p.faits.forEach(function (f) {
      if (st && f.st !== st) return;
      if (q && norm([f.t, f.d, f.r, f.o, f.g, f.q, f.a].join(' ')).indexOf(q) < 0) return;
      if (f.g !== g) { g = f.g; if (g) h += '<p class="groupe">' + esc(g) + '</p>'; }
      n++;
      var e = etat(f);
      h += '<details class="fiche' + (dates ? '' : ' sd') + '"><summary>' + (f.d ? '<span class="d">' + esc(f.d) + '</span>' : '') + '<span class="t' + (dates && !f.d ? ' nd' : '') + '">' + esc(f.t) + pilule(f) + '</span><span class="etat ' + e + '" title="' + (e === 'acquis' ? 'Acquis' : e === 'cours' ? 'En cours d\'apprentissage' : 'À découvrir') + '"></span></summary><div class="corps">' +
        ficheHtml(f, p, { sansTitre: true, sansDate: true }) + boutonFlag(f) + '</div></details>';
    });
    return n ? h : '<p class="note">Aucune fiche ne correspond.</p>';
  }
  function fiches() {
    var st = S.fiches;
    if (!st.pack || !pack(st.pack)) st.pack = DATA.packs[0].id;
    var p = pack(st.pack), themes = parTheme(), cur = themes[0], h = '<section class="pile"><h1 class="page-t">Fiches</h1>';
    themes.forEach(function (t) { if (t.packs.indexOf(p) >= 0) cur = t; });
    if (themes.length > 1) {
      h += '<div class="onglets themes">';
      themes.forEach(function (t) { h += '<button data-a="fpack" data-p="' + esc(t.packs[0].id) + '" aria-pressed="' + (t === cur) + '">' + esc(t.nom) + '</button>'; });
      h += '</div>';
    }
    if (cur.packs.length > 1) {
      h += '<div class="onglets">';
      cur.packs.forEach(function (x) { h += '<button data-a="fpack" data-p="' + esc(x.id) + '" aria-pressed="' + (x.id === p.id) + '">' + esc(x.court || x.titre) + '</button>'; });
      h += '</div>';
    }
    h += '<p class="note">' + esc(p.sous) + (p.maj ? '. Mise à jour du ' + dateFr(p.maj) + '.' : '.') + '</p>';
    h += '<input class="champ" id="rech" type="search" placeholder="Chercher une date, un pays, un nom" value="' + esc(st.q) + '" aria-label="Chercher dans les fiches">';
    if (p.statuts) {
      h += '<div class="onglets">';
      [['', 'Tous'], ['cours', 'En cours'], ['fragile', 'Trêves fragiles'], ['fin', 'Terminés']].forEach(function (o) {
        h += '<button data-a="fst" data-s="' + o[0] + '" aria-pressed="' + (st.st === o[0]) + '">' + o[1] + '</button>';
      });
      h += '</div>';
    }
    h += '<div class="bloc" id="liste">' + listeFiches(p) + '</div>';
    if (p.sources && p.sources.length) {
      h += '<div class="sources"><p>Sources de la mise à jour :</p><ul>' + p.sources.map(function (s) {
        return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + '</a></li>';
      }).join('') + '</ul></div>';
    }
    return h + '</section>';
  }

  /* ---------- grand oral ---------- */
  var oralT = 0, audio = null;
  var ETAPES = ['prep', 'expo', 'quest'];
  var NOMS = { prep: 'Préparation', expo: 'Exposé', quest: 'Questions du jury' };
  function tirer() {
    var l = melange((DATA.sujets || []).slice()), faits = {}, avant = {}, i;
    if (!l.length) return [];
    P.oraux.forEach(function (o) { if (o.s) faits[o.s] = 1; });
    (S.tirage || []).forEach(function (s) { avant[s.id] = 1; });
    function rang(s) { return (avant[s.id] ? 2 : 0) + (faits[s.id] ? 1 : 0); }
    l.sort(function (a, b) { return rang(a) - rang(b); });
    var un = l[0], deux = null;
    for (i = 1; i < l.length; i++) if (l[i].dom !== un.dom && rang(l[i]) <= rang(un) + 1) { deux = l[i]; break; }
    if (!deux && l.length > 1) deux = l[1];
    return deux ? [un, deux] : [un];
  }
  function questionsJury(sujet) {
    var jury = DATA.jury || [], out = [], i, files = jury.map(function (j) { return melange(j.q.slice()); });
    if (sujet && sujet.relances) sujet.relances.forEach(function (q, k) { out.push({ role: jury.length ? jury[k % jury.length].role : 'Jury', q: q }); });
    for (i = 0; i < 12 && jury.length; i++) {
      var k2 = i % jury.length;
      if (files[k2].length) out.push({ role: jury[k2].role, q: files[k2].shift() });
    }
    return out;
  }
  function dureeEtape(e) { return (+P.set[e] || 10) * 60000; }
  function oralDemarrer(sujet, titre) {
    S.oral = { sujet: sujet, titre: titre, etape: 'prep', total: dureeEtape('prep'), fin: Date.now() + dureeEtape('prep'), pause: null, sonne: false,
      notes: [-1, -1, -1, -1], qi: 0, questions: questionsJury(sujet) };
    try { var AC = window.AudioContext || window.webkitAudioContext; if (AC && !audio) audio = new AC(); if (audio && audio.resume) audio.resume(); } catch (e) { audio = null; }
    if (oralT) clearInterval(oralT);
    oralT = setInterval(oralBattre, 250);
    S.haut = true; rendre();
  }
  function oralReste() { var o = S.oral; return o.pause !== null ? o.pause : o.fin - Date.now(); }
  function bip() {
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (!audio) return;
      [0, 0.35].forEach(function (dt) {
        var osc = audio.createOscillator(), g = audio.createGain();
        osc.frequency.value = 880; g.gain.value = 0.15;
        osc.connect(g); g.connect(audio.destination);
        osc.start(audio.currentTime + dt); osc.stop(audio.currentTime + dt + 0.22);
      });
    } catch (e) { /* son indisponible */ }
  }
  function oralBattre() {
    var o = S.oral;
    if (!o || o.etape === 'bilan') { if (oralT) { clearInterval(oralT); oralT = 0; } return; }
    var r = oralReste();
    if (r <= 0 && !o.sonne) { o.sonne = true; bip(); }
    var el = document.getElementById('minuteur'); if (!el) return;
    el.textContent = r >= 0 ? mmss(r) : '+' + mmss(-r);
    el.className = 'minuteur' + (r < 0 ? ' fini' : '');
    var ph = document.getElementById('phase'), frac = 1 - r / o.total, txt = '';
    if (r < 0) txt = 'Temps dépassé';
    else if (o.pause !== null) txt = 'En pause';
    else if (o.etape === 'prep') txt = r < 300000 ? 'Dernières minutes : écris ton accroche et ta conclusion' : '';
    else if (o.etape === 'expo') txt = frac < 0.1 ? 'Introduction : accroche, définitions, problématique, plan' : frac < 0.85 ? 'Développement' : 'Conclusion : réponse à la question, ouverture';
    else txt = 'Réponds en une minute, puis passe à la suivante';
    if (ph) ph.textContent = txt;
    var seg = document.querySelectorAll('#phases i');
    if (seg.length === 3) { seg[0].className = 'fait'; seg[1].className = frac >= 0.1 ? 'fait' : ''; seg[2].className = frac >= 0.85 ? 'fait' : ''; }
  }
  function oralTirage() {
    if (!S.tirage || !S.tirage.length) S.tirage = tirer();
    var l = S.tirage, h = '<section class="pile"><h1 class="page-t">Grand oral</h1>';
    if (S.msg) { h += '<p class="bravo">' + esc(S.msg) + '</p>'; S.msg = null; }
    var durees = P.set.prep + ' min de préparation, ' + P.set.expo + ' min d\'exposé, ' + P.set.quest + ' min de questions devant deux professeurs et un cadre militaire.';
    if (l.length) {
      h += '<div class="bloc"><h2>' + (l.length > 1 ? 'Deux sujets tirés : choisis-en un' : 'Sujet tiré') + '</h2><p class="note">' + durees + ' <a href="#reglages">Modifier</a></p>';
      l.forEach(function (s, i) {
        h += '<div class="tirage"><span class="pill">' + esc(s.dom) + '</span><p class="sujet">' + esc(s.titre) + '</p><button class="btn primaire" data-a="oral-go" data-i="' + i + '">Préparer ce sujet</button></div>';
      });
      h += '<button class="lien" data-a="oral-tirer">' + (l.length > 1 ? 'Tirer deux autres sujets' : 'Tirer un autre sujet') + '</button></div>';
    }
    h += '<div class="bloc"><h2>Sujet libre</h2><p class="note">Le jury peut poser n\'importe quoi : entre le sujet de ton choix. Il n\'aura pas de corrigé, mais les questions du jury et la grille restent les mêmes.</p>' +
      '<input class="champ espace" id="libre" type="text" maxlength="200" placeholder="Exemple : La mer, enjeu du XXIe siècle ?" aria-label="Sujet libre">' +
      '<p class="note erreur" id="libre-err" hidden>Écris d\'abord un sujet.</p><button class="btn espace" data-a="oral-libre">Préparer mon sujet</button></div>';
    if (P.oraux.length) {
      h += '<div class="bloc"><h2>Derniers oraux</h2><ul class="rates">' + P.oraux.slice(-5).reverse().map(function (o) {
        var d = new Date(o.t); return '<li><span class="d">' + d.getDate() + ' ' + MOIS[d.getMonth()] + '</span><span>' + esc(o.titre) + '</span><span class="quand"><b>' + o.total + '</b> / 20</span></li>';
      }).join('') + '</ul></div>';
    }
    return h + '</section>';
  }
  function oralChrono() {
    var o = S.oral, suite = o.etape === 'prep' ? 'Passer à l\'exposé' : o.etape === 'expo' ? 'Passer aux questions' : 'Terminer l\'oral';
    var h = '<section class="pile"><div><p class="note">' + NOMS[o.etape] + ', étape ' + (ETAPES.indexOf(o.etape) + 1) + ' sur 3</p><h1 class="sujet">' + esc(o.titre) + '</h1></div>';
    h += '<div class="bloc"><div class="minuteur" id="minuteur">' + mmss(Math.max(0, oralReste())) + '</div><p class="phase" id="phase"></p>';
    if (o.etape === 'expo') h += '<div class="phases" id="phases"><i style="flex:10"></i><i style="flex:75"></i><i style="flex:15"></i></div>';
    h += '<div class="rangee espace" style="justify-content:center"><button class="btn" data-a="oral-pause">' + (o.pause !== null ? 'Reprendre' : 'Pause') + '</button><button class="btn primaire" data-a="oral-suite">' + suite + '</button></div></div>';
    if (o.etape === 'prep') {
      h += '<div class="bloc"><h2>Méthode, dans l\'ordre</h2><ol class="methode">' + (DATA.methode || []).map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol></div>';
    }
    if (o.etape === 'quest') {
      var q = o.questions[o.qi];
      h += '<div class="bloc">' + (q ? '<p class="note">' + esc(q.role) + ', question ' + (o.qi + 1) + ' sur ' + o.questions.length + '</p><p class="sujet">' + esc(q.q) + '</p>' : '<p class="lecture">Le jury n\'a plus de questions.</p>') +
        (o.qi < o.questions.length - 1 ? '<button class="btn espace" data-a="oral-q">Question suivante</button>' : '') + '</div>';
    }
    return h + '<button class="lien" data-a="oral-stop">Abandonner cet oral</button></section>';
  }
  function oralBilan() {
    var o = S.oral, s = o.sujet, crit = DATA.criteres || [], total = 0, complet = true;
    o.notes.forEach(function (n) { if (n < 0) complet = false; else total += n; });
    var h = '<section class="pile"><div><p class="note">Débriefing</p><h1 class="sujet">' + esc(o.titre) + '</h1></div>';
    if (s) {
      h += '<div class="bloc corrige"><h2>Corrigé type</h2><h3>Problématique possible</h3><p class="lecture">' + esc(s.pb) + '</p>' +
        '<h3>Plan</h3><ol>' + s.plan.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
        '<h3>À mobiliser</h3><ul>' + s.refs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<h3>Pièges</h3><ul>' + s.pieges.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    } else {
      h += '<p class="alerte">Sujet libre : pas de corrigé enregistré. Note-toi sur la grille, puis demande un plan type à Claude si tu veux comparer.</p>';
    }
    h += '<div class="bloc"><h2>Ta note, critère par critère</h2><div class="grille">';
    crit.forEach(function (c, i) {
      h += '<div class="crit"><span>' + esc(c) + '</span><span class="notes" role="group" aria-label="' + esc(c) + '">';
      for (var n = 0; n <= 5; n++) h += '<button data-a="note" data-c="' + i + '" data-n="' + n + '" aria-pressed="' + (o.notes[i] === n) + '">' + n + '</button>';
      h += '</span></div>';
    });
    h += '</div><p class="espace"><b>' + (complet ? total + ' / 20' : 'Note chaque critère de 0 à 5') + '</b></p>' +
      '<button class="btn primaire espace" data-a="oral-save"' + (complet ? '' : ' disabled') + '>Enregistrer le débriefing</button></div>';
    return h + '<button class="lien" data-a="oral-stop">Quitter sans enregistrer</button></section>';
  }
  function oralPage() {
    var o = S.oral;
    if (!o) return oralTirage();
    return o.etape === 'bilan' ? oralBilan() : oralChrono();
  }

  /* ---------- carnet et réglages ---------- */
  function tuile(valeur, label, plus) {
    return '<div class="tuile"><b>' + valeur + '</b><span>' + esc(label) + '</span>' + (plus ? '<small' + (plus.cl ? ' class="' + plus.cl + '"' : '') + '>' + esc(plus.t) + '</small>' : '') + '</div>';
  }
  /* Prévision : la phrase qui répond à « serai-je prêt ? », puis la courbe des repères vus, réelle puis prolongée jusqu'à l'oral. */
  function blocCap(p) {
    var lp = lirePrevision(p), d = auj(), h = '<div class="bloc cap"><h2>Prévision</h2>';
    if (lp.titre) h += '<p class="statut' + (lp.ton ? ' ' + lp.ton : '') + '">' + esc(lp.titre) + '</p>';
    h += '<p class="chiffres">' + esc(lp.texte) + '</p>';
    if (lp.bouton) h += '<button class="btn" data-a="rythme" data-n="' + lp.bouton + '">Passer à ' + lp.bouton + ' nouveautés par jour</button>';
    if (p.reste === null && p.etat !== 'fini') h += '<p class="note"><a href="#reglages">Indiquer la date de l\'oral</a></p>';
    if (p.etat === 'passe' || p.etat === 'fini' || !p.total) return h + '</div>';

    var premier = SUIVI.regularite(P.days, d).premier;
    var depuis = premier === null ? d : Math.max(Math.min(premier - 1, d - 1), d - 90);
    var fin = p.reste !== null && p.reste > 0 ? d + p.reste : (p.jourVu !== null ? Math.max(p.jourVu + 7, d + 14) : d + 30);
    var hist = SUIVI.historique(P.days, d, p.vus, depuis).map(function (x) { return [x.jour, x.v]; });
    var proj = p.neufs && p.rythme > 0 ? SUIVI.projection(p.vus, p.total, p.rythme, d, fin).map(function (x) { return [x.jour, x.v]; }) : [];
    var etendue = Math.max(1, fin - depuis), ici = (d - depuis) / etendue, j;
    function valeurA(jour) { return jour <= d ? hist[jour - depuis][1] : (proj.length ? proj[jour - d][1] : null); }

    var gy = [], pas = SUIVI.plafond(p.total) / 4;
    for (j = pas; j <= p.total * 0.8; j += pas) gy.push({ y: j, t: String(Math.round(j)) });
    var pts = [{ x: d, y: p.vus }], ets = [{ x: d, y: p.vus, t: pluriel(p.vus, 'vu', 'vus'), cl: (ici < 0.3 ? 'd' : 'g') + (p.vus > p.total * 0.8 ? ' bas' : '') }];
    if (proj.length) {
      if (p.jourVu !== null && p.jourVu <= fin) {
        pts.push({ x: p.jourVu, y: p.total, cl: 'prevu' });
        ets.push({ x: p.jourVu, y: p.total, t: jourTexte(p.jourVu, true), cl: ((p.jourVu - depuis) / etendue > 0.8 ? 'g' : 'd') + ' bas' });
      } else {
        var bout = proj[proj.length - 1][1];
        pts.push({ x: fin, y: bout, cl: 'prevu' });
        ets.push({ x: fin, y: bout, t: bout + (p.reste !== null && ici < 0.55 ? ' le jour de l\'oral' : ''), cl: 'g' + (bout > p.total * 0.9 ? ' bas' : '') });
      }
    }
    var gx = [{ x: depuis, t: depuis === d ? 'aujourd\'hui' : jourTexte(depuis, true), cl: 'deb' }];
    if (ici > 0.22 && ici < 0.78) gx.push({ x: d, t: 'aujourd\'hui' });
    gx.push({ x: fin, t: jourTexte(fin, true), cl: 'fin' });

    var jours = {}, lect = [], saut = Math.max(1, Math.ceil((etendue + 1) / 120));
    for (j = depuis; j <= fin; j += saut) jours[j] = 1;
    jours[d] = 1; jours[fin] = 1;
    Object.keys(jours).map(Number).sort(function (a, c) { return a - c; }).forEach(function (jour) {
      var v = valeurA(jour);
      if (v !== null) lect.push({ x: jour, v: pluriel(v, 'repère vu', 'repères vus'), l: (jour === d ? 'Aujourd\'hui' : jourLong(jour)) + (jour > d ? ', prévision' : '') });
    });
    var lignes = [];
    for (j = depuis; j < fin; j += 7) if (valeurA(j) !== null) lignes.push([j === d ? 'Aujourd\'hui' : jourTexte(j), String(valeurA(j)), j <= d ? 'Réel' : 'Prévision']);
    if (valeurA(fin) !== null) lignes.push([jourTexte(fin), String(valeurA(fin)), fin <= d ? 'Réel' : 'Prévision']);

    h += '<p class="g-titre">Repères vus</p>';
    if (proj.length) h += '<p class="g-leg" aria-hidden="true"><span><i class="k"></i>Réel</span><span><i class="k prevu"></i>Prévision</span></p>';
    h += G.courbe({ x0: depuis, x1: fin, y1: p.total * 1.16, h: 170, reel: hist, prevu: proj, gradY: gy, gradX: gx, points: pts, etiquettes: ets, lecture: lect,
      cible: { y: p.total, t: pluriel(p.total, 'repère', 'repères') }, repere: p.reste !== null && p.reste > 0 ? { x: d + p.reste, t: 'Oral' } : null,
      aria: 'Repères vus au fil des jours : ' + p.vus + ' sur ' + p.total + ' aujourd\'hui' + (proj.length && p.jourVu !== null ? ', total atteint le ' + jourTexte(p.jourVu) + ' en prévision' : '') + '.' });
    return h + G.tableau('Voir les chiffres', ['Date', 'Repères vus', ''], lignes) + '</div>';
  }
  function blocRegularite() {
    var d = auj(), reg = SUIVI.regularite(P.days, d), sems = SUIVI.semaines(P.days, d, 15);
    var h = '<div class="bloc"><h2>Régularité</h2><div class="tuiles">';
    h += tuile(reg.enCours + ' <small>' + (reg.enCours > 1 ? 'jours' : 'jour') + '</small>', 'Série en cours', reg.record > reg.enCours ? { t: 'Record : ' + pluriel(reg.record, 'jour', 'jours') } : null);
    h += tuile(reg.actifs30 + ' <small>/ 30</small>', 'Jours travaillés');
    var ecart = reg.taux7 !== null && reg.tauxAvant !== null ? Math.round(100 * reg.taux7) - Math.round(100 * reg.tauxAvant) : null;
    h += tuile(reg.taux7 === null ? '–' : pourcent(reg.taux7), 'Réussite sur 7 jours',
      ecart === null ? null : Math.abs(ecart) < 3 ? { t: 'Stable sur une semaine' } : { t: (ecart > 0 ? 'En hausse de ' : 'En baisse de ') + pluriel(Math.abs(ecart), 'point', 'points'), cl: ecart > 0 ? 'ok' : 'ko' });
    h += reg.ms7 ? tuile(duree(reg.ms7), 'Travail sur 7 jours', reg.actifs7 ? { t: duree(reg.ms7 / reg.actifs7) + ' par jour travaillé' } : null) : tuile(String(reg.n7), 'Réponses sur 7 jours');
    h += '</div>' + G.calendrier(sems, { auj: d, aria: 'Activité des quinze dernières semaines, une case par jour', legende: ['Moins', 'Plus'], jours: ['lun.', '', 'mer.', '', 'ven.', '', 'dim.'],
      mois: function (jour) { return MOIS_C[SUIVI.dateDe(jour).m]; },
      lib: function (x) { return x.jour === d ? 'Aujourd\'hui' : jourLong(x.jour); },
      valeur: function (x) { return x.n ? pluriel(x.n, 'réponse', 'réponses') + ', ' + pluriel(x.ok, 'juste', 'justes') : 'Repos'; } });
    if (reg.premier === null) return h + '<p class="note espace">Chaque jour travaillé colore une case. La première séance ouvre le carnet.</p></div>';
    var lignes = sems.filter(function (s) { return s.lundi + 6 >= reg.premier; }).map(function (s) {
      return ['Semaine du ' + jourTexte(s.lundi), pluriel(s.actifs, 'jour', 'jours'), String(s.n), s.n ? pourcent(s.ok / s.n) : '–'];
    });
    return h + G.tableau('Voir les chiffres', ['Semaine', 'Jours travaillés', 'Réponses', 'Réussite'], lignes) + '</div>';
  }
  function blocAVenir() {
    var d = auj(), av = SUIVI.aVenir(P.cards, function (id) { return !!FACTS[id]; }, d, 14), somme = 0, max = 0;
    av.forEach(function (n) { somme += n; if (n > max) max = n; });
    if (!somme) return '';
    var items = av.map(function (n, i) {
      return { v: n, bulle: pluriel(n, 'révision', 'révisions'), lib: i === 0 ? 'Aujourd\'hui' : i === 1 ? 'Demain' : jourLong(d + i), x: initiale(d + i), cl: i === 0 ? 'auj' : '', et: i === 0 && n ? String(n) : '' };
    });
    return '<div class="bloc"><h2>Révisions à venir</h2><p class="note">Aujourd\'hui ' + av[0] + ', demain ' + av[1] + '. Ce sont les révisions déjà programmées : les nouveautés s\'y ajoutent.</p>' +
      G.barres(items, { max: SUIVI.plafond(max), aria: 'Révisions programmées sur les quatorze prochains jours', h: 88 }) +
      G.tableau('Voir les chiffres', ['Jour', 'Révisions'], items.map(function (it) { return [it.lib, String(it.v)]; })) + '</div>';
  }
  function blocMaitrise() {
    var par = {}, h = '<div class="bloc"><h2>Maîtrise par thème</h2>';
    SUIVI.parPack(DATA.packs, P.cards).forEach(function (e) { par[e.id] = e; });
    parTheme().forEach(function (t, i) {
      h += i ? '<p class="groupe">' + esc(t.nom) + '</p>' : '<div class="mr tete"><span class="groupe">' + esc(t.nom) + '</span><span class="mr-sec">Réussite</span><span class="mr-val">Acquis</span></div>';
      t.packs.forEach(function (p) {
        var e = par[p.id];
        h += '<div class="mr"><button class="mr-nom" data-a="fiches" data-p="' + esc(p.id) + '">' + esc(p.titre) + '</button><span class="mr-sec">' + (e.taux === null ? '' : pourcent(e.taux)) + '</span><span class="mr-val">' + e.acquis + ' / ' + e.n + '</span>' +
          G.segments([{ v: e.acquis, cl: 'acquis' }, { v: e.cours, cl: 'cours' }, { v: e.neuf, cl: 'reste' }], e.acquis + ' acquis, ' + e.cours + ' en cours, ' + e.neuf + ' à découvrir') + '</div>';
      });
    });
    return h + '<div class="legende seg-leg"><span class="l-acquis">Acquis</span><span class="l-encours">En cours</span><span class="l-reste">À découvrir</span></div></div>';
  }
  function blocFragiles() {
    if (!Object.keys(P.cards).length) return '';
    var fr = SUIVI.fragiles(P.cards, FACTS, 8), h = '<div class="bloc"><h2>Repères qui résistent</h2>';
    if (!fr.length) return h + '<p class="note">Aucun pour l\'instant. Un repère apparaît ici après deux erreurs et en sort une fois acquis.</p></div>';
    h += '<ul class="rates">' + fr.map(function (x) { return '<li><span>' + esc(FACTS[x.id].t) + '</span><span class="quand">' + x.ech + ' erreurs sur ' + x.n + '</span></li>'; }).join('') + '</ul>';
    return h + '<button class="btn espace" data-a="faibles">' + (fr.length > 1 ? 'Retravailler ces ' + fr.length + ' repères' : 'Retravailler ce repère') + '</button></div>';
  }
  function ligneOral(o) {
    var d = new Date(o.t);
    return '<li><span class="d">' + d.getDate() + ' ' + MOIS[d.getMonth()] + '</span><span>' + esc(o.titre) + '</span><span class="quand"><b>' + o.total + '</b> / 20</span></li>';
  }
  function blocOraux() {
    var crit = DATA.criteres || [], o = SUIVI.oraux(P.oraux, crit.length), h = '<div class="bloc"><h2>Oraux blancs</h2>';
    if (!o.n) return h + '<p class="note">Aucun oral blanc enregistré. <a href="#oral">Tire un premier sujet.</a></p></div>';
    h += '<div class="tuiles trois">' + tuile(o.dernier + ' <small>/ 20</small>', 'Dernier oral') + tuile(virgule(o.moyenne) + ' <small>/ 20</small>', 'Moyenne') + tuile(o.meilleur + ' <small>/ 20</small>', 'Meilleure note') + '</div>';
    if (o.n >= 2) {
      var jour = function (t) { var d = new Date(t); return d.getDate() + ' ' + MOIS_C[d.getMonth()]; }, der = o.points[o.n - 1];
      h += '<p class="g-titre">Notes sur 20, dans l\'ordre des oraux</p>' + G.courbe({ x0: 0, x1: o.n - 1, y1: 23, h: 130, sansAire: true,
        reel: o.points.map(function (p, i) { return [i, p.total]; }), gradY: [{ y: 10, t: '10' }, { y: 20, t: '20' }],
        points: o.n <= 24 ? o.points.map(function (p, i) { return { x: i, y: p.total }; }) : [{ x: o.n - 1, y: der.total }],
        etiquettes: [{ x: o.n - 1, y: der.total, t: String(der.total), cl: 'g' + (der.total > 17 ? ' bas' : '') }],
        gradX: [{ x: 0, t: jour(o.points[0].t), cl: 'deb' }, { x: o.n - 1, t: jour(der.t), cl: 'fin' }],
        lecture: o.points.map(function (p, i) { return { x: i, v: p.total + ' / 20', l: jour(p.t) + ' : ' + p.titre }; }),
        aria: 'Notes des oraux blancs, de la plus ancienne à la plus récente : ' + o.points.slice(-12).map(function (p) { return p.total; }).join(', ') + ' sur 20.' });
    }
    if (crit.length && o.criteres.some(function (m) { return m !== null; })) {
      h += '<p class="groupe">Moyenne par critère</p>';
      crit.forEach(function (c, i) {
        var m = o.criteres[i];
        if (m !== null) h += '<div class="mr crit"><span class="mr-nom">' + esc(c) + '</span><span class="mr-sec">' + (i === o.faible ? '<span class="pill fragile">À travailler</span>' : '') + '</span><span class="mr-val">' + virgule(m) + ' / 5</span>' + G.jauge(m, 5, c + ' : ' + virgule(m) + ' sur 5') + '</div>';
      });
    }
    var liste = P.oraux.slice().reverse();
    h += '<p class="groupe">Derniers oraux</p><ul class="rates">' + liste.slice(0, 5).map(ligneOral).join('') + '</ul>';
    if (liste.length > 5) h += '<details class="releve"><summary>Oraux plus anciens</summary><ul class="rates">' + liste.slice(5).map(ligneOral).join('') + '</ul></details>';
    return h + '</div>';
  }
  function carnet() {
    var h = '<section class="pile vaste"><h1 class="page-t">Carnet de vol</h1>';
    if (S.msg) { h += '<p class="bravo">' + esc(S.msg) + '</p>'; S.msg = null; }
    h += blocCap(prevoir());
    h += '<div class="cols"><div class="pile">' + blocRegularite() + blocMaitrise() + blocFragiles() + '</div><div class="pile">' + blocAVenir() + blocOraux() + '</div></div>';
    return h + '<p><a href="#reglages">Réglages et synchronisation</a></p></section>';
  }
  function themeChoisi() { try { return window.localStorage.getItem(THEME) || ''; } catch (e) { return ''; } }
  /* Apparence : '' suit l'appareil, 'light' ou 'dark' force le thème. Le choix reste sur cet appareil. */
  function appliquerTheme(v) {
    var r = document.documentElement, metas = document.querySelectorAll('meta[name="theme-color"]'), i;
    if (v === 'light' || v === 'dark') r.setAttribute('data-theme', v); else { r.removeAttribute('data-theme'); v = ''; }
    try { if (v) window.localStorage.setItem(THEME, v); else window.localStorage.removeItem(THEME); } catch (e) { /* stockage absent */ }
    for (i = 0; i < metas.length; i++) {
      var sombre = v ? v === 'dark' : /dark/.test(metas[i].getAttribute('media') || '');
      metas[i].setAttribute('content', sombre ? '#0D1726' : '#EAF0F6');
    }
  }
  function options(vals, cur, unite) {
    return vals.map(function (v) { return '<option value="' + v + '"' + (+cur === v ? ' selected' : '') + '>' + v + (unite ? ' ' + unite : '') + '</option>'; }).join('');
  }
  function reglages() {
    var st = Sync.etat(), h = '<section class="pile"><h1 class="page-t">Réglages</h1><div class="bloc">';
    h += '<div class="ligne"><label for="r-exam">Date de l\'oral</label><input id="r-exam" type="date" data-set="exam" value="' + esc(P.set.exam || '') + '"></div>';
    h += '<div class="ligne"><label for="r-neu">Nouveautés par jour</label><select id="r-neu" data-set="neu">' + options([5, 8, 10, 15, 20], P.set.neu) + '</select></div>';
    h += '<div class="ligne"><label for="r-prep">Préparation de l\'oral</label><select id="r-prep" data-set="prep">' + options([10, 15, 20, 30, 45, 60], P.set.prep, 'min') + '</select></div>';
    h += '<div class="ligne"><label for="r-expo">Exposé</label><select id="r-expo" data-set="expo">' + options([5, 10, 15, 20], P.set.expo, 'min') + '</select></div>';
    h += '<div class="ligne"><label for="r-quest">Questions du jury</label><select id="r-quest" data-set="quest">' + options([5, 10, 15, 20], P.set.quest, 'min') + '</select></div>';
    h += '<div class="ligne"><label for="r-blitz">Temps par question en blitz</label><select id="r-blitz" data-set="blitz">' + options([10, 15, 20, 30], P.set.blitz, 's') + '</select></div>';
    h += '<div class="ligne"><label for="r-auto">Enchaîner après une bonne réponse</label><select id="r-auto" data-set="auto"><option value="1"' + (P.set.auto !== 0 ? ' selected' : '') + '>Oui</option><option value="0"' + (P.set.auto === 0 ? ' selected' : '') + '>Non</option></select></div></div>';
    h += '<div class="bloc"><h2>Affichage</h2><div class="ligne"><label for="r-theme">Apparence sur cet appareil</label><select id="r-theme">' +
      [['', 'Automatique'], ['light', 'Claire'], ['dark', 'Sombre']].map(function (o) { return '<option value="' + o[0] + '"' + (themeChoisi() === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
    h += '<div class="bloc"><h2>Synchronisation</h2><p><b id="sync-detail">' + LIB[st] + '</b></p>';
    if (Sync.git()) {
      h += '<p class="note espace">Ta progression est enregistrée dans un fichier privé de ton compte GitHub. Elle suit sur chaque appareil où tu as collé le même jeton. Si GitHub refuse le jeton, arrête la synchronisation puis colle-en un nouveau.</p>' +
        '<button class="btn espace" data-a="sync-couper">Arrêter la synchronisation sur cet appareil</button>';
    } else if (CHEZ_CLAUDE || st !== 'local') {
      h += '<p class="note espace">' + (st === 'local' ? 'Ouvre cette page depuis ton compte Claude pour retrouver ta progression sur tes autres appareils. En attendant, elle est gardée dans ce navigateur.' : 'Ta progression est enregistrée sur ton compte Claude : ouvre cette page sur ton téléphone ou ton ordinateur, elle suit.') + '</p>';
    } else {
      h += '<p class="note espace">Ta progression est gardée sur cet appareil. Pour la retrouver sur ton téléphone et ton ordinateur, colle le même jeton GitHub sur chacun.</p>' +
        '<label class="sr" for="jeton">Jeton GitHub</label><input class="champ espace" id="jeton" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Jeton GitHub">' +
        '<p class="erreur" id="jeton-err" hidden>Colle le jeton complet, sans espace.</p>' +
        '<div class="rangee espace"><button class="btn primaire" data-a="sync-activer">Activer la synchronisation</button><a class="lien" href="https://github.com/settings/tokens/new?scopes=gist&amp;description=Plan%20de%20vol" target="_blank" rel="noopener">Créer un jeton sur GitHub</a></div>' +
        '<p class="note espace">Le jeton a seulement besoin du droit « gist ». Il reste enregistré sur cet appareil.</p>';
    }
    h += '</div>';
    if (!CHEZ_CLAUDE) h += '<div class="bloc"><h2>Hors connexion</h2><p><b id="hors-detail">' + LIB_HORS[HORS.etat] + '</b></p><p class="note espace">Une fois la page ajoutée à l\'écran d\'accueil et ouverte une première fois avec du réseau, tout le contenu reste disponible sans connexion.</p></div>';
    var sig = Object.keys(P.flags).filter(signale).filter(function (id) { return FACTS[id]; });
    h += '<div class="bloc"><h2>Fiches signalées</h2>' + (sig.length ? '<ul class="rates">' + sig.map(function (id) {
      return '<li><span class="d">' + esc(FACTS[id].d || FACTS[id].g || '') + '</span><span>' + esc(FACTS[id].t) + '</span></li>';
    }).join('') + '</ul><button class="lien" data-a="flags-vider">Vider cette liste</button>' : '<p class="note">Aucune. Le lien « Signaler une erreur », sous chaque fiche, ouvre un signalement sur GitHub : la correction profite à tout le monde.</p>') + '</div>';
    h += '<div class="bloc"><h2>Test de positionnement</h2><p class="note">Une trentaine de questions sur toute la base. Les repères réussis sautent les premières étapes.</p><button class="btn espace" data-a="diag">Passer le test</button></div>';
    h += '<div class="bloc"><h2>Remise à zéro</h2>';
    if (S.raz) h += '<p class="alerte">Toute la progression sera effacée, sur tous tes appareils.</p><div class="rangee espace"><button class="btn danger" data-a="raz-oui">Effacer ma progression</button><button class="btn" data-a="raz-non">Annuler</button></div>';
    else h += '<button class="btn danger" data-a="raz">Effacer ma progression</button>';
    h += '</div><div class="bloc"><h2>À propos</h2><p class="note">Plan de vol est un projet libre et indépendant, sans lien avec le ministère des Armées ni avec une école. Les fiches ont été rédigées avec l\'aide d\'une IA ; les faits d\'actualité ont été recoupés en ligne à la date indiquée. Une erreur reste possible : signale-la.</p>' +
      '<p class="note espace">Code sous licence MIT, fiches sous licence CC BY-SA 4.0. Version du ' + VERSION_APP + '.</p>' +
      '<a class="lien" href="https://github.com/' + esc(DEPOT) + '" target="_blank" rel="noopener">Code source, signalements et contributions</a>';
    return h + '</div></section>';
  }

  /* ---------- navigation ---------- */
  var PAGES = { accueil: accueil, fiches: fiches, oral: oralPage, carnet: carnet, reglages: reglages };
  function page() { var h = (window.location.hash || '').replace('#', ''); return PAGES[h] ? h : 'accueil'; }
  function rendre() {
    var h, focus = false, p = page();
    if (S.ses) { h = S.ses.fini ? vueDebrief() : vueQuestion(); focus = true; }
    else if (S.frise) { h = vueFrise(); focus = true; }
    else if (S.choix) { h = vueChoix(); focus = true; }
    else { h = PAGES[p](); if (p === 'oral' && S.oral) focus = true; }
    document.body.classList.toggle('focus', focus);
    var liens = document.querySelectorAll('#nav a');
    for (var i = 0; i < liens.length; i++) {
      if (!focus && liens[i].getAttribute('href') === '#' + p) liens[i].setAttribute('aria-current', 'page'); else liens[i].removeAttribute('aria-current');
    }
    G.cacher();
    app.classList.toggle('arrive', !!S.haut);
    app.innerHTML = h;
    if (S.haut) { S.haut = false; window.scrollTo(0, 0); }
    if (S.oral && p === 'oral' && !S.ses && !S.frise && !S.choix) oralBattre();
  }

  var ACT = {
    jour: function () { var p = planJour(); lancer('jour', composer(p.dus, p.neufs)); },
    avance: function () { lancer('avance', composer([], nouveaux(+P.set.neu || 10))); },
    diag: function () {
      var items = [], par = Math.max(2, Math.ceil(28 / DATA.packs.length));
      DATA.packs.forEach(function (p) { melange(jouables(p.faits, true)).slice(0, par).forEach(function (f) { items.push({ id: f.id, fmt: qcm(f), dur: false }); }); });
      lancer('diag', melange(items));
    },
    choix: function (b) { S.choix = { m: b.getAttribute('data-m') }; S.haut = true; rendre(); },
    go: function (b) { var m = S.choix ? S.choix.m : 'blitz', pid = b.getAttribute('data-p') || ''; if (m === 'blitz') lancerBlitz(pid); else friseNouvelle(pid); },
    rep: function (b) { repondre(+b.getAttribute('data-i')); },
    voir: function () { var s = S.ses; if (s && s.rep === null && !s.q.opts) { s.rep = 'vu'; rendre(); } },
    auto: function (b) { autoEval(b.getAttribute('data-r')); },
    suite: function () { arreterChrono(); avancer(); },
    quitter: function () { fermer(); S.haut = true; rendre(); },
    accueil: function () { fermer(); S.haut = true; if (page() !== 'accueil') window.location.hash = '#accueil'; else rendre(); },
    rejouer: function () { var pid = S.ses ? S.ses.opt.pack : ''; fermer(); lancerBlitz(pid); },
    erreurs: function () { var ids = S.ses ? S.ses.rates.slice() : []; fermer(); lancer('erreurs', ids.filter(function (id) { return FACTS[id]; }).map(function (id) { return { id: id, fmt: qcm(FACTS[id]), dur: false, retry: true }; })); },
    refrise: function () { var pid = S.frise ? S.frise.pack : ''; fermer(); friseNouvelle(pid); },
    flag: function (b) { var id = b.getAttribute('data-id'); P.flags[id] = { on: true, t: Date.now() }; commit(); },
    'flags-vider': function () { Object.keys(P.flags).forEach(function (id) { if (signale(id)) P.flags[id] = { on: false, t: Date.now() }; }); commit(); rendre(); },
    lire: function () {
      var s = S.ses; if (!s || !s.auto || s.kind === 'blitz') return;
      s.auto = false; if (chrono.auto) { clearTimeout(chrono.auto); chrono.auto = 0; }
      var b = document.querySelector('.btn.rebours'); if (b) b.classList.remove('rebours');
    },
    fiches: function (b) { S.fiches.pack = b.getAttribute('data-p'); S.fiches.q = ''; S.fiches.st = ''; S.haut = true; if (page() !== 'fiches') window.location.hash = '#fiches'; else rendre(); },
    fpack: function (b) { S.fiches.pack = b.getAttribute('data-p'); S.fiches.st = ''; rendre(); },
    fst: function (b) { S.fiches.st = b.getAttribute('data-s') || ''; rendre(); },
    'frise-tap': function (b) {
      var c = S.frise && S.frise.cur; if (!c || c.valide) return;
      var id = b.getAttribute('data-id'), i = c.ordre.indexOf(id);
      if (i >= 0) c.ordre.splice(i, 1); else c.ordre.push(id);
      rendre();
    },
    'frise-ok': function () {
      var g = S.frise, c = g && g.cur; if (!c || c.valide || c.ordre.length < c.items.length) return;
      var bon = c.items.slice().sort(function (a, b) { return a.y - b.y; }), d = auj();
      c.score = 0; bon.forEach(function (f, i) { if (c.ordre[i] === f.id) c.score++; });
      c.valide = true; g.bons += c.score; g.total += bon.length;
      var jour = P.days[d] ? clone(P.days[d]) : { n: 0, ok: 0, neu: 0 };
      jour.n += bon.length; jour.ok += c.score; P.days[d] = jour; commit();
      rendre();
    },
    'frise-suite': function () {
      var g = S.frise; if (!g) return;
      g.manche++;
      if (g.manche >= 3) {
        g.fini = true; var k = 'frise:' + (g.pack || 'tout');
        if (g.bons > (P.best[k] || 0)) { P.best[k] = g.bons; g.record = true; commit(); }
        S.haut = true; rendre();
      } else friseManche();
    },
    'oral-tirer': function () { S.tirage = tirer(); rendre(); },
    'oral-go': function (b) { var s = S.tirage ? S.tirage[+b.getAttribute('data-i') || 0] : null; if (s) oralDemarrer(s, s.titre); },
    'oral-libre': function () {
      var el = document.getElementById('libre'), v = el ? el.value.trim() : '', err = document.getElementById('libre-err');
      if (!v) { if (err) err.hidden = false; if (el) el.focus(); return; }
      oralDemarrer(null, v);
    },
    'oral-pause': function () {
      var o = S.oral; if (!o || o.etape === 'bilan') return;
      if (o.pause === null) o.pause = o.fin - Date.now(); else { o.fin = Date.now() + o.pause; o.pause = null; }
      rendre();
    },
    'oral-suite': function () {
      var o = S.oral; if (!o) return;
      var i = ETAPES.indexOf(o.etape);
      if (i < ETAPES.length - 1) { o.etape = ETAPES[i + 1]; o.total = dureeEtape(o.etape); o.fin = Date.now() + o.total; o.pause = null; o.sonne = false; }
      else { o.etape = 'bilan'; if (oralT) { clearInterval(oralT); oralT = 0; } }
      S.haut = true; rendre();
    },
    'oral-q': function () { var o = S.oral; if (o && o.qi < o.questions.length - 1) { o.qi++; rendre(); } },
    'oral-stop': function () { S.oral = null; if (oralT) { clearInterval(oralT); oralT = 0; } S.haut = true; rendre(); },
    note: function (b) { var o = S.oral; if (!o) return; o.notes[+b.getAttribute('data-c')] = +b.getAttribute('data-n'); rendre(); },
    'oral-save': function () {
      var o = S.oral; if (!o || o.notes.some(function (n) { return n < 0; })) return;
      var total = o.notes.reduce(function (a, n) { return a + n; }, 0);
      P.oraux.push({ t: Date.now(), s: o.sujet ? o.sujet.id : null, titre: o.titre, notes: o.notes.slice(), total: total });
      commit();
      S.msg = 'Débriefing enregistré : ' + total + ' / 20.'; S.oral = null; S.tirage = null; S.haut = true; rendre();
    },
    'sync-activer': function () {
      var el = document.getElementById('jeton'), v = el ? el.value.replace(/\s+/g, '') : '';
      if (!/^[A-Za-z0-9_]{20,}$/.test(v)) { var er = document.getElementById('jeton-err'); if (er) er.hidden = false; return; }
      Sync.activer(v); rendre();
    },
    'sync-couper': function () { Sync.couper(); rendre(); },
    rythme: function (b) {
      var n = +b.getAttribute('data-n'); if (SUIVI.RYTHMES.indexOf(n) < 0) return;
      P.set = clone(P.set); P.set.neu = n; P.set.t = Date.now(); commit();
      S.msg = 'Rythme réglé sur ' + n + ' nouveautés par jour.'; S.haut = true; rendre();
    },
    faibles: function () {
      var ids = SUIVI.fragiles(P.cards, FACTS, 8).map(function (x) { return x.id; });
      fermer(); lancer('erreurs', ids.map(function (id) { return { id: id, fmt: qcm(FACTS[id]), dur: false, retry: true }; }));
    },
    raz: function () { S.raz = true; rendre(); },
    'raz-non': function () { S.raz = false; rendre(); },
    'raz-oui': function () { var r = P.set; P = vide(); P.epoch = Date.now(); P.set = r; P.set.t = Date.now(); S.raz = false; commit(); rendre(); }
  };

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
    if (!b || b.disabled) return;
    var fn = ACT[b.getAttribute('data-a')];
    if (fn) { if (!b.hasAttribute('data-lien')) e.preventDefault(); fn(b); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, k = t && t.getAttribute ? t.getAttribute('data-set') : null;
    if (t && t.id === 'r-theme') return appliquerTheme(t.value);
    if (!k) return;
    P.set = clone(P.set);
    P.set[k] = k === 'exam' ? (t.value || null) : +t.value;
    P.set.t = Date.now(); commit();
    if (k === 'exam') majEcheance();
  });
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'rech') return;
    S.fiches.q = e.target.value;
    var l = document.getElementById('liste'), p = pack(S.fiches.pack);
    if (l && p) l.innerHTML = listeFiches(p);
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = t && t.tagName ? t.tagName : '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    var s = S.ses; if (!s || s.fini || !s.q) return;
    var valide = (e.key === 'Enter' || e.key === ' ') && !/^(BUTTON|A|SUMMARY)$/.test(tag), q = s.q;
    if (q.fmt === 'decouverte') { if (valide) { e.preventDefault(); ACT.suite(); } return; }
    if (q.opts) {
      if (s.rep === null) { var n = parseInt(e.key, 10); if (n >= 1 && n <= q.opts.length) { e.preventDefault(); repondre(n - 1); } }
      else if (valide) { e.preventDefault(); ACT.suite(); }
    } else if (s.rep === null) { if (valide) { e.preventDefault(); ACT.voir(); } }
    else { var m = { '1': 'ko', '2': 'mid', '3': 'ok' }[e.key]; if (m) { e.preventDefault(); autoEval(m); } }
  });
  window.addEventListener('hashchange', function () { fermer(); S.raz = false; S.haut = true; rendre(); });

  DATA.test = { fusion: fusion, vide: vide, qQuand: qQuand, qQuoi: qQuoi, qSur: qSur, formats: formats, question: question, composer: composer, nouveaux: nouveaux,
    tirer: tirer, parTheme: parTheme, packValide: packValide, prevoir: prevoir, faits: function () { return FACTS; }, seance: function () { return S.ses; } };
  appliquerTheme(themeChoisi());
  indexer();
  S.haut = true;
  rendre();
  G.init();
  Sync.init();
  chargerActu();
  horsConnexion();
})();
