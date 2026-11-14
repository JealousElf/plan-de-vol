// Plan de vol : choisit les cinq actualités les plus importantes des derniers jours et écrit data/news.json.
// Lancé par .github/workflows/actualites.yml plusieurs fois par jour. Aucune dépendance : Node 22 suffit.
//   node outils/actualites.mjs [data/news.json]
// Importance : une histoire reprise par plusieurs médias, ou mise à la une, passe devant les autres. On garde au plus
// deux histoires par thème, dont au moins une de défense. Seuls le titre, le lien, la source, la date et l'adresse de
// l'image d'illustration publiée par le média sont gardés : l'application renvoie vers l'article d'origine.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* th : def (défense et armées), int (international), aero (aéronautique et spatial), pol (politique française). */
export const FLUX = [
  /* Pages « à la une » : elles ne fournissent pas d'articles, elles signalent ce que les rédactions mettent en avant. */
  { u: 'https://www.lemonde.fr/rss/une.xml', s: 'Le Monde', une: true },
  { u: 'https://www.francetvinfo.fr/titres.rss', s: 'franceinfo', une: true },
  { u: 'https://www.opex360.com/feed/', s: 'Zone Militaire', th: 'def' },
  { u: 'https://www.forcesoperations.com/feed/', s: 'Forces Operations Blog', th: 'def' },
  { u: 'https://www.areion24.news/feed/', s: 'Areion24', th: 'def' },
  { u: 'https://theatrum-belli.com/feed/', s: 'Theatrum Belli', th: 'def' },
  { u: 'https://www.lemonde.fr/international/rss_full.xml', s: 'Le Monde', th: 'int' },
  { u: 'https://www.francetvinfo.fr/monde.rss', s: 'franceinfo', th: 'int' },
  { u: 'https://www.rfi.fr/fr/monde/rss', s: 'RFI', th: 'int' },
  { u: 'https://legrandcontinent.eu/fr/feed/', s: 'Le Grand Continent', th: 'int' },
  { u: 'https://www.air-journal.fr/feed', s: 'Air Journal', th: 'aero' },
  { u: 'https://www.aerobuzz.fr/feed/', s: 'Aerobuzz', th: 'aero' },
  { u: 'https://www.lemonde.fr/espace/rss_full.xml', s: 'Le Monde', th: 'aero' },
  { u: 'https://www.lemonde.fr/politique/rss_full.xml', s: 'Le Monde', th: 'pol' },
  { u: 'https://www.francetvinfo.fr/politique.rss', s: 'franceinfo', th: 'pol' },
  { u: 'https://www.publicsenat.fr/feed', s: 'Public Sénat', th: 'pol' },
];

export const REGLES = { heures: 72, nombre: 5, parTheme: 2, seuil: 5, commun: 0.2, une: 1.5 };

const ENTITES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  hellip: '…', ndash: '–', mdash: '—', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', ccedil: 'ç', icirc: 'î',
  iuml: 'ï', ocirc: 'ô', ucirc: 'û', ugrave: 'ù', oelig: 'œ', Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedil: 'Ç',
};

