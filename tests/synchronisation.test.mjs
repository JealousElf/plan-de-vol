// Synchronisation entre appareils par un gist privé. L'API de GitHub est simulée : aucun appel réel.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { attendreSync, demarrer, jusquAuxChoix, ouvrir, repondre, texte } from './aide.mjs';

const NOM = 'plan-de-vol-progression.json';
const JETON = 'jeton_de_test_0123456789abcdefghij';
let env;
before(async () => { env = await demarrer(); });
after(async () => { await env.arreter(); });

function fauxGitHub() {
  const etat = { gists: {}, suite: 0, creations: 0, ecritures: 0 };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };
  etat.route = async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const rep = (status, corps) => route.fulfill({ status, headers: { 'content-type': 'application/json', ...cors }, body: JSON.stringify(corps) });
    if (req.headers().authorization !== 'Bearer ' + JETON) return rep(401, { message: 'Bad credentials' });
    const vue = (id) => ({ id, files: { [NOM]: { filename: NOM, truncated: false, content: etat.gists[id] } } });
    if (m === 'GET' && u.pathname === '/gists') return rep(200, Object.keys(etat.gists).map((id) => ({ id, files: { [NOM]: { filename: NOM } } })));
    if (m === 'POST' && u.pathname === '/gists') { etat.creations++; const id = 'g' + (++etat.suite); etat.gists[id] = JSON.parse(req.postData()).files[NOM].content; return rep(201, vue(id)); }
    const id = (u.pathname.match(/^\/gists\/(\w+)$/) || [])[1];
    if (id && m === 'GET') return etat.gists[id] === undefined ? rep(404, { message: 'Not Found' }) : rep(200, vue(id));
    if (id && m === 'PATCH') { etat.ecritures++; etat.gists[id] = JSON.parse(req.postData()).files[NOM].content; return rep(200, vue(id)); }
    return rep(400, { message: 'cas non prévu' });
  };
  etat.distant = () => JSON.parse(Object.values(etat.gists)[0]);
  return etat;
}

async function appareil(github, options) {
  const a = await ouvrir(env.navigateur, env.url + '#reglages', options);
  await a.contexte.route('https://api.github.com/**', github.route);
  return a;
}
const activer = async (page, jeton) => { await page.fill('#jeton', jeton); await page.click('[data-a="sync-activer"]'); };

test('deux appareils partagent la même progression', async () => {
  const github = fauxGitHub();
  const a = await appareil(github);
  await a.page.fill('#jeton', 'trop court');
  await a.page.click('[data-a="sync-activer"]');
  assert.ok(await a.page.locator('#jeton-err').isVisible());
  await activer(a.page, JETON);
  await attendreSync(a.page, 'Synchronisé');
  assert.equal(github.creations, 1);

  await a.page.goto(env.url + '#accueil');
  await a.page.click('[data-a="jour"]');
  for (let i = 0; i < 3; i++) { await jusquAuxChoix(a.page); await repondre(a.page, true); await a.page.click('.feuille [data-a="suite"]'); }
  await a.page.click('[data-a="quitter"]');
  await a.page.waitForFunction(() => true, null, { timeout: 100 });
  await a.page.waitForTimeout(6500);
  assert.ok(github.ecritures >= 1);
  assert.ok(Object.keys(github.distant().cards).length >= 3);
  const legendeA = await texte(a.page, '.legende');

  const b = await appareil(github, { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  await activer(b.page, JETON);
  await attendreSync(b.page, 'Synchronisé');
  await b.page.goto(env.url + '#accueil');
  await b.page.waitForSelector('.legende');
  assert.equal(await texte(b.page, '.legende'), legendeA);
  assert.equal(github.creations, 1, 'le second appareil doit retrouver le fichier existant');

  await a.contexte.setOffline(true);
  await a.page.goto(env.url + '#reglages');
  await a.page.selectOption('#r-neu', '20');
  await attendreSync(a.page, 'Hors connexion');
  await a.contexte.setOffline(false);
  await attendreSync(a.page, 'Synchronisé');
  assert.equal(github.distant().set.neu, 20);
  assert.deepEqual([...a.erreurs, ...b.erreurs], []);
  await a.contexte.close(); await b.contexte.close();
});

test('un jeton refusé est signalé, et l\'on peut revenir au mode local', async () => {
  const github = fauxGitHub();
  const c = await appareil(github);
  await activer(c.page, 'jeton_refuse_0123456789abcdefghij');
  await attendreSync(c.page, 'Jeton refusé');
  await c.page.click('[data-a="sync-couper"]');
  assert.match(await texte(c.page, '#sync'), /cet appareil/);
  assert.equal(await c.page.locator('#jeton').count(), 1);
  await c.contexte.close();
});
