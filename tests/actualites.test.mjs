// Robot d'actualités (outils/actualites.mjs) : lecture des flux et choix des titres. Sans réseau.
import test from 'node:test';
import assert from 'node:assert/strict';
import { choisir, decoder, FLUX, imageDansHtml, imageDuFlux, lireFlux, mots, propre } from '../outils/actualites.mjs';

const MAINTENANT = Date.parse('2026-11-14T12:00:00Z');
const RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Exemple</title>
<atom:link href="https://exemple.fr/feed/" rel="self" type="application/rss+xml"/>
<item><title><![CDATA[L'armée de l'Air reçoit son 1er Rafale F4 &amp; de nouveaux missiles]]></title>
<link>https://exemple.fr/rafale-f4</link><pubDate>Sat, 14 Nov 2026 09:30:00 +0100</pubDate><description><![CDATA[<p>Texte</p>]]></description>
<media:content url="https://img.exemple.fr/1200.jpg" medium="image" width="1200" height="600"/><media:content url="https://img.exemple.fr/644.jpg" medium="image" width="644" height="322"/></item>
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

test('lireFlux : RSS 2.0 et Atom, avec résumé et image', () => {
  const rss = lireFlux(RSS);
  assert.equal(rss.length, 3);
  assert.deepEqual(rss[0], { t: 'L\'armée de l\'Air reçoit son 1er Rafale F4 & de nouveaux missiles', u: 'https://exemple.fr/rafale-f4', d: 'Sat, 14 Nov 2026 09:30:00 +0100', x: 'Texte', i: 'https://img.exemple.fr/644.jpg' });
  assert.equal(rss[1].t, 'Le Sénat adopte la loi de programmation… en première lecture');
  assert.equal(rss[1].i, '');
  const atom = lireFlux(ATOM);
  assert.deepEqual([atom[0].t, atom[0].u, atom[0].d], ['Lancement réussi d’Ariane 6 depuis Kourou', 'https://exemple.org/ariane-6', '2026-11-14T06:00:00Z']);
  assert.equal(atom[1].u, '');
  assert.deepEqual(lireFlux('<html>pas un flux</html>'), []);
});

test('images : flux, contenu de l\'article et page de partage, toujours en https', () => {
  assert.equal(imageDuFlux('<item><enclosure url="http://cdn.fr/a.jpg" type="image/jpeg" length="1"/></item>'), 'https://cdn.fr/a.jpg');
  assert.equal(imageDuFlux('<item><enclosure url="https://cdn.fr/a.mp3" type="audio/mpeg"/></item>'), '');
  assert.equal(imageDuFlux('<item><media:thumbnail url="https://cdn.fr/vignette.jpg"/></item>'), 'https://cdn.fr/vignette.jpg');
  assert.equal(imageDuFlux('<item><content:encoded><![CDATA[<p><img class="x" src="https://blog.fr/wp/photo-300x200.jpg"></p>]]></content:encoded></item>'), 'https://blog.fr/wp/photo-300x200.jpg');
  assert.equal(imageDuFlux('<item><description>&lt;img src=&quot;https://blog.fr/b.png&quot;&gt;</description></item>'), 'https://blog.fr/b.png');
  assert.equal(imageDansHtml('<head><meta content="https://media.fr/partage.jpg?w=1200&amp;h=630" property="og:image"></head>'), 'https://media.fr/partage.jpg?w=1200&h=630');
  assert.equal(imageDansHtml('<meta name="twitter:image" content="//media.fr/t.jpg">'), 'https://media.fr/t.jpg');
  assert.equal(imageDansHtml('<meta property="og:title" content="Titre">'), '');
  assert.equal(propre('javascript:alert(1)'), '');
});

test('mots : sans accents ni mots vides, au singulier', () => {
  assert.deepEqual([...mots('Guerre en Ukraine : des frappes russes sur Kiev, l\'armée française en alerte')], ['guerre', 'ukraine', 'frappe', 'russe', 'kiev', 'armee', 'francaise', 'alerte']);
});

