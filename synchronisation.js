/* Plan de vol : la synchronisation vue de l'application. Ce fichier décide quand la progression part et revient,
   garde la plus complète de deux copies et tient à jour l'état affiché en haut de page. Deux chemins :
   - page ouverte depuis Claude : la base du compte Claude (window.claude), sans rien à régler ;
   - ailleurs : un code de seize caractères, tapé une fois par appareil. synchro.js en tire les clés et chiffre ;
     config.js indique le service qui garde la copie chiffrée (docs/synchronisation.md).
   app.js fournit ce qui touche à la progression : DATA.synchronisation({ lire, adopter, normaliser, fusion, packs }). */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  var CFG = 'pdv.sync.v1';
  var LIB = {
    local: 'Progression sur cet appareil',
    wait: 'Connexion…',
    late: 'Synchronisation lente',
    sync: 'Synchronisation…',
    ok: 'Synchronisé',
    off: 'Synchronisation interrompue',
    full: 'Espace de synchronisation plein',
    hors: 'Hors connexion, synchronisation au retour du réseau'
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** app : lire() rend la progression ; adopter(p) la remplace par une copie plus complète venue d'ailleurs ;
      normaliser(o) et fusion(a, b) viennent d'app.js ; packs(liste) ajoute les packs trouvés sur le compte Claude. */
  function creer(app) {
    var doc = racine.document;
    var CODE = DATA.synchro, BASE = CODE && CODE.disponible() && /^https:\/\//.test(DATA.carnets || '') ? DATA.carnets : '';
    var etat = 'local', motif = '', sale = false, pret = false, t1 = 0, t2 = 0;
    var lien = lireCfg(), enVol = false, encore = false, dernier = 0, ecoute = false;   // par code : lien = { code, id, k, vu }
    var ref = null, ecrit = false, essais = 0;                                          // chez Claude : le document de la base

    function dire(s) {
      etat = s;
      var el = doc.getElementById('sync'); if (el) { el.textContent = LIB[s]; el.setAttribute('data-s', s); }
      var d = doc.getElementById('sync-detail'); if (d) d.textContent = LIB[s];
      var m = doc.getElementById('sync-motif'); if (m) m.textContent = raison();
    }
    /* En clair, pourquoi la synchronisation par code est interrompue (vide si tout va bien). */
    function raison() {
      if (etat !== 'off' || !motif) return '';
      if (motif === '401' || motif === '403') return 'Le service refuse l\'accès : les règles de la base ne sont pas celles du guide.';
      if (motif === '404') return 'Le service est introuvable : l\'adresse indiquée dans config.js n\'est pas la bonne.';
      if (motif === 'format') return 'La copie en ligne vient d\'une version plus récente de l\'application : mets cet appareil à jour.';
      if (motif === 'cle') return 'La copie en ligne est illisible avec ce code.';
      if (motif === 'reseau') return 'Le service ne répond pas. Vérifie ta connexion : un nouvel essai partira à ta prochaine réponse.';
      return 'Le service a répondu par une erreur (' + motif + '). Un nouvel essai partira à ta prochaine réponse.';
    }
    /** Copie distante reçue : on garde la plus complète des deux. Rend vrai si celle de cet appareil a du neuf à envoyer. */
    function recevoir(dist) {
      var r = app.fusion(app.lire(), dist);
      if (r.bPlus) app.adopter(r.m);
      return r.aPlus;
    }

    /* ---------- par code ---------- */
    function lireCfg() {
      try {
        var c = JSON.parse(racine.localStorage.getItem(CFG) || 'null');
        if (c && typeof c.code === 'string' && c.id && c.k && BASE) return c;
        if (c && c.token) racine.localStorage.removeItem(CFG);   // ancienne synchronisation par jeton GitHub (avant 1.9.0) : le jeton est effacé
      } catch (e) { /* stockage absent ou illisible */ }
      return null;
    }
    function ecrireCfg() {
      try { if (lien) racine.localStorage.setItem(CFG, JSON.stringify(lien)); else racine.localStorage.removeItem(CFG); } catch (e) { /* stockage absent */ }
    }
    /* On demande d'abord la date de la dernière écriture (quelques octets) ; le carnet n'est relu que s'il a changé. */
    function lireCarnet(moi) {
      return CODE.version(BASE, moi).then(function (t) {
        if (t === null) return { absent: true };
        if (pret && t === moi.vu) return { inchange: true };
        return CODE.lire(BASE, moi).then(function (rec) { return rec ? { texte: rec.texte, t: rec.t } : { absent: true }; });
      });
    }
    function ecrireCarnet(moi) {
      var t = Math.max(Date.now(), (moi.vu || 0) + 1);
      return CODE.ecrire(BASE, moi, JSON.stringify(app.lire()), t).then(function () { moi.vu = t; if (lien === moi) ecrireCfg(); });
    }
    function cycle() {
      if (!lien) return;
      if (enVol) { encore = true; return; }
      if (racine.navigator.onLine === false) { dire('hors'); return; }
      var moi = lien;
      enVol = true; encore = false; dire(pret ? 'sync' : 'wait');
      lireCarnet(moi).then(function (d) {
        if (lien !== moi) return null;
        var envoyer = true;
        if (d.inchange) envoyer = sale;
        else if (d.texte) {
          var dist = null;
          try { dist = app.normaliser(JSON.parse(d.texte)); } catch (e) { dist = null; }
          if (dist) envoyer = recevoir(dist);
          if (d.t) { moi.vu = d.t; ecrireCfg(); }
        }
        pret = true; sale = false;
        return envoyer ? ecrireCarnet(moi) : null;
      }).then(function () {
        enVol = false;
        if (lien !== moi) return;
        motif = ''; dernier = Date.now(); dire('ok');
        if (encore || sale) planifier();
      }).catch(function (e) {
        enVol = false;
        if (lien !== moi) return;
        sale = true;
        motif = String((e && e.status) || (e && e.name === 'OperationError' ? 'cle' : 'reseau'));
        dire(racine.navigator.onLine === false ? 'hors' : 'off');
      });
    }
    function planifier() { clearTimeout(t2); t2 = setTimeout(cycle, 5000); }
    /* Envoi sans attendre, s'il reste quelque chose à envoyer : en fin de séance et quand l'application passe à l'arrière-plan. */
    function vite() { if (lien && sale && !enVol) { clearTimeout(t2); cycle(); } }
    function demarrerCode() {
      pret = false; dire('wait'); cycle();
      if (ecoute) return;
      ecoute = true;
      racine.addEventListener('online', function () { if (lien) cycle(); });
      racine.addEventListener('offline', function () { if (lien) dire('hors'); });
      doc.addEventListener('visibilitychange', function () {
        if (!lien) return;
        if (doc.visibilityState === 'hidden') vite();
        else if (sale || Date.now() - dernier > 60000) cycle();
      });
    }
    /** Relie cet appareil par un code. creation : vrai pour un code neuf ; sinon le carnet doit déjà exister (le code vient d'un autre appareil). */
    function relier(code, creation) {
      return CODE.cles(code).then(function (c) {
        var l = { code: code, id: c.id, k: c.k };
        if (creation) return l;
        return CODE.version(BASE, l).then(function (t) {
          if (t === null) { var e = new Error('code inconnu'); e.status = 'inconnu'; throw e; }
          return l;
        });
      }).then(function (l) { lien = l; ecrireCfg(); ref = null; demarrerCode(); return l; });
    }
    function couper() { lien = null; ecrireCfg(); clearTimeout(t2); pret = false; dire('local'); }

    /* ---------- chez Claude ---------- */
    function chercher(n) {
      if (lien) return;
      var c = racine.claude;
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
      var sur = !meta.fromCache, p = app.lire();
      if (snap.exists) { if (recevoir(app.normaliser(clone(snap.data())))) sale = true; }
      else if (sur && (Object.keys(p.cards).length || p.oraux.length || p.set.t)) sale = true;
      if (sur) { pret = true; clearTimeout(t1); }
      if (!pret) return;
      if (sale) bientot(); else if (!ecrit) dire('ok');
    }
    function bientot() { if (!ref || !pret) return; dire('sync'); clearTimeout(t2); t2 = setTimeout(ecrire, 1500); }
    function ecrire() {
      if (!ref || ecrit || !sale) return;
      ecrit = true; sale = false;
      ref.set(clone(app.lire())).then(function () {
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
    function chargerPacks(db) {
      try {
        db.collection('packs').get().then(function (qs) {
          app.packs((qs.docs || []).map(function (d) { return d.data(); }));
        }).catch(function () { /* pas de packs distants */ });
      } catch (e) { /* idem */ }
    }

    /* ---------- pour app.js ---------- */
    function init() { if (lien) demarrerCode(); else chercher(0); }
    /** Une réponse ou un réglage vient de changer la progression. */
    function pousser() {
      sale = true; essais = 0;
      if (lien) { if (enVol) encore = true; else planifier(); return; }
      if (ref && pret) bientot();
    }
    return { init: init, pousser: pousser, vite: vite, relier: relier, couper: couper, raison: raison,
      etat: function () { return etat; },
      libelle: function () { return LIB[etat]; },
      code: function () { return lien ? lien.code : ''; },   // le code de cet appareil, sinon ''
      parCode: function () { return !!BASE; } };            // la synchronisation par code est-elle proposée ici ?
  }

  DATA.synchronisation = creer;
})(typeof window !== 'undefined' ? window : globalThis);
