// Calcul des séances (seance.js) : nouvelles fiches, révisions du jour, quiz, étapes de la répétition espacée. Sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(readFileSync(join(racine, 'seance.js'), 'utf8'));
const S = globalThis.PDV.seance;

const JOUR = 20400;   // un jour quelconque (jours depuis 1970)
/** Deux packs de n fiches : a1, a2… et b1, b2… */
function packs(n) {
  const p = (id) => ({ id, faits: Array.from({ length: n }, (_, i) => ({ id: id + (i + 1) })) });
  return [p('a'), p('b')];
}
const ids = (l) => l.map((f) => f.id);
const etape = (c) => [c.b, c.due];
/** Un hasard prévisible, pour des mélanges reproductibles. */
function graine(g) { return () => { g = (g * 16807) % 2147483647; return (g - 1) / 2147483646; }; }

test('nouvelles fiches : une de chaque pack tour à tour, jamais une déjà vue', () => {
  const cartes = { a1: { b: 2, due: JOUR }, b2: { b: 0, due: 0 } };   // b2 a été vue sans être acquise : elle reste neuve
  assert.deepEqual(ids(S.nouveaux(packs(3), cartes, 4)), ['a2', 'b1', 'a3', 'b2']);
  assert.deepEqual(ids(S.nouveaux(packs(2), {}, 10)), ['a1', 'b1', 'a2', 'b2'], 's\'arrête quand tout est vu');
});

test('révisions du jour : la plus en retard d\'abord, puis la plus fragile ; ni les neuves ni celles de demain', () => {
  const cartes = { a1: { b: 3, due: JOUR }, a2: { b: 1, due: JOUR }, a3: { b: 5, due: JOUR - 4 }, b1: { b: 2, due: JOUR + 1 }, b2: { b: 0, due: 0 } };
  assert.deepEqual(ids(S.dusDuJour(packs(3).flatMap((p) => p.faits), cartes, JOUR)), ['a3', 'a2', 'a1']);
});

test('rythme minimal : trois fiches par jour, ou ce qu\'il faut pour avoir tout vu trois semaines avant l\'oral', () => {
  assert.equal(S.neufsMini(300, null), 3, 'sans date d\'oral');
  assert.equal(S.neufsMini(300, 0), 3, 'oral passé');
  assert.equal(S.neufsMini(300, NaN), 3, 'date illisible');
  assert.equal(S.neufsMini(300, 121), 3);
  assert.equal(S.neufsMini(300, 71), 6);
  assert.equal(S.neufsMini(40, 10), 40, 'dans les trois dernières semaines : tout ce qui reste');
});

test('séance du jour : le rythme choisi sans révision, le minimum quand les révisions s\'accumulent, vingt questions au plus', () => {
  const base = { packs: packs(30), cartes: {}, jours: {}, rythme: 10, jour: JOUR, restants: null };
  let r = S.planJour(base);
  assert.deepEqual([r.neufs.length, r.dus.length, r.prevu, r.fait], [10, 0, 10, false]);

  const cartes = {};
  for (let i = 1; i <= 25; i++) cartes['a' + i] = { b: 2, due: JOUR };
  r = S.planJour({ ...base, cartes });
  assert.deepEqual([r.neufs.length, r.dus.length, r.attente, r.total], [3, 17, 8, 25]);
  assert.equal(r.neufs.length + r.dus.length, S.QUIZ);
  assert.ok(r.neufs.every((f) => !cartes[f.id]), 'les nouvelles fiches n\'ont jamais été vues');

  r = S.planJour({ ...base, cartes: { a1: { b: 1, due: JOUR } }, jours: { [JOUR]: { n: 12, neu: 6, fait: 1 } } });
  assert.deepEqual([r.neufs.length, r.dus.length, r.fait], [4, 1, true], 'six fiches déjà lues aujourd\'hui sur dix');
});

test('composer : la lecture des nouvelles fiches, une pause, puis chaque question une seule fois, dans le désordre', () => {
  const neufs = [{ id: 'n1' }, { id: 'n2' }], dus = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }];
  const question = (f) => ({ id: f.id, fmt: 'quoi' });
  const items = S.composer(dus, neufs, question, graine(7));
  assert.deepEqual(items.slice(0, 2), [{ id: 'n1', fmt: 'decouverte' }, { id: 'n2', fmt: 'decouverte' }]);
  assert.equal(S.indexPause(items), 2);
  assert.deepEqual(ids(items.slice(3)).sort(), ['d1', 'd2', 'd3', 'n1', 'n2']);
  assert.ok(items.slice(3).every((it) => it.fmt === 'quoi'));
  const revision = S.composer(dus, [], question);
  assert.equal(S.indexPause(revision), -1, 'sans lecture, pas de pause');
  assert.equal(revision.length, 3);
});

test('répétition espacée : une bonne réponse fait monter d\'une étape et espace la révision, une erreur fait repartir de la première', () => {
  let c = null;
  for (const [b, jours] of [[1, 1], [2, 2], [3, 4], [4, 8], [5, 16], [6, 32], [6, 32]]) {
    c = S.noter(c, 'ok', 'normal', JOUR, 1);
    assert.deepEqual(etape(c), [b, JOUR + jours]);
  }
  assert.deepEqual([c.n, c.ok], [7, 7]);
  const rate = S.noter(c, 'ko', 'normal', JOUR, 2);
  assert.deepEqual([rate.b, rate.due, rate.n, rate.ok, rate.t], [1, JOUR, 8, 7, 2]);
  assert.equal(c.b, 6, 'la fiche d\'origine n\'est pas modifiée');
  assert.deepEqual(etape(S.noter({ b: 4, due: 0, n: 1, ok: 1 }, 'mid', 'normal', JOUR, 0)), [4, JOUR + 1], 'à moitié : on garde l\'étape, on revoit demain');
});

test('répétition espacée : seconde chance, test de positionnement et blitz', () => {
  assert.deepEqual(etape(S.noter({ b: 1, due: JOUR, n: 1, ok: 0 }, 'ok', 'retry', JOUR, 0)), [1, JOUR + 1]);
  assert.deepEqual(etape(S.noter(null, 'ok', 'diag', JOUR, 0)), [3, JOUR + 4], 'un repère su au test saute les premières étapes');
  assert.deepEqual(etape(S.noter(null, 'ko', 'diag', JOUR, 0)), [1, JOUR]);
  const sue = { b: 5, due: JOUR + 9, n: 4, ok: 4 };
  assert.deepEqual(etape(S.noter(sue, 'ok', 'libre', JOUR, 0)), [5, JOUR + 9], 'en blitz, une bonne réponse ne change rien');
  assert.deepEqual(etape(S.noter(sue, 'ko', 'libre', JOUR, 0)), [1, JOUR]);
  assert.deepEqual(etape(S.noter(null, 'ko', 'libre', JOUR, 0)), [0, 0], 'une fiche neuve ratée en blitz reste neuve');
});