test('choisir : les histoires reprises par plusieurs médias d\'abord, deux par thème au plus, une de défense, avec image', () => {
  const il = (h) => new Date(MAINTENANT - h * 3600000).toISOString();
  const art = (t, u, h, x = '', i = '') => ({ t, u, d: il(h), x, i });
  const politique = Array.from({ length: 6 }, (_, k) => art(`Assemblée : débat numéro ${k} sur un texte différent ${['agricole', 'scolaire', 'fiscal', 'routier', 'culturel', 'sportif'][k]}`, `https://pol.fr/${k}`, k + 1));
  const mots30 = 'abeille baleine castor dauphin elephant faucon girafe hibou iguane jaguar koala lezard marmotte narval otarie panthere quokka renard salamandre tapir urubu vautour wapiti xerus yack zebre alpaga bison chamois daim'.split(' ');
  const bruit = mots30.map((m, k) => art(`Chronique animalière : portrait du ${m}`, `https://bruit.fr/${k}`, 30 + k));
  const r = choisir([
    { flux: { s: 'Le Monde', une: true }, items: [art('Ukraine : nuit de frappes massives sur Kiev', 'https://lemonde.fr/ukraine-kiev?xtor=RSS', 2), art('Mali : la junte annonce des élections', 'https://lemonde.fr/mali', 3)] },
    { flux: { s: 'Le Monde', th: 'int' }, items: [art('Ukraine : nuit de frappes massives sur Kiev', 'https://lemonde.fr/ukraine-kiev', 2, 'Des drones et missiles russes ont visé la capitale ukrainienne.', 'https://img.lemde.fr/kiev.jpg'),
      art('Mali : la junte annonce des élections pour 2027', 'https://lemonde.fr/mali', 3), art('Japon : un séisme sans victime au large', 'https://lemonde.fr/japon', 1)] },
    { flux: { s: 'RFI', th: 'int' }, items: [art('Ukraine : Kiev visée par des frappes massives de drones russes', 'https://rfi.fr/kiev', 3)] },
    { flux: { s: 'franceinfo', th: 'int' }, items: [art('Guerre en Ukraine : des frappes russes massives sur Kiev font plusieurs morts', 'https://franceinfo.fr/kiev', 1)] },
    { flux: { s: 'Zone Militaire', th: 'def' }, items: [art('La DGA commande de nouveaux Rafale pour l\'armée de l\'Air', 'https://opex360.com/rafale', 20, '', '')] },
    { flux: { s: 'Public Sénat', th: 'pol' }, items: politique },
    { flux: { s: 'Bruit', th: 'aero' }, items: [...bruit, art('EN DIRECT, guerre en Ukraine : frappes massives sur Kiev', 'https://bruit.fr/direct', 1)] },
    { flux: { s: 'Ancien', th: 'pol' }, items: [art('Une histoire trop ancienne mais reprise partout', 'https://vieux.fr/1', 80)] },
  ], MAINTENANT);
  assert.equal(r.articles.length, 5);
  assert.deepEqual(r.articles[0], { t: 'Ukraine : nuit de frappes massives sur Kiev', u: 'https://lemonde.fr/ukraine-kiev', s: 'Le Monde', th: 'int', d: il(2), n: 3, i: 'https://img.lemde.fr/kiev.jpg' });
  assert.equal(r.articles[1].u, 'https://lemonde.fr/mali', 'à la une : passe avant les autres histoires d\'un seul média');
  assert.equal(r.articles.filter((a) => a.th === 'int').length, 2, 'deux histoires par thème au plus');
  assert.ok(r.articles.some((a) => a.th === 'def'), 'au moins une histoire de défense');
  assert.equal(new Set(r.articles.map((a) => a.u)).size, 5);
  assert.ok(!r.articles.some((a) => /kiev/.test(a.u) && a.u !== 'https://lemonde.fr/ukraine-kiev'), 'une seule carte par histoire');
  assert.ok(r.detail[0].une && r.detail[0].groupe.length === 3);
});

test('les flux sont en https, chaque thème a plusieurs sources, et deux pages « à la une » signalent l\'importance', () => {
  const themes = FLUX.filter((f) => !f.une);
  assert.ok(FLUX.every((f) => /^https:\/\//.test(f.u) && f.s));
  assert.ok(themes.every((f) => ['def', 'int', 'aero', 'pol'].includes(f.th)));
  for (const th of ['def', 'int', 'aero', 'pol']) assert.ok(themes.filter((f) => f.th === th).length >= 3, th);
  assert.equal(FLUX.filter((f) => f.une).length, 2);
});
