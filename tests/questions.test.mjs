// Fabrication des questions (questions.js) : formes possibles, choix du format, questions et propositions. Sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['formats.js', 'seance.js', 'questions.js']) vm.runInThisContext(readFileSync(join(racine, f), 'utf8'));
const Q = globalThis.PDV.questions;

/** Un hasard prévisible, pour des tirages reproductibles. */
function graine(g) { return () => { g = (g * 16807) % 2147483647; return (g - 1) / 2147483646; }; }
const datee = (id, y, d, plus = {}) => ({ id, t: 'Événement ' + id, y, d, r: 'Résumé.', ...plus });
const PACKS = [
  { id: 'h', titre: 'Histoire', faits: [datee('h1', 1914, 'début de la Grande Guerre'), datee('h2', 1918, 'armistice'), datee('h3', 1940, 'appel du 18 juin', { y2: 1940 }),
    datee('h4', 1944, 'débarquement en Normandie'), datee('h5', 1958, 'naissance de la Ve République'), datee('h6', 1962, 'accords d\'Évian', { y2: 1964 }),
    datee('h7', -52, 'reddition de Vercingétorix')] },
  { id: 'c', titre: 'Conflits', statuts: true, maj: '2026-11-01', faits: [datee('c1', 1991, 'guerre du Golfe', { st: 'fin' }), datee('c2', 1999, 'guerre du Kosovo', { st: 'fin' }),
    datee('c3', 2001, 'guerre d\'Afghanistan', { st: 'fin' }), datee('c4', 2022, 'invasion de l\'Ukraine', { st: 'cours' })] },
  { id: 'q', titre: 'Citations', faits: [
    { id: 'q1', t: 'Appel', r: '', g: 'Citation', q: 'Qui a lancé l\'appel du 18 juin 1940 ?', a: 'Charles de Gaulle', x: ['Philippe Pétain', 'Paul Reynaud', 'Maxime Weygand'], trou: 'La France a perdu une [bataille] !' },
    { id: 'q2', t: 'Ve République', r: '', q: 'En quelle année la Ve République est-elle fondée ?', a: '1958', x: ['1946', '1962', '1969'] },
    { id: 'q3', t: 'Avion', r: '', q: 'Lequel de ces avions est français ?', a: 'Rafale', x: ['Typhoon', 'Gripen', 'F-35'] }] },
  { id: 'p', titre: 'Petit pack', faits: [datee('p1', 2010, 'un'), datee('p2', 2010, 'deux')] },
];
// comme indexer() dans app.js : chaque fiche connaît son pack, chaque pack son nombre d'années différentes
for (const p of PACKS) { const ans = new Set(); for (const f of p.faits) { f.pack = p.id; if (Q.aDate(f)) ans.add(Math.floor(f.y)); } p.ny = ans.size; }
const F = Object.fromEntries(PACKS.flatMap((p) => p.faits.map((f) => [f.id, f])));
const fabrique = (o = {}) => Q.creer({ pack: (id) => PACKS.find((p) => p.id === id), hasard: graine(o.graine || 11), ...o });
const bonnes = (q) => q.opts.filter((o) => o.ok).map((o) => o.t);
const valeur = (t) => (/av\. J\.-C\./.test(t) ? -parseInt(t, 10) : +t);

test('choix multiples possibles : selon que la fiche a une question ou une date, et selon son pack', () => {
  const QS = fabrique();
  assert.deepEqual(QS.formats(F.h1), ['quoi', 'quand']);
  assert.deepEqual(QS.formats(F.q1), ['sur']);
  assert.deepEqual(QS.formats(F.p1), [], 'pack trop petit : ni événement ni année');
  assert.equal(QS.qcm(F.p1), 'ouverte');
  assert.equal(QS.qcm(F.q2), 'sur');
});

test('formats à écrire possibles : citation à trous, nom, année, remise en ordre', () => {
  const QS = fabrique();
  assert.deepEqual(QS.libres(F.q1), ['trou', 'nom']);
  assert.deepEqual(QS.libres(F.q2), ['annee'], 'une réponse qui est une année');
  assert.deepEqual(QS.libres(F.q3), [], '« Lequel » : pas de nom à écrire');
  assert.deepEqual(QS.libres(F.h1), ['annee', 'ordre']);
  assert.deepEqual(QS.libres(F.p1), []);
});

test('choix du format : la part des formats à écrire est respectée', () => {
  const jamais = fabrique({ part: () => 0 }), toujours = fabrique({ part: () => 1 });
  for (let i = 0; i < 20; i++) {
    assert.ok(['quoi', 'quand'].includes(jamais.choisirFormat(F.h1)));
    assert.ok(['annee', 'ordre'].includes(toujours.choisirFormat(F.h1)));
  }
  assert.equal(toujours.choisirFormat(F.q3), 'sur', 'rien à écrire possible : le choix multiple');
  assert.equal(toujours.choisirFormat(F.p1), 'ouverte');
});

test('entrée de séance : à voix haute une fois la fiche acquise, plus difficile à partir de l\'étape 2', () => {
  const QS = fabrique({ part: () => 0 });
  assert.deepEqual(QS.item(F.h1, { b: 4 }), { id: 'h1', fmt: 'ouverte', dur: true });
  const neuve = QS.item(F.h1, null);
  assert.equal(neuve.dur, false);
  assert.ok(['quoi', 'quand'].includes(neuve.fmt));
  assert.equal(fabrique({ hasard: () => 0.1 }).item(F.c4, { b: 1 }).fmt, 'encours', 'un conflit en cours peut être demandé comme tel');
});

