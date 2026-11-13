// Calculs du carnet de vol (suivi.js) : prévision, régularité, points faibles. Sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const bac = { window: { PDV: { packs: [], sujets: [] } } };
vm.createContext(bac);
vm.runInContext(readFileSync(join(racine, 'suivi.js'), 'utf8'), bac);
const S = bac.window.PDV.suivi;

const AUJ = Date.UTC(2026, 10, 13) / 86400000;                 // vendredi 13 novembre 2026
const journees = (nb, parJour, depuis = AUJ) => { const j = {}; for (let i = 0; i < nb; i++) j[depuis - i] = { n: 20, ok: 15, neu: parJour }; return j; };
const prevoir = (o) => S.prevision({ total: 300, vus: 100, acquis: 40, jours: journees(14, 10), auj: AUJ, exam: null, regle: 10, ...o });

test('dateDe : jour civil et jour de la semaine (0 = lundi)', () => {
  assert.deepEqual({ ...S.dateDe(AUJ) }, { j: 13, m: 10, a: 2026, s: 4 });
  assert.equal(S.dateDe(AUJ + 3).s, 0);
});

test('rythme : le rythme réglé tant que le recul manque, le rythme observé ensuite', () => {
  assert.deepEqual({ ...S.rythme({}, AUJ, 10) }, { v: 10, source: 'regle', jours: 0, actifs: 0 });
  assert.equal(S.rythme(journees(2, 8), AUJ, 10).source, 'regle');
  const r = S.rythme(journees(14, 6), AUJ, 10);
  assert.equal(r.source, 'reel'); assert.equal(r.v, 6);
  // les jours de repos comptent dans la moyenne
  const troue = journees(14, 8); delete troue[AUJ - 3]; delete troue[AUJ - 7];
  assert.ok(Math.abs(S.rythme(troue, AUJ, 10).v - 8 * 12 / 14) < 1e-9);
  // la séance du jour pas encore faite ne fait pas baisser le rythme
  assert.equal(S.rythme(journees(14, 6, AUJ - 1), AUJ, 10).v, 6);
});

test('prévision : en avance quand tout peut être acquis avant l\'oral', () => {
  const p = prevoir({ exam: AUJ + 60 });
  assert.equal(p.neufs, 200); assert.equal(p.jourVu, AUJ + 20); assert.equal(p.jourAcquis, AUJ + 27);
  assert.equal(p.marge, 33); assert.equal(p.manque, 0); assert.equal(p.conseil, null); assert.equal(p.etat, 'avance');
});

test('prévision : en retard, avec le rythme qui rattrape le plan quand il existe', () => {
  const p = prevoir({ exam: AUJ + 25 });
  assert.equal(p.etat, 'retard'); assert.equal(p.marge, -2); assert.equal(p.manque, 0);
  assert.equal(p.besoin, 12); assert.equal(p.conseil, 15);
  const q = prevoir({ exam: AUJ + 15 });
  assert.equal(q.manque, 50); assert.equal(q.besoin, 25); assert.equal(q.conseil, null);
});

test('prévision : les autres états', () => {
  assert.equal(prevoir({}).etat, 'libre');
  assert.equal(prevoir({ vus: 0, acquis: 0, jours: {} }).etat, 'debut');
  assert.equal(prevoir({ vus: 0, acquis: 0, jours: {}, exam: AUJ + 10 }).etat, 'retard');
  assert.equal(prevoir({ vus: 300, acquis: 120, exam: AUJ + 3 }).etat, 'vu');
  assert.equal(prevoir({ vus: 300, acquis: 300 }).etat, 'fini');
  assert.equal(prevoir({ exam: AUJ - 1 }).etat, 'passe');
  // plus aucune nouveauté depuis deux semaines : pas de date d'arrivée
  const arret = prevoir({ jours: journees(14, 0), exam: AUJ + 60 });
  assert.equal(arret.jourVu, null); assert.equal(arret.etat, 'retard'); assert.equal(arret.manque, 200);
});

