/* Plan de vol : synchronisation par code.
   Un code de seize caractères tient lieu de compte. Il sert à calculer deux choses, sur l'appareil :
   une adresse (où ranger la progression) et une clé (pour la chiffrer avant qu'elle parte).
   Le service en ligne ne reçoit donc que du texte illisible, rangé à une adresse impossible à deviner.
   Ce fichier ne touche pas à la page : il se teste sans navigateur. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });
  /* Alphabet de Crockford : pas de I, L, O ni U, pour qu'un code recopié à la main ne prête pas à confusion. */
  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var LONGUEUR = 16, SEL = 'plan-de-vol/synchro/v1', TOURS = 150000;

  function controle(corps) {
    var s = 0, i;
    for (i = 0; i < corps.length; i++) s += ALPHABET.indexOf(corps.charAt(i)) * (2 * i + 1);
    return ALPHABET.charAt(s % 32);
  }
  /** Un code neuf : quinze caractères tirés au hasard (75 bits) et un caractère de contrôle. */
  function nouveauCode() {
    var o = racine.crypto.getRandomValues(new Uint8Array(LONGUEUR - 1)), c = '', i;
    for (i = 0; i < o.length; i++) c += ALPHABET.charAt(o[i] & 31);
    return c + controle(c);
  }
  /** Ce que l'utilisateur a tapé, ramené à seize caractères de l'alphabet : minuscules, espaces, tirets, O pour 0, I ou L pour 1. */
  function normaliser(texte) {
    return String(texte || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
  }
  /** Vrai si le code est complet et que son caractère de contrôle tombe juste : une faute de frappe se voit sans réseau. */
  function valide(code) {
    if (typeof code !== 'string' || code.length !== LONGUEUR) return false;
    for (var i = 0; i < code.length; i++) if (ALPHABET.indexOf(code.charAt(i)) < 0) return false;
    return controle(code.slice(0, LONGUEUR - 1)) === code.charAt(LONGUEUR - 1);
  }
  /** Présentation par groupes de quatre : ABCD-EFGH-JKMN-PQRS. */
  function presenter(code) { return String(code || '').replace(/(.{4})(?=.)/g, '$1-'); }

  function b64(octets) {
    var s = '', i;
    for (i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
    return racine.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deb64(texte) {
    var s = racine.atob(String(texte).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
    return o;
  }
  function disponible() { return !!(racine.crypto && racine.crypto.subtle && racine.fetch && racine.TextEncoder); }

  /** Du code vers { id, k } : l'adresse du carnet et la clé de chiffrement. Les deux moitiés sont indépendantes : connaître l'adresse ne donne pas la clé. */
  function cles(code) {
    var sub = racine.crypto.subtle, te = new racine.TextEncoder();
    return sub.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return sub.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(SEL), iterations: TOURS }, base, 512);
    }).then(function (bits) {
      var o = new Uint8Array(bits);
      return { k: b64(o.subarray(0, 32)), id: b64(o.subarray(32, 64)) };
    });
  }
  function cleAes(k) { return racine.crypto.subtle.importKey('raw', deb64(k), 'AES-GCM', false, ['encrypt', 'decrypt']); }
  /** Chiffre un texte (AES-GCM, vecteur neuf à chaque fois). Rend le vecteur suivi du texte chiffré, en base64. */
  function chiffrer(k, texte) {
    var iv = racine.crypto.getRandomValues(new Uint8Array(12));
    return cleAes(k).then(function (cle) {
      return racine.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, cle, new racine.TextEncoder().encode(texte));
    }).then(function (ct) {
      var o = new Uint8Array(12 + ct.byteLength);
      o.set(iv); o.set(new Uint8Array(ct), 12);
      return b64(o);
    });
  }
  function dechiffrer(k, d) {
    var o = deb64(d);
    return cleAes(k).then(function (cle) {
      return racine.crypto.subtle.decrypt({ name: 'AES-GCM', iv: o.subarray(0, 12) }, cle, o.subarray(12));
    }).then(function (clair) { return new racine.TextDecoder().decode(clair); });
  }

  /* ---------- le service en ligne : une base Firebase Realtime Database, lue et écrite par son interface REST ---------- */
  function adresse(base, id) { return String(base).replace(/\/+$/, '') + '/carnets/' + id; }
  function appel(url, options) {
    return racine.fetch(url, options).then(function (r) {
      if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; }
      return r.status === 204 ? null : r.json();
    });
  }
  /** Date de la dernière écriture du carnet (un nombre), ou null s'il n'existe pas. Réponse minuscule : sert à savoir s'il faut tout relire. */
  function version(base, lien) { return appel(adresse(base, lien.id) + '/t.json', { cache: 'no-store' }); }
  /** Le carnet déchiffré : { t, texte }, ou null s'il n'existe pas. */
  function lire(base, lien) {
    return appel(adresse(base, lien.id) + '.json', { cache: 'no-store' }).then(function (rec) {
      if (!rec) return null;
      if (rec.v !== 1 || typeof rec.d !== 'string') { var e = new Error('format'); e.status = 'format'; throw e; }
      return dechiffrer(lien.k, rec.d).then(function (texte) { return { t: rec.t, texte: texte }; });
    });
  }
  /** Remplace le carnet. La requête est un POST « simple » (sans en-tête particulier) que le service traite comme un PUT : aucun navigateur ne la bloque. */
  function ecrire(base, lien, texte, t) {
    return chiffrer(lien.k, texte).then(function (d) {
      return appel(adresse(base, lien.id) + '.json?x-http-method-override=PUT&print=silent', { method: 'POST', body: JSON.stringify({ v: 1, t: t, d: d }) });
    });
  }

  DATA.synchro = { LONGUEUR: LONGUEUR, nouveauCode: nouveauCode, normaliser: normaliser, valide: valide, presenter: presenter, disponible: disponible,
    cles: cles, chiffrer: chiffrer, dechiffrer: dechiffrer, version: version, lire: lire, ecrire: ecrire };
})(typeof window !== 'undefined' ? window : globalThis);