/** Texte lisible à partir d'un champ XML : sections CDATA, balises HTML et entités. */
export function decoder(t) {
  let s = String(t || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ');
  for (let i = 0; i < 2; i++) {   // deux passes : certains flux encodent deux fois (&amp;#8217;)
    s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
      .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITES ? ENTITES[n] : m));
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** Les articles d'un flux RSS 2.0 ou Atom : [{ t, u, d, x, i }] : d, la date telle que le flux la donne ; x, le début du résumé ; i, l'image proposée. */
export function lireFlux(xml) {
  const blocs = String(xml || '').match(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];
  return blocs.map((b) => {
    const champ = (nom) => {
      const m = b.match(new RegExp('<' + nom + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + nom + '>', 'i'));
      return m ? decoder(m[1]) : '';
    };
    let u = champ('link');
    if (!/^https?:\/\//.test(u)) {
      const liens = b.match(/<link\b[^>]*>/gi) || [];
      const bon = liens.find((l) => !/\brel="/i.test(l) || /\brel="alternate"/i.test(l));
      const href = bon && bon.match(/\bhref="([^"]+)"/i);
      u = href ? decoder(href[1]) : '';
    }
    if (!/^https?:\/\//.test(u)) { const g = champ('guid'); if (/^https?:\/\//.test(g)) u = g; }
    const resume = champ('description') || champ('summary') || champ('content:encoded') || champ('content');
    return { t: champ('title'), u, d: champ('pubDate') || champ('dc:date') || champ('published') || champ('updated'), x: resume.slice(0, 400), i: imageDuFlux(b) };
  });
}

/** Adresse d'image utilisable dans une page https, ou chaîne vide. */
export function propre(u) {
  u = String(u || '').trim().replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  if (u.startsWith('http://')) u = 'https://' + u.slice(7);
  return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '';
}

/** L'image d'un article de flux : media:content, media:thumbnail, enclosure image, sinon première <img> du contenu. */
export function imageDuFlux(bloc) {
  const vues = [];
  for (const m of String(bloc).matchAll(/<(media:content|media:thumbnail|enclosure)\b([^>]*)>/gi)) {
    const attr = (n) => (m[2].match(new RegExp('\\b' + n + '="([^"]*)"', 'i')) || [])[1] || '';
    const balise = m[1].toLowerCase(), type = attr('type'), medium = attr('medium');
    if (balise === 'enclosure' && !/^image\//i.test(type)) continue;
    if ((medium && medium !== 'image') || (type && !/^image\//i.test(type))) continue;
    const url = propre(attr('url'));
    if (url) vues.push({ url, l: +attr('width') || 0 });
  }
  if (vues.length) {   // la plus petite d'au moins 300 px de large, sinon la plus grande
    const assez = vues.filter((v) => v.l >= 300).sort((a, b) => a.l - b.l);
    return (assez[0] || vues.sort((a, b) => b.l - a.l)[0]).url;
  }
  const brut = String(bloc).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const img = brut.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return img ? propre(img[1]) : '';
}

/** L'image de partage d'une page d'article (og:image ou twitter:image). */
export function imageDansHtml(html) {
  for (const meta of String(html).match(/<meta\b[^>]*>/gi) || []) {
    if (!/\b(?:property|name)=["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/i.test(meta)) continue;
    const c = meta.match(/\bcontent=["']([^"']+)["']/i);
    const u = c && propre(c[1]);
    if (u) return u;
  }
  return '';
}

const VIDES = new Set(('alors aussi autre autres avant avec avoir bien cela celle celles celui cette ceux chez comme comment contre '
  + 'dans depuis donc dont elle elles encore entre etre fait faire font leur leurs lors mais meme moins notre nous plus pour pourquoi '
  + 'quand quel quelle quelles quels sans selon sera seront sont sous tous tout toute toutes tres vers votre vous apres deja jour '
  + 'jours annee annees fois face grand grande grands grandes petit petite nouveau nouvelle nouveaux nouvelles premier premiere '
  + 'dernier derniere deux trois quatre cinq heure heures direct video videos photo photos ainsi doit peut veut faut cest quil '
  + 'etait avait aura ceci semaine semaines mois lundi mardi mercredi jeudi vendredi samedi dimanche selon article lire suite '
  + 'with that this from have will they their about after over more than when would been says said').split(' '));

/** Les mots significatifs d'un texte : sans accents, sans mots vides, au singulier approximatif. */
export function mots(texte) {
  const m = new Set();
  for (let w of String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length < 4 || VIDES.has(w) || /^\d+$/.test(w)) continue;
    if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1);
    m.add(w);
  }
  return m;
}

const sansParam = (u) => String(u).replace(/[?#].*$/, '').replace(/\/$/, '');
const court = (t) => (t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, '') + '…' : t);

/**
 * Choisit les actualités à publier. resultats : [{ flux: { s, th, une }, items: [{ t, u, d, x, i }] }].
 * Deux articles racontent la même histoire quand leurs titres ont au moins trois mots significatifs en commun et que
 * ces mots pèsent assez lourd (les mots rares comptent plus que les mots fréquents dans l'ensemble des articles).
 * Les directs, vidéos et revues de presse sont écartés : leurs titres ne racontent pas une histoire. Une histoire vaut le nombre de
 * médias qui la racontent, plus un bonus si elle est à la une, plus un peu de fraîcheur.
 * Renvoie { maj, articles: [{ t, u, s, th, d, n, i? }], detail } ; detail sert au journal du robot.
 */
export function choisir(resultats, maintenant = Date.now(), regles = REGLES) {
  const limite = maintenant - regles.heures * 3600000, alaune = new Set(), vus = new Set(), articles = [];
  for (const { flux, items } of resultats) {
    for (const a of items || []) {
      const ts = Date.parse(a.d), t = String(a.t || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length < 12 || !/^https:\/\//.test(a.u || '') || isNaN(ts) || ts < limite || ts > maintenant + 3600000) continue;
      const cle = sansParam(a.u);
      if (flux.une) { alaune.add(cle); continue; }
      if (vus.has(cle) || /^(en direct|direct|vid[ée]o|podcast|replay|infographie|à la une\s*:)/i.test(t)) continue;
      vus.add(cle);   // le même article peut figurer dans deux rubriques du même média
      articles.push({ t, u: a.u, cle, s: flux.s, th: flux.th, ts, i: propre(a.i), titre: mots(t) });
    }
  }
  const N = articles.length, df = new Map();
  for (const a of articles) for (const m of a.titre) df.set(m, (df.get(m) || 0) + 1);
  const poids = (m) => { const f = df.get(m) || 0; return f < 2 || f > Math.max(5, regles.commun * N) ? 0 : Math.log(N / f); };
  const proches = (a, b) => {
    let s = 0, n = 0;
    for (const m of a.titre) if (b.titre.has(m)) { const p = poids(m); if (p > 0) { s += p; n++; } }
    return n >= 3 && s >= regles.seuil;
  };
  for (const a of articles) a.voisins = articles.filter((b) => b !== a && proches(a, b));
  const pris = new Set(), parTheme = {}, choisis = [];
  const groupe = (a) => [a, ...a.voisins.filter((b) => !pris.has(b))];
  const valeur = (a) => {
    const g = groupe(a), recent = Math.max(...g.map((b) => b.ts));
    return new Set(g.map((b) => b.s)).size + (g.some((b) => alaune.has(b.cle)) ? regles.une : 0)
      + 0.5 * Math.max(0, 1 - (maintenant - recent) / (regles.heures * 3600000)) + 0.01 * g.length;
  };
  while (choisis.length < regles.nombre) {
    let restants = articles.filter((a) => !pris.has(a) && (parTheme[a.th] || 0) < regles.parTheme);
    if (!restants.length) break;
    const sansDefense = !choisis.some((c) => c.a.th === 'def');
    if (sansDefense && choisis.length === regles.nombre - 1 && restants.some((a) => a.th === 'def')) restants = restants.filter((a) => a.th === 'def');
    let meilleur = restants[0], v = valeur(meilleur);
    for (const a of restants) { const x = valeur(a); if (x > v) { v = x; meilleur = a; } }
    const g = groupe(meilleur);
    g.forEach((b) => pris.add(b));
    parTheme[meilleur.th] = (parTheme[meilleur.th] || 0) + 1;
    choisis.push({ a: meilleur, g, v });
  }
  return {
    maj: new Date(maintenant).toISOString(),
    articles: choisis.map(({ a, g }) => {
      const sortie = { t: court(a.t), u: a.u, s: a.s, th: a.th, d: new Date(a.ts).toISOString(), n: new Set(g.map((b) => b.s)).size };
      if (a.i) sortie.i = a.i;
      return sortie;
    }),
    detail: choisis.map(({ a, g, v }) => ({ v: Math.round(v * 100) / 100, une: g.some((b) => alaune.has(b.cle)), groupe: g.map((b) => b.s + ' : ' + b.t), secours: (g.find((b) => b !== a && b.i) || {}).i || '' })),
  };
}

const UA = 'PlanDeVol/1.0 (+https://github.com/JealousElf/plan-de-vol)';

async function recuperer(flux) {
  const r = await fetch(flux.u, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return lireFlux(await r.text());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sortie = process.argv[2] || 'data/news.json';
  const resultats = await Promise.all(FLUX.map(async (flux) => {
    try {
      const items = await recuperer(flux);
      console.log(`ok     ${String(items.length).padStart(3)} articles  ${flux.s} [${flux.th || 'à la une'}]  ${flux.u}`);
      return { flux, items };
    } catch (e) {
      console.log(`ÉCHEC               ${flux.s} [${flux.th || 'à la une'}]  ${flux.u} : ${e.message}`);
      return { flux, items: [] };
    }
  }));
  const n = choisir(resultats);
  for (const [k, a] of n.articles.entries()) {
    if (!a.i) {   // pas d'image dans le flux : celle que le média donne pour le partage de l'article, sinon celle d'un autre média
      try {
        const r = await fetch(a.u, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
        if (r.ok) a.i = imageDansHtml((await r.text()).slice(0, 400000)) || undefined;
      } catch { /* page injoignable */ }
      if (!a.i && n.detail[k].secours) a.i = n.detail[k].secours;
      if (!a.i) delete a.i;
    }
    const d = n.detail[k];
    console.log(`\n${k + 1}. [${a.th}] ${a.n} média(s)${d.une ? ', à la une' : ''}, valeur ${d.v}${a.i ? '' : ', sans image'}\n   ${a.s} : ${a.t}`);
    d.groupe.slice(1, 7).forEach((l) => console.log('     ~ ' + l));
  }
  delete n.detail;
  if (n.articles.length < 3) { console.log('Trop peu d\'actualités : le fichier reste inchangé.'); process.exit(0); }
  if (existsSync(sortie)) {
    try {
      const avant = JSON.parse(readFileSync(sortie, 'utf8'));
      if (JSON.stringify(avant.articles) === JSON.stringify(n.articles)) { console.log('\nAucun changement.'); process.exit(0); }
    } catch { /* fichier illisible : on le remplace */ }
  }
  writeFileSync(sortie, JSON.stringify(n, null, 1) + '\n');
  console.log(`\n${n.articles.length} actualités écrites dans ${sortie}.`);
}
