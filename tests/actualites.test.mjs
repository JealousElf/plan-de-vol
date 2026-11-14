// Robot d'actualités (outils/actualites.mjs) : lecture des flux et choix des titres. Sans réseau.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assembler, decoder, FLUX, lireFlux } from '../outils/actualites.mjs';

const MAINTENANT = Date.parse('2026-11-14T12:00:00Z');
const RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Exemple</title>
<atom:link href="https://exemple.fr/feed/" rel="self" type="application/rss+xml"/>
<item><title><![CDATA[L'armée de l'Air reçoit son 1er Rafale F4 &amp; de nouveaux missiles]]></title>
<link>https://exemple.fr/rafale-f4</link><pubDate>Sat, 14 Nov 2026 09:30:00 +0100</pubDate><description><![CDATA[<p>Texte</p>]]></description></item>
<item><title>Le Sénat adopte la loi de programmation&#8230; en première lecture</title>
<link>https://exemple.fr/lpm</link><guid isPermaLink="false">12345</guid><pubDate>Fri, 13 Nov 2026 18:00:00 GMT</pubDate></item>
<item><title>Un article trop ancien pour être gardé</title><link>https://exemple.fr/vieux</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title>
<entry><title type="html">Lancement réussi d&amp;#8217;Ariane 6 depuis Kourou</title>
<link rel="replies" href="https://exemple.org/commentaires"/><link rel="alternate" type="text/html" href="https://exemple.org/ariane-6"/>
<updated>2026-11-14T06:00:00Z</updated></entry>
<entry><title>Entrée sans lien utilisable</title><updated>2026-11-14T06:00:00Z</updated></entry>
</feed>`;

test('decoder : CDATA, balises et entités, y compris encodées deux fois', () => {
  assert.equal(decoder('<![CDATA[Paix &amp; guerre]]>'), 'Paix & guerre');
  assert.equal(decoder('L&#8217;OTAN &laquo;&nbsp;en alerte&nbsp;&raquo;'), 'L’OTAN « en alerte »');
  assert.equal(decoder('d&amp;#8217;Ariane'), 'd’Ariane');
  assert.equal(decoder('<b>Titre</b>   en   gras'), 'Titre en gras');
});

test('lireFlux : RSS 2.0 et Atom', () => {
  const rss = lireFlux(RSS);
  assert.equal(rss.length, 3);
  assert.deepEqual(rss[0], { t: 'L\'armée de l\'Air reçoit son 1er Rafale F4 & de nouveaux missiles', u: 'https://exemple.fr/rafale-f4', d: 'Sat, 14 Nov 2026 09:30:00 +0100' });
  assert.equal(rss[1].t, 'Le Sénat adopte la loi de programmation… en première lecture');
  const atom = lireFlux(ATOM);
  assert.deepEqual(atom[0], { t: 'Lancement réussi d’Ariane 6 depuis Kourou', u: 'https://exemple.org/ariane-6', d: '2026-11-14T06:00:00Z' });
  assert.equal(atom[1].u, '');
  assert.deepEqual(lireFlux('<html>pas un flux</html>'), []);
});

test('assembler : récents, en https, sans doublon, plafonnés par source et par thème, du plus récent au plus ancien', () => {
  const r = assembler([
    { flux: { s: 'Exemple', th: 'def' }, items: lireFlux(RSS) },
    { flux: { s: 'Autre', th: 'aero' }, items: lireFlux(ATOM) },
    { flux: { s: 'Copie', th: 'pol' }, items: [{ t: 'Le Sénat adopte la loi de programmation… en première lecture !', u: 'https://copie.fr/lpm', d: '2026-11-14T10:00:00Z' },
      { t: 'Un lien non sécurisé à écarter', u: 'http://copie.fr/x', d: '2026-11-14T10:00:00Z' },
      { t: 'Une date à venir, mal réglée', u: 'https://copie.fr/futur', d: '2026-11-20T10:00:00Z' }] },
  ], MAINTENANT);
  assert.equal(r.maj, '2026-11-14T12:00:00.000Z');
  assert.deepEqual(r.articles.map((a) => a.u), ['https://exemple.fr/rafale-f4', 'https://exemple.org/ariane-6', 'https://exemple.fr/lpm']);
  assert.deepEqual(r.articles[0], { t: 'L\'armée de l\'Air reçoit son 1er Rafale F4 & de nouveaux missiles', u: 'https://exemple.fr/rafale-f4', s: 'Exemple', th: 'def', d: '2026-11-14T08:30:00.000Z' });

  const beaucoup = (s, th, n) => ({ flux: { s, th }, items: Array.from({ length: n }, (_, i) => ({ t: `${s} : titre numéro ${i}`, u: `https://${s}.fr/${i}`, d: new Date(MAINTENANT - i * 60000).toISOString() })) });
  const g = assembler([beaucoup('un', 'int', 10), beaucoup('deux', 'int', 10), beaucoup('trois', 'int', 10)], MAINTENANT);
  assert.equal(g.articles.length, 12, '12 titres au plus par thème');
  assert.ok(['un', 'deux', 'trois'].every((s) => g.articles.filter((a) => a.s === s).length <= 6), '6 au plus par source');
  assert.ok(g.articles.every((a, i) => i === 0 || a.d <= g.articles[i - 1].d));
});

test('les flux sont en https et chaque thème a plusieurs sources', () => {
  assert.ok(FLUX.every((f) => /^https:\/\//.test(f.u) && f.s && ['def', 'int', 'aero', 'pol'].includes(f.th)));
  for (const th of ['def', 'int', 'aero', 'pol']) assert.ok(FLUX.filter((f) => f.th === th).length >= 3, th);
});
