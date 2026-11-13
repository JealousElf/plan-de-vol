// Synchronisation par code (synchro.js) : code, clés, chiffrement, échanges avec le service. Sans navigateur ni réseau.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(readFileSync(join(racine, 'synchro.js'), 'utf8'));
const S = globalThis.PDV.synchro;
const BASE = 'https://carnets.test';

/** Un faux service, avec les mêmes contrôles que les règles de la base (docs/synchronisation.md). */
function fauxService() {
  const etat = { carnets: {}, appels: [] };
  etat.fetch = async (url, options = {}) => {
    const u = new URL(url), m = options.method || 'GET';
    etat.appels.push({ m, chemin: u.pathname, entetes: options.headers });
    const rep = (status, corps) => new Response(status === 204 ? null : JSON.stringify(corps), { status });
    const c = u.pathname.match(/^\/carnets\/([A-Za-z0-9_-]{43})(\/t)?\.json$/);
    if (!c) return rep(401, { error: 'Permission denied' });
    if (m === 'GET') { const r = etat.carnets[c[1]]; return rep(200, r ? (c[2] ? r.t : r) : null); }
    if (m === 'POST' && u.searchParams.get('x-http-method-override') === 'PUT' && !c[2]) {
      const corps = JSON.parse(options.body);
      if (corps.v !== 1 || typeof corps.t !== 'number' || typeof corps.d !== 'string' || corps.d.length >= 600000 || Object.keys(corps).length !== 3) return rep(401, { error: 'Permission denied' });
      etat.carnets[c[1]] = corps;
      return rep(204);
    }
    return rep(400, { error: 'cas non prévu' });
  };
  return etat;
}

test('code : seize caractères sans lettre ambiguë, contrôle compris', () => {
  const codes = new Set();
  for (let i = 0; i < 200; i++) {
    const c = S.nouveauCode();
    assert.match(c, /^[0-9A-HJKMNP-TV-Z]{16}$/);
    assert.ok(S.valide(c));
    codes.add(c);
  }
  assert.equal(codes.size, 200);
});

test('code : la saisie est tolérante, une faute de frappe est repérée sans réseau', () => {
  const c = S.nouveauCode(), joli = S.presenter(c);
  assert.match(joli, /^(.{4}-){3}.{4}$/);
  assert.equal(S.normaliser('  ' + joli.toLowerCase().replace(/-/g, ' ') + ' '), c);
  assert.equal(S.normaliser('o0il-1'), '00111');
  assert.equal(S.valide(c.slice(0, 15)), false);
  assert.equal(S.valide(c + 'A'), false);
  for (let i = 0; i < 16; i++) {
    const autre = c[i] === 'A' ? 'B' : 'A';
    assert.equal(S.valide(c.slice(0, i) + autre + c.slice(i + 1)), false, 'caractère ' + i + ' modifié');
  }
});

test('clés : le même code donne la même adresse et la même clé, deux codes ne se ressemblent en rien', async () => {
  const a = await S.cles('0123456789ABCDEF'), b = await S.cles('0123456789ABCDEF'), c = await S.cles('0123456789ABCDEG');
  assert.deepEqual(a, b);
  assert.match(a.id, /^[A-Za-z0-9_-]{43}$/);
  assert.match(a.k, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a.id, a.k);
  assert.notEqual(a.id, c.id);
  assert.notEqual(a.k, c.k);
});

test('chiffrement : aller-retour fidèle, texte illisible en route, mauvaise clé refusée', async () => {
  const a = await S.cles(S.nouveauCode()), b = await S.cles(S.nouveauCode());
  const clair = JSON.stringify({ cards: { 'fr-1789': { b: 3 } }, note: 'Été 1940 : l\'appel du 18 juin', gros: 'x'.repeat(70000) });
  const c1 = await S.chiffrer(a.k, clair), c2 = await S.chiffrer(a.k, clair);
  assert.notEqual(c1, c2, 'un vecteur neuf à chaque chiffrement');
  assert.ok(!c1.includes('cards') && !c1.includes('1789'));
  assert.equal(await S.dechiffrer(a.k, c1), clair);
  await assert.rejects(S.dechiffrer(b.k, c1));
  await assert.rejects(S.dechiffrer(a.k, c1.slice(0, -4) + 'AAAA'), 'un texte chiffré modifié est rejeté');
});

test('service : écrire puis relire, sans en-tête particulier, et rien de lisible en ligne', async () => {
  const service = fauxService(), ancien = globalThis.fetch;
  globalThis.fetch = service.fetch;
  try {
    const lien = { ...(await S.cles(S.nouveauCode())) };
    assert.equal(await S.version(BASE, lien), null);
    assert.equal(await S.lire(BASE, lien), null);
    await S.ecrire(BASE, lien, '{"cards":{"a":1}}', 1234);
    assert.equal(await S.version(BASE, lien), 1234);
    assert.deepEqual(await S.lire(BASE, lien), { t: 1234, texte: '{"cards":{"a":1}}' });
    const stocke = service.carnets[lien.id];
    assert.deepEqual(Object.keys(stocke).sort(), ['d', 't', 'v']);
    assert.ok(!JSON.stringify(stocke).includes('cards'));
    assert.ok(service.appels.every((x) => x.entetes === undefined), 'aucun en-tête ajouté : la requête reste « simple » pour le navigateur');
    assert.deepEqual([...new Set(service.appels.map((x) => x.m))].sort(), ['GET', 'POST']);

    // un autre code ne voit rien, et un carnet d'un format inconnu n'est pas écrasé en silence
    assert.equal(await S.lire(BASE, await S.cles(S.nouveauCode())), null);
    service.carnets[lien.id] = { v: 2, t: 1, d: 'autre format' };
    await assert.rejects(S.lire(BASE, lien), (e) => e.status === 'format');
    // une adresse hors des règles est refusée
    await assert.rejects(S.version(BASE, { id: 'trop-court' }), (e) => e.status === 401);
  } finally { globalThis.fetch = ancien; }
});
