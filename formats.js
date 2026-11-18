/* Plan de vol : les questions à écrire (citation à trous, nom, année) et la remise en ordre.
   Ce fichier ne touche pas à la page : il dit quelles fiches s'y prêtent et corrige les réponses. Il se teste donc sans navigateur. */
(function (racine) {
  'use strict';
  var DATA = racine.PDV || (racine.PDV = { packs: [], sujets: [] });

  var ARTICLES = ['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du'];
  var TITRES = ['general', 'generale', 'marechal', 'amiral', 'colonel', 'commandant', 'capitaine', 'lieutenant',
    'president', 'presidente', 'roi', 'reine', 'empereur', 'imperatrice', 'chancelier', 'chanceliere', 'sir', 'lord'];
  var PARTICULES = ['de', 'du', 'des', 'd', 'la', 'le', 'l', 'von', 'van', 'der', 'den', 'di', 'da'];
  /* Un premier mot de ce genre signale une quantité, un rang ou une tournure, pas un nom propre. */
  var PAS_UN_NOM = ['a', 'au', 'aux', 'en', 'dans', 'sur', 'par', 'pour', 'avec', 'chez', 'vers', 'depuis', 'entre', 'sous',
    'apres', 'avant', 'parce', 'quand', 'ne', 'oui', 'non', 'jamais', 'aucun', 'aucune', 'environ', 'plus', 'moins',
    'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'vingt', 'trente', 'cent', 'mille',
    'premier', 'premiere', 'second', 'seconde', 'deuxieme', 'troisieme', 'quatrieme', 'cinquieme', 'dernier', 'derniere'];
  var NUMERO = /^(Ier|Ire|1er|1re|ier|ire)$/;

  /** Texte réduit à l'essentiel pour comparer : minuscules, sans accents ni ponctuation. */
  function plat(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /** Distance d'édition entre deux textes (insertions, suppressions, substitutions), arrêtée dès qu'elle dépasse max. */
  function distance(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var avant = [], i, j;
    for (j = 0; j <= b.length; j++) avant.push(j);
    for (i = 1; i <= a.length; i++) {
      var cur = [i], mini = i;
      for (j = 1; j <= b.length; j++) {
        cur.push(Math.min(avant[j] + 1, cur[j - 1] + 1, avant[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)));
        if (cur[j] < mini) mini = cur[j];
      }
      if (mini > max) return max + 1;
      avant = cur;
    }
    return avant[b.length];
  }

  /** Fautes de frappe tolérées selon la longueur de la réponse attendue : aucune pour un mot court. */
  function tolerance(n) { return n <= 5 ? 0 : n <= 9 ? 1 : 2; }
  function proche(donne, attendu) { return donne === attendu || distance(donne, attendu, tolerance(attendu.length)) <= tolerance(attendu.length); }

  function sansPrecision(s) { return String(s == null ? '' : s).replace(/\s*\([^)]*\)/g, '').replace(/,.*$/, '').trim(); }
  function jetons(s) { return sansPrecision(s).split(/[\s'’]+/).filter(Boolean); }
  function majuscule(m) { var c = m.charAt(0); return c !== c.toLowerCase() && c === c.toUpperCase(); }
  /** Retire en tête les articles et les grades : « Le général Jérôme Bellanger » devient « Jérôme Bellanger ». */
  function noyau(t) {
    var i = 0;
    while (i < t.length - 1 && (ARTICLES.indexOf(plat(t[i])) >= 0 || TITRES.indexOf(plat(t[i])) >= 0)) i++;
    return t.slice(i);
  }

  /**
   * Vrai si la bonne réponse d'une fiche à question est un nom propre court (personne, lieu, pays, programme, sigle)
   * et que les mauvaises réponses en sont aussi : la question se prête alors à une réponse écrite.
   */
  function estNom(f) {
    if (!f || typeof f.q !== 'string' || typeof f.a !== 'string' || !Array.isArray(f.x) || f.x.length < 3) return false;
    if (/\b(lequel|laquelle|lesquels|lesquelles|parmi)\b/i.test(f.q)) return false;
    var a = sansPrecision(f.a);
    if (!a || /\d/.test(a)) return false;
    var t = noyau(jetons(a)), pleins = t.filter(function (m) { return PARTICULES.indexOf(plat(m)) < 0; });
    if (!t.length || pleins.length > 4 || t.join(' ').length > 32 || PAS_UN_NOM.indexOf(plat(t[0])) >= 0 || !majuscule(t[0])) return false;
    for (var i = 1; i < t.length; i++) if (!majuscule(t[i]) && PARTICULES.indexOf(plat(t[i])) < 0 && !NUMERO.test(t[i])) return false;
    return f.x.every(function (x) { var u = noyau(jetons(x)); return u.length > 0 && majuscule(u[0]); });
  }

  /* Mots qui ne suffisent pas seuls à désigner un nom plus long : « France » pour Pierre Mendès France. */
  var TROP_VAGUE = ['france', 'libre', 'initiative', 'europe', 'shield', 'nationale', 'national'];

  /** Ce qu'on accepte pour un nom : le nom entier, et chaque fin qui commence par une majuscule ou une particule (« de Gaulle », « Gaulle »). */
  function formesNom(texte) {
    var t = noyau(jetons(texte)), r = [], i;
    if (t.length > 1 && NUMERO.test(t[t.length - 1])) t = t.slice(0, -1);
    if (!t.length) return r;
    r.push(plat(t.join(' ')));
    for (i = 1; i < t.length; i++) {
      var particule = PARTICULES.indexOf(plat(t[i])) >= 0 && t[i + 1] && majuscule(t[i + 1]);
      if (!(majuscule(t[i]) && !/^[IVX]+$/.test(t[i])) && !particule) continue;
      var fin = plat(t.slice(i).join(' '));
      if (i === t.length - 1 && (fin.length < 4 || TROP_VAGUE.indexOf(fin) >= 0)) continue;   // un seul mot : assez long et assez précis
      r.push(fin);
    }
    return r.filter(function (s, k) { return s.length >= 2 && r.indexOf(s) === k; });
  }
  /** Une réponse tapée, débarrassée des articles, des grades et d'un « Ier » final. */
  function formeDonnee(txt) {
    var t = noyau(String(txt == null ? '' : txt).split(/[\s'’]+/).filter(Boolean));
    if (t.length > 1 && NUMERO.test(t[t.length - 1])) t = t.slice(0, -1);
    return plat(t.join(' '));
  }

  /** Corrige un nom tapé : « ok » ou « ko ». f.v peut lister d'autres formes acceptées (par exemple « Bonaparte »). */
  function corrigerNom(f, txt) {
    var d = formeDonnee(txt);
    if (!d) return 'ko';
    var bonnes = formesNom(f.a).concat((f.v || []).map(formeDonnee));
    if (bonnes.indexOf(d) >= 0) return 'ok';
    var autres = [];
    (f.x || []).forEach(function (x) { autres = autres.concat(formesNom(x)); });
    if (autres.indexOf(d) >= 0) return 'ko';   // une autre réponse possible, pas une faute de frappe
    return bonnes.some(function (s) { return proche(d, s); }) ? 'ok' : 'ko';
  }

  /** Lit le champ « trou » d'une citation : le texte avec le mot à retrouver entre crochets, plusieurs réponses séparées par « | ». */
  function lireTrou(s) {
    var m = /^([^[\]]*)\[([^[\]]+)\]([^[\]]*)$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    var choix = m[2].split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    return choix.length ? { avant: m[1], mot: choix[0], choix: choix, apres: m[3] } : null;
  }
  function corrigerMot(choix, txt) {
    var d = plat(txt);
    if (!d) return 'ko';
    return choix.some(function (c) { return proche(d, plat(c)); }) ? 'ok' : 'ko';
  }

  /** Année tapée : « 1944 », « 1 944 », « -52 » ou « 52 av. J.-C. ». null si aucun nombre. */
  function lireAnnee(txt) {
    var brut = String(txt == null ? '' : txt).replace(/(\d)[\s\u00a0.](?=\d)/g, '$1'), m = /\d{1,4}/.exec(brut);
    if (!m) return null;
    var y = parseInt(m[0], 10);
    if (/^\s*[-−]/.test(brut) || /\b(av|avant)\b/.test(plat(brut))) y = -y;
    return y;
  }
  /** Juste si l'année est exacte, « presque » à un an près (cinq ans avant l'an mil), raté sinon. */
  function corrigerAnnee(attendu, txt) {
    var y = lireAnnee(txt), a = Math.floor(attendu);
    if (y === null) return 'ko';
    if (y === a) return 'ok';
    return Math.abs(y - a) <= (Math.abs(a) < 1000 ? 5 : 1) ? 'mid' : 'ko';
  }

  /**
   * Remise en ordre : trois autres repères datés du même pack, d'années toutes différentes,
   * choisis parmi les seize plus proches dans le temps. null s'il n'y en a pas assez.
   */
  function voisinsOrdre(f, faits, hasard) {
    hasard = hasard || Math.random;
    if (typeof f.y !== 'number') return null;
    var pool = faits.filter(function (x) { return x.id !== f.id && typeof x.y === 'number' && x.d; });
    pool.sort(function (a, b) { return Math.abs(a.y - f.y) - Math.abs(b.y - f.y); });
    var proches = pool.slice(0, 16), i, j, t;
    for (i = proches.length - 1; i > 0; i--) { j = Math.floor(hasard() * (i + 1)); t = proches[i]; proches[i] = proches[j]; proches[j] = t; }
    var vus = {}, r = [];
    vus[Math.floor(f.y)] = 1;
    proches.concat(pool.slice(16)).forEach(function (x) {
      var y = Math.floor(x.y);
      if (r.length < 3 && !vus[y]) { vus[y] = 1; r.push(x); }
    });
    return r.length === 3 ? r : null;
  }
  /** L'ordre attendu : identifiants triés du plus ancien au plus récent. */
  function ordreJuste(faits) { return faits.slice().sort(function (a, b) { return a.y - b.y; }).map(function (x) { return x.id; }); }

  DATA.formats = { plat: plat, distance: distance, estNom: estNom, formesNom: formesNom, corrigerNom: corrigerNom,
    lireTrou: lireTrou, corrigerMot: corrigerMot, lireAnnee: lireAnnee, corrigerAnnee: corrigerAnnee,
    voisinsOrdre: voisinsOrdre, ordreJuste: ordreJuste };
})(typeof window !== 'undefined' ? window : globalThis);
