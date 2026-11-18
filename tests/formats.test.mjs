// Questions à écrire et remise en ordre (formats.js) : quelles fiches s'y prêtent, comment les réponses sont corrigées. Sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const bac = { window: { PDV: { packs: [], sujets: [] } } };
vm.createContext(bac);
vm.runInContext(readFileSync(join(racine, 'formats.js'), 'utf8'), bac);
const F = bac.window.PDV.formats;
const carte = (a, x, o = {}) => ({ id: 't', q: 'Qui ?', a, x, ...o });

test('plat et distance : on compare sans accents, ni majuscules, ni ponctuation', () => {
  assert.equal(F.plat('  Saint-Exupéry, « cœur » !'), 'saint exupery coeur');
  assert.equal(F.distance('guynemer', 'guynemr', 3), 1);
  assert.equal(F.distance('abc', 'xyz123', 1), 2, 'au-delà du plafond, la distance renvoyée le dépasse');
});

test('estNom : une personne, un lieu, un sigle, mais pas une date, une phrase ou une quantité', () => {
  const noms = ['Georges Guynemer', 'Le général Jérôme Bellanger', 'Napoléon Ier', "L'Alphajet", 'Saint-Dizier (BA 113)', 'Le CDAOA',
    'Jean de Lattre de Tassigny', "Helmuth von Moltke, dit l'Ancien", 'La Turquie'];
  for (const a of noms) assert.ok(F.estNom(carte(a, ['René Fonck', 'Le Rafale', 'Charles Nungesser'])), a);
  const pasNoms = ['1912', 'Quatre mois', 'Six', 'La dissuasion avancée', "L'article 15", 'À Paris, à Balard', 'Le front de l\'Est, aux côtés des Soviétiques',
    'Océanique et aéroportée', 'Le Conseil de défense et de sécurité nationale'];
  for (const a of pasNoms) assert.equal(F.estNom(carte(a, ['Un', 'Deux', 'Trois'].map((m) => 'Le ' + m))), false, a);
  assert.equal(F.estNom(carte('Turenne', ['Vauban', 'un maréchal', 'Bayard'])), false, 'les mauvaises réponses doivent aussi être des noms');
  assert.equal(F.estNom({ ...carte('Turenne', ['Vauban', 'Condé', 'Bayard']), q: 'Lequel de ces chefs a dit cela ?' }), false);
});

test('corrigerNom : le nom de famille suffit, avec ou sans grade, une faute de frappe passe sur un nom long', () => {
  const dg = carte('Charles de Gaulle', ['Philippe Pétain', 'Georges Clemenceau', 'Michel Debré']);
  for (const r of ['Charles de Gaulle', 'de gaulle', 'De Gaulle', 'le général de Gaulle', 'Gaulle', 'charles de gaule']) assert.equal(F.corrigerNom(dg, r), 'ok', r);
  for (const r of ['Charles', 'Pétain', '', 'de']) assert.equal(F.corrigerNom(dg, r), 'ko', r);
  const nap = carte('Napoléon Ier', ['Louis XIV', 'Charles de Gaulle', 'Georges Clemenceau'], { v: ['Bonaparte'] });
  for (const r of ['Napoléon', 'napoleon 1er', 'Napoléon Ier', 'Bonaparte']) assert.equal(F.corrigerNom(nap, r), 'ok', r);
  assert.equal(F.corrigerNom(carte('Ferdinand Foch', ['Joseph Joffre', 'Robert Nivelle', 'Philippe Pétain']), 'Fosh'), 'ko', 'aucune faute sur un nom de quatre lettres');
  const pmf = carte('Pierre Mendès France', ['Guy Mollet', 'Michel Debré', 'Georges Pompidou']);
  assert.equal(F.corrigerNom(pmf, 'Mendès France'), 'ok');
  assert.equal(F.corrigerNom(pmf, 'France'), 'ko', 'un mot trop vague ne suffit pas');
  const murat = carte('Joachim Murat', ['Jean-Paul Marat', 'Michel Ney', 'Louis Davout']);
  assert.equal(F.corrigerNom(murat, 'Marat'), 'ko', 'une autre réponse proposée n\'est pas une faute de frappe');
});

test('citation à trous : lecture du champ, plusieurs réponses possibles, faute de frappe tolérée sur un mot long', () => {
  const t = F.lireTrou('« Impossible n\'est pas [français] »');
  assert.deepEqual([t.avant, t.mot, [...t.choix], t.apres], ['« Impossible n\'est pas ', 'français', ['français'], ' »']);
  assert.deepEqual([...F.lireTrou('un armistice de [vingt|20] ans').choix], ['vingt', '20']);
  assert.equal(F.lireTrou('sans crochets'), null);
  assert.equal(F.lireTrou('[deux] [trous]'), null);
  assert.equal(F.corrigerMot(['vingt', '20'], '20'), 'ok');
  assert.equal(F.corrigerMot(['opiniâtre'], 'opiniatre'), 'ok');
  assert.equal(F.corrigerMot(['planification'], 'planifcation'), 'ok');
  assert.equal(F.corrigerMot(['air'], 'aire'), 'ko');
});

test('année : exacte, presque à un an près, avant J.-C. comprise', () => {
  assert.equal(F.lireAnnee('1 944'), 1944);
  assert.equal(F.lireAnnee('52 av. J.-C.'), -52);
  assert.equal(F.lireAnnee('-52'), -52);
  assert.equal(F.lireAnnee('je ne sais pas'), null);
  assert.equal(F.corrigerAnnee(1917, '1917'), 'ok');
  assert.equal(F.corrigerAnnee(1917.5, '1917'), 'ok');
  assert.equal(F.corrigerAnnee(1917, '1916'), 'mid');
  assert.equal(F.corrigerAnnee(1917, '1919'), 'ko');
  assert.equal(F.corrigerAnnee(800, '804'), 'mid', 'cinq ans de marge avant l\'an mil');
  assert.equal(F.corrigerAnnee(-52, '52'), 'ko');
});

test('remise en ordre : trois voisins d\'années différentes, l\'ordre attendu du plus ancien au plus récent', () => {
  const faits = [1914, 1916, 1916, 1917, 1918, 1939, 1940, 1944, 1945].map((y, i) => ({ id: 'f' + i, y, d: String(y) }));
  let graine = 7;
  const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let k = 0; k < 20; k++) {
    const v = F.voisinsOrdre(faits[4], faits, hasard);
    assert.equal(v.length, 3);
    const ans = [faits[4], ...v].map((x) => Math.floor(x.y));
    assert.equal(new Set(ans).size, 4, 'quatre années différentes');
  }
  assert.equal(F.voisinsOrdre(faits[0], faits.slice(0, 3)), null, 'pas assez de repères');
  assert.deepEqual([...F.ordreJuste([faits[7], faits[0], faits[5]])], ['f0', 'f5', 'f7']);
});