test('historique et projection : la courbe passe par le total actuel et ne dépasse jamais le programme', () => {
  const h = S.historique(journees(5, 10), AUJ, 42, AUJ - 6);
  assert.deepEqual(Array.from(h, (x) => x.v), [0, 0, 2, 12, 22, 32, 42]);
  assert.equal(h[0].jour, AUJ - 6); assert.equal(h[6].jour, AUJ);
  const p = S.projection(42, 60, 7, AUJ, AUJ + 4);
  assert.deepEqual(Array.from(p, (x) => x.v), [42, 49, 56, 60, 60]);
});

test('régularité : série en cours, record, jours travaillés, réussite sur sept jours', () => {
  const j = journees(4, 10, AUJ - 1);                 // hier et les trois jours d'avant
  Object.assign(j, journees(6, 10, AUJ - 10));        // une série plus longue, plus ancienne
  const r = S.regularite(j, AUJ);
  assert.equal(r.enCours, 4, 'la série tient tant que la séance du jour peut encore être faite');
  assert.equal(r.record, 6); assert.equal(r.actifs30, 10); assert.equal(r.premier, AUJ - 15);
  assert.equal(r.n7, 80); assert.equal(r.taux7, 0.75);
  assert.equal(S.regularite({}, AUJ).enCours, 0);
});

test('calendrier : quinze semaines du lundi au dimanche, la dernière contient aujourd\'hui', () => {
  const s = S.semaines(journees(10, 10), AUJ, 15);
  assert.equal(s.length, 15);
  assert.ok(s.every((x) => x.jours.length === 7 && S.dateDe(x.lundi).s === 0));
  const derniere = s[14].jours;
  assert.equal(derniere[4].jour, AUJ); assert.equal(derniere[4].futur, false);
  assert.equal(derniere[5].futur, true); assert.equal(derniere[5].niv, 0);
  assert.ok(derniere[4].niv >= 1 && derniere[4].niv <= 4);
  assert.equal(s[0].jours[0].niv, 0);
});

test('révisions à venir : les retards comptent pour aujourd\'hui, les fiches disparues sont ignorées', () => {
  const cartes = { a: { b: 2, due: AUJ - 3 }, b: { b: 1, due: AUJ }, c: { b: 3, due: AUJ + 2 }, d: { b: 0, due: AUJ }, e: { b: 2, due: AUJ + 30 }, fantome: { b: 2, due: AUJ } };
  assert.deepEqual([...S.aVenir(cartes, (id) => id !== 'fantome', AUJ, 4)], [2, 0, 1, 0]);
});

test('maîtrise par pack et repères qui résistent', () => {
  const packs = [{ id: 'p', titre: 'Pack', theme: 'T', faits: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }];
  const cartes = { a: { b: 5, n: 6, ok: 6 }, b: { b: 2, n: 8, ok: 3 }, c: { b: 1, n: 4, ok: 2 }, z: { b: 1, n: 9, ok: 0 } };
  const e = S.parPack(packs, cartes)[0];
  assert.deepEqual([e.n, e.acquis, e.cours, e.neuf, e.rep, e.ok], [4, 1, 2, 1, 18, 11]);
  const faits = { a: {}, b: {}, c: {}, d: {} };
  cartes.a = { b: 5, n: 9, ok: 3 };                    // acquis : ne compte plus comme fragile
  assert.deepEqual(Array.from(S.fragiles(cartes, faits, 8), (x) => [x.id, x.ech]), [['b', 5], ['c', 2]]);
});

test('oraux blancs : moyenne, meilleure note et critère le plus faible', () => {
  const o = S.oraux([{ t: 1, total: 9, titre: 'A', notes: [2, 2, 3, 2] }, { t: 2, total: 14, titre: 'B', notes: [3, 4, 3, 4] }], 4);
  assert.equal(o.n, 2); assert.equal(o.moyenne, 11.5); assert.equal(o.dernier, 14); assert.equal(o.meilleur, 14);
  assert.deepEqual([...o.criteres], [2.5, 3, 3, 3]); assert.equal(o.faible, 0);
  assert.equal(S.oraux([], 4).moyenne, null);
});

test('plafond : une borne ronde au-dessus de la valeur', () => {
  assert.deepEqual([3, 37, 44, 112, 319].map(S.plafond), [5, 40, 50, 150, 400]);
});
