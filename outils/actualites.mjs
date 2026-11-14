// Plan de vol : récupère les gros titres de l'actualité (flux RSS ou Atom) et écrit data/news.json.
// Lancé par .github/workflows/actualites.yml plusieurs fois par jour. Aucune dépendance : Node 22 suffit.
//   node outils/actualites.mjs [data/news.json]
// Seuls le titre, le lien, la source et la date sont gardés : l'application renvoie vers l'article d'origine.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* th : def (défense et armées), int (international), aero (aéronautique et spatial), pol (politique française). */
export const FLUX = [
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

export const REGLES = { heures: 72, parSource: 6, parTheme: 12, total: 48 };

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

/** Les articles d'un flux RSS 2.0 ou Atom : [{ t, u, d }], d étant la date telle que le flux la donne. */
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
    return { t: champ('title'), u, d: champ('pubDate') || champ('dc:date') || champ('published') || champ('updated') };
  });
}

function cleTitre(t) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Choisit les titres à publier. resultats : [{ flux: { s, th }, items: [{ t, u, d }] }].
 * Récents (moins de 72 h), en https, sans doublon ; au plus 6 par source et 12 par thème ; du plus récent au plus ancien.
 */
export function assembler(resultats, maintenant = Date.now(), regles = REGLES) {
  const limite = maintenant - regles.heures * 3600000, liens = new Set(), titres = new Set(), parTheme = {};
  for (const { flux, items } of resultats) {
    const retenus = [];
    for (const a of items || []) {
      const ts = Date.parse(a.d);
      const t = (a.t || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length < 12 || !/^https:\/\//.test(a.u || '') || isNaN(ts) || ts < limite || ts > maintenant + 3600000) continue;
      const cle = cleTitre(t);
      if (liens.has(a.u) || titres.has(cle)) continue;
      liens.add(a.u); titres.add(cle);
      retenus.push({ t: t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, '') + '…' : t, u: a.u, s: flux.s, th: flux.th, ts });
    }
    retenus.sort((x, y) => y.ts - x.ts);
    (parTheme[flux.th] = parTheme[flux.th] || []).push(...retenus.slice(0, regles.parSource));
  }
  const tous = [];
  for (const th of Object.keys(parTheme)) tous.push(...parTheme[th].sort((x, y) => y.ts - x.ts).slice(0, regles.parTheme));
  tous.sort((x, y) => y.ts - x.ts);
  return {
    maj: new Date(maintenant).toISOString(),
    articles: tous.slice(0, regles.total).map(({ ts, ...a }) => ({ ...a, d: new Date(ts).toISOString() })),
  };
}

async function recuperer(flux) {
  const r = await fetch(flux.u, {
    headers: { 'user-agent': 'PlanDeVol/1.0 (+https://github.com/JealousElf/plan-de-vol)', accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5' },
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
      console.log(`ok     ${String(items.length).padStart(3)} articles  ${flux.s} [${flux.th}]  ${flux.u}`);
      return { flux, items };
    } catch (e) {
      console.log(`ÉCHEC               ${flux.s} [${flux.th}]  ${flux.u} : ${e.message}`);
      return { flux, items: [] };
    }
  }));
  const n = assembler(resultats);
  const compte = {};
  n.articles.forEach((a) => { compte[a.th] = (compte[a.th] || 0) + 1; });
  console.log('Titres retenus par thème :', JSON.stringify(compte));
  if (n.articles.length < 5) { console.log('Trop peu de titres : le fichier reste inchangé.'); process.exit(0); }
  if (existsSync(sortie)) {
    try {
      const avant = JSON.parse(readFileSync(sortie, 'utf8'));
      if (JSON.stringify(avant.articles) === JSON.stringify(n.articles)) { console.log('Aucun nouveau titre.'); process.exit(0); }
    } catch { /* fichier illisible : on le remplace */ }
  }
  writeFileSync(sortie, JSON.stringify(n, null, 1) + '\n');
  console.log(`${n.articles.length} titres écrits dans ${sortie}.`);
}
