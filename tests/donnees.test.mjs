// Vérifie les fiches et les sujets sans navigateur : c'est le test à lancer après avoir modifié data/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const dossier = new URL('../data/', import.meta.url);
const contexte = vm.createContext({ window: {} });
for (const f of readdirSync(dossier).filter((n) => n.endsWith('.js')).sort()) {
  vm.runInContext(readFileSync(new URL(f, dossier), 'utf8'), contexte, { filename: f });
}
const { packs, sujets } = contexte.window.PDV;
const faits = packs.flatMap((p) => p.faits.map((f) => ({ ...f, pack: p.id })));
const date = (f) => typeof f.y === 'number' && typeof f.d === 'string' && f.d !== '';
const question = (f) => typeof f.q === 'string' && typeof f.a === 'string' && Array.isArray(f.x);

function verifierFait(f) {
  for (const k of ['id', 't', 'r', 'g']) assert.ok(typeof f[k] === 'string' && f[k].trim(), `${f.id} : champ « ${k} » manquant`);
  assert.ok(date(f) || question(f), `${f.id} : il faut une date (y, d) ou une question (q, a, x)`);
  if (question(f)) {
    assert.ok(f.x.length >= 3, `${f.id} : il faut au moins trois mauvaises réponses`);
    assert.equal(new Set(f.x).size, f.x.length, `${f.id} : mauvaises réponses en double`);
    assert.ok(!f.x.includes(f.a), `${f.id} : la bonne réponse figure parmi les mauvaises`);
  }
  if (f.y2 !== undefined && f.y2 !== null) assert.ok(f.y2 >= Math.floor(f.y), `${f.id} : fin antérieure au début`);
  if (f.st !== undefined) assert.match(f.st, /^(cours|fragile|fin)$/, `${f.id} : statut inconnu`);
  for (const k of ['t', 'r', 'o', 'q', 'a']) if (typeof f[k] === 'string') assert.ok(!/\s{2,}|—/.test(f[k]), `${f.id} : espaces doubles ou tiret long dans « ${k} »`);
}

test('chaque pack a un identifiant, un titre, un thème et des fiches', () => {
  assert.ok(packs.length >= 7);
  for (const p of packs) {
    assert.ok(p.id && p.titre && p.theme && p.sous, `pack ${p.id} incomplet`);
    assert.ok(Array.isArray(p.faits) && p.faits.length > 0, `pack ${p.id} vide`);
  }
  assert.equal(new Set(packs.map((p) => p.id)).size, packs.length, 'identifiants de pack en double');
});

test('les identifiants de fiche sont uniques', () => {
  const vus = new Set();
  for (const f of faits) { assert.ok(!vus.has(f.id), `identifiant en double : ${f.id}`); vus.add(f.id); }
});

test('chaque fiche est complète', () => { faits.forEach(verifierFait); });

test('dans un pack, les fiches d\'un même groupe se suivent', () => {
  for (const p of packs) {
    const ordre = [];
    for (const f of p.faits) {
      if (ordre[ordre.length - 1] === f.g) continue;
      assert.ok(!ordre.includes(f.g), `${p.id} : le groupe « ${f.g} » est coupé en deux (fiche ${f.id})`);
      ordre.push(f.g);
    }
  }
});

test('chaque fiche datée sans question a assez de voisines pour un choix multiple', () => {
  for (const p of packs) {
    const datees = p.faits.filter(date);
    for (const f of datees.filter((x) => !question(x))) {
      const autres = datees.filter((x) => x.id !== f.id && (Math.floor(x.y) !== Math.floor(f.y) || x.d !== f.d));
      assert.ok(autres.length >= 3, `${f.id} : pas assez d'autres dates dans le pack ${p.id}`);
    }
  }
});

test('les sujets de grand oral ont un corrigé complet', () => {
  assert.ok(sujets.length >= 20);
  assert.equal(new Set(sujets.map((s) => s.id)).size, sujets.length);
  for (const s of sujets) {
    assert.ok(s.id && s.dom && s.titre && s.pb, `sujet ${s.id} incomplet`);
    assert.equal(s.plan.length, 3, `${s.id} : le plan compte trois parties`);
    assert.ok(s.refs.length >= 4 && s.pieges.length >= 2 && s.relances.length >= 3, `${s.id} : références, pièges ou relances manquants`);
  }
});

test('le pack d\'actualité a la forme attendue', () => {
  const actu = JSON.parse(readFileSync(new URL('actu.json', dossier), 'utf8'));
  assert.equal(actu.id, 'actu');
  assert.ok(typeof actu.titre === 'string' && Array.isArray(actu.faits));
  assert.ok(actu.faits.length <= 40);
  const vus = new Set(faits.map((f) => f.id));
  for (const f of actu.faits) { verifierFait(f); assert.ok(!vus.has(f.id), `identifiant en double : ${f.id}`); vus.add(f.id); }
});

test('la version est la même partout, et config.js désigne un service bien formé', () => {
  const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const version = JSON.parse(lire('package.json')).version;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lire('app.js').match(/var VERSION_APP = '([^']+)'/)[1], version, 'app.js');
  assert.equal(lire('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+)/m)[1], version, 'CHANGELOG.md');
  const carnets = lire('config.js').match(/DATA\.carnets = '([^']*)';/)[1];
  assert.match(carnets, /^$|^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebasedatabase\.app|firebaseio\.com)$/, 'adresse du service : vide, ou une base Firebase sans barre finale');
});