test('année : quatre propositions distinctes et rangées, une seule juste, jamais dans le futur ni en l\'an zéro', () => {
  const max = new Date().getFullYear();
  for (const g of [1, 2, 3, 4, 5, 6]) {
    const QS = fabrique({ graine: g });
    for (const [id, dur, juste] of [['h1', false, '1914'], ['h7', true, '52 av. J.-C.'], ['c4', false, '2022']]) {
      const q = QS.question(F[id], { fmt: 'quand', dur }), v = q.opts.map((o) => valeur(o.t));
      assert.equal(new Set(v).size, 4);
      assert.deepEqual(v, v.slice().sort((a, b) => a - b));
      assert.ok(v.every((y) => y !== 0 && y <= max), v.join(' '));
      assert.deepEqual(bonnes(q), [juste]);
    }
  }
  assert.equal(fabrique().question(F.h3, { fmt: 'quand' }).petit, 'En quelle année ?');
  assert.equal(fabrique().question(F.h6, { fmt: 'quand' }).petit, 'En quelle année cela commence-t-il ?');
});

test('événement : la bonne fiche et trois autres du même pack, d\'autres années', () => {
  const q = fabrique().question(F.h4, { fmt: 'quoi', dur: true });
  assert.deepEqual([q.petit, q.grand, q.opts.length], ['Quel événement ?', 'Débarquement en Normandie', 4]);
  assert.deepEqual(bonnes(q), ['Événement h4']);
  const autres = q.opts.filter((o) => !o.ok).map((o) => PACKS[0].faits.find((f) => f.t === o.t));
  assert.ok(autres.every((f) => f && f.y !== 1944));
  assert.equal(fabrique().question(F.c1, { fmt: 'quoi' }).petit, 'Quel conflit ?');
});

test('question de la fiche : la bonne réponse parmi trois autres, les années rangées dans l\'ordre', () => {
  const QS = fabrique();
  const q = QS.question(F.q2, { fmt: 'sur' });
  assert.deepEqual(q.opts.map((o) => o.t), ['1946', '1958', '1962', '1969']);
  assert.deepEqual([bonnes(q), q.deux], [['1958'], true]);
  const n = QS.question(F.q1, { fmt: 'sur' });
  assert.deepEqual(n.opts.map((o) => o.t).sort(), ['Charles de Gaulle', 'Maxime Weygand', 'Paul Reynaud', 'Philippe Pétain']);
  assert.deepEqual([n.petit, n.deux], ['Citation', false]);
});

test('conflit en cours : la situation datée, un seul conflit qui dure encore', () => {
  const q = fabrique().question(F.c4, { fmt: 'encours' });
  assert.deepEqual([q.petit, q.opts.length], ['Situation au 1er novembre 2026', 4]);
  assert.deepEqual(bonnes(q), ['Événement c4']);
  assert.ok(['quoi', 'quand'].includes(fabrique().question(F.c1, { fmt: 'encours' }).fmt), 'conflit terminé : un autre choix multiple');
});

test('questions à écrire et remise en ordre : la réponse attendue et l\'indice', () => {
  const QS = fabrique();
  const t = QS.question(F.q1, { fmt: 'trou' });
  assert.deepEqual([t.fmt, t.grand, t.saisie.attendu], ['trou', 'La France a perdu une … !', 'bataille']);
  const n = QS.question(F.q1, { fmt: 'nom' });
  assert.deepEqual([n.fmt, n.saisie.genre, n.saisie.attendu], ['nom', 'nom', 'Charles de Gaulle']);
  const a = QS.question(F.h7, { fmt: 'annee' });
  assert.deepEqual([a.saisie.attendu, a.indice, Q.attenduTexte(a)], [-52, 'Année (52 av. J.-C. par exemple)', '52 av. J.-C.']);
  assert.equal(QS.question(F.q2, { fmt: 'annee' }).saisie.attendu, 1958);
  const o = QS.question(F.h1, { fmt: 'ordre' });
  assert.ok(o.ordre.includes('h1'));
  assert.equal(new Set(o.ordre.map((id) => Math.floor(F[id].y))).size, 4, 'quatre années différentes');
  assert.equal(QS.question(F.q3, { fmt: 'nom' }).fmt, 'sur', 'format impossible pour cette fiche : un choix multiple à la place');
});

test('lecture et réponse à voix haute', () => {
  const QS = fabrique();
  assert.deepEqual(QS.question(F.h1, { fmt: 'decouverte' }), { id: 'h1', fmt: 'decouverte' });
  assert.equal(QS.question(F.q1, { fmt: 'ouverte' }).grand, F.q1.q);
  assert.deepEqual(['fmt', 'grand'].map((k) => QS.question(F.p1, { fmt: 'quoi' })[k]), ['ouverte', 'Événement p1'], 'aucun choix multiple possible');
});

test('correction des réponses écrites', () => {
  const QS = fabrique();
  const a = QS.question(F.h1, { fmt: 'annee' });
  assert.deepEqual(['1914', '1915', '1920'].map((t) => Q.corriger(a, t, F.h1)), ['ok', 'mid', 'ko']);
  const n = QS.question(F.q1, { fmt: 'nom' });
  assert.deepEqual(['de gaulle', 'Pétain'].map((t) => Q.corriger(n, t, F.q1)), ['ok', 'ko']);
  assert.equal(Q.corriger(QS.question(F.q1, { fmt: 'trou' }), 'Bataile', F.q1), 'ok', 'une faute de frappe passe');
});
