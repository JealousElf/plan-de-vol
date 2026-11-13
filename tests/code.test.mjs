// Synchronisation par code, dans un navigateur réel. Le service en ligne est simulé : aucun appel réel.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { attendreSync, demarrer, jusquAuxChoix, ouvrir, repondre, texte } from './aide.mjs';

const BASE = 'https://carnets.test';
let env;
before(async () => { env = await demarrer(); });
after(async () => { await env.arreter(); });

/** Un faux service qui applique les mêmes contrôles que les règles de la base (docs/synchronisation.md). */
function fauxService() {
  const etat = { carnets: {}, lectures: 0, ecritures: 0, preflights: 0, panne: false, types: new Set() };
  const cors = { 'access-control-allow-origin': '*' };
  etat.route = async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const rep = (status, corps) => route.fulfill({ status, headers: { 'content-type': 'application/json', ...cors }, body: JSON.stringify(corps) });
    if (m === 'OPTIONS') { etat.preflights++; return route.fulfill({ status: 400 }); }
    if (etat.panne) return rep(401, { error: 'Permission denied' });
    const c = u.pathname.match(/^\/carnets\/([A-Za-z0-9_-]{43})(\/t)?\.json$/);
    if (!c) return rep(401, { error: 'Permission denied' });
    if (m === 'GET') { etat.lectures++; const r = etat.carnets[c[1]]; return rep(200, r ? (c[2] ? r.t : r) : null); }
    if (m === 'POST' && u.searchParams.get('x-http-method-override') === 'PUT' && !c[2]) {
      etat.types.add((req.headers()['content-type'] || '').split(';')[0]);
      const corps = JSON.parse(req.postData());
      if (corps.v !== 1 || typeof corps.t !== 'number' || typeof corps.d !== 'string' || corps.d.length >= 600000 || Object.keys(corps).length !== 3) return rep(401, { error: 'Permission denied' });
      etat.ecritures++; etat.carnets[c[1]] = corps;
      return route.fulfill({ status: 204, headers: cors });
    }
    return rep(400, { error: 'cas non prévu' });
  };
  return etat;
}

/** Ouvre l'application sur un appareil neuf, réglée pour utiliser le faux service. */
async function appareil(service, options) {
  const contexte = await env.navigateur.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], ...options });
  await contexte.route('**/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: `window.PDV = window.PDV || { packs: [], sujets: [] }; window.PDV.carnets = '${BASE}';` }));
  await contexte.route(BASE + '/**', service.route);
  const page = await contexte.newPage(), erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(env.url + '#reglages');
  await page.waitForSelector('h1.page-t');
  return { contexte, page, erreurs };
}
const progression = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pdv.progression.v1') || '{"cards":{}}'));
async function unePartie(page, bonnes) {
  await page.goto(env.url + '#accueil');
  await page.click('[data-a="jour"]');
  for (let i = 0; i < bonnes; i++) {
    await jusquAuxChoix(page);
    await repondre(page, true);
    await page.waitForSelector('.opt[disabled]');
    if (await page.locator('.feuille [data-a="suite"]').count()) await page.click('.feuille [data-a="suite"]'); else await page.waitForTimeout(100);
  }
  await page.click('[data-a="quitter"]');
  await page.goto(env.url + '#reglages');
}

test('un code relie deux appareils : la progression suit dans les deux sens', async () => {
  const service = fauxService();
  const a = await appareil(service);
  assert.equal(await texte(a.page, '#sync-detail'), 'Progression sur cet appareil');
  await unePartie(a.page, 2);
  const avant = Object.keys((await progression(a.page)).cards).length;
  assert.ok(avant >= 2);

  await a.page.click('[data-a="code-creer"]');
  await a.page.waitForSelector('#code-affiche');
  await attendreSync(a.page, 'Synchronisé');
  const code = await texte(a.page, '#code-affiche');
  assert.match(code, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
  const ids = Object.keys(service.carnets);
  assert.equal(ids.length, 1);
  assert.ok(!JSON.stringify(service.carnets[ids[0]]).includes('cards'), 'rien de lisible ne part en ligne');
  await a.page.click('[data-a="code-copier"]');
  await a.page.waitForFunction(() => document.getElementById('code-msg').textContent === 'Code copié.');
  assert.equal(await a.page.evaluate(() => navigator.clipboard.readText()), code);

  // deuxième appareil : fautes de frappe, code inconnu, puis le bon code tapé en minuscules avec des espaces
  const b = await appareil(service);
  const lectures = service.lectures;
  await b.page.fill('#code', code.slice(0, 18) + (code[18] === 'A' ? 'B' : 'A'));
  await b.page.click('[data-a="code-relier"]');
  assert.match(await texte(b.page, '#code-msg'), /^Code incomplet ou mal recopié/);
  assert.equal(service.lectures, lectures, 'une faute de frappe ne coûte aucun appel');
  const inconnu = await b.page.evaluate(() => window.PDV.synchro.nouveauCode());
  await b.page.fill('#code', inconnu);
  assert.match(await b.page.inputValue('#code'), /^(.{4}-){3}.{4}$/, 'le champ range le code par groupes de quatre');
  await b.page.click('[data-a="code-relier"]');
  await b.page.waitForFunction(() => /^Aucune progression/.test(document.getElementById('code-msg').textContent));
  assert.equal(Object.keys(service.carnets).length, 1, 'un code inconnu ne crée rien');

  await b.page.fill('#code', code.toLowerCase().replace(/-/g, ' '));
  await b.page.click('[data-a="code-relier"]');
  await b.page.waitForSelector('#code-affiche');
  await attendreSync(b.page, 'Synchronisé');
  assert.equal(await texte(b.page, '#code-affiche'), code);
  assert.equal(Object.keys((await progression(b.page)).cards).length, avant);

  // l'appareil B travaille, l'appareil A retrouve ses réponses à la prochaine ouverture
  const ecritures = service.ecritures;
  await unePartie(b.page, 3);
  for (let i = 0; i < 40 && service.ecritures === ecritures; i++) await b.page.waitForTimeout(100);
  assert.ok(service.ecritures > ecritures, 'en quittant la séance, les réponses de B partent sans attendre');
  await attendreSync(b.page, 'Synchronisé');
  const apres = Object.keys((await progression(b.page)).cards).length;
  assert.ok(apres > avant);
  await a.page.reload();
  await attendreSync(a.page, 'Synchronisé');
  await a.page.waitForFunction((n) => Object.keys(JSON.parse(localStorage.getItem('pdv.progression.v1')).cards).length === n, apres);
  assert.equal(await texte(a.page, '#code-affiche'), code, 'le lien est gardé après rechargement');

  assert.equal(service.preflights, 0, 'aucune requête ne demande d\'autorisation préalable au navigateur');
  assert.deepEqual([...service.types], ['text/plain']);
  assert.deepEqual(a.erreurs.concat(b.erreurs), []);
  await a.contexte.close(); await b.contexte.close();
});

test('sans changement, la synchronisation ne relit ni ne réécrit le carnet', async () => {
  const service = fauxService();
  const a = await appareil(service);
  await a.page.click('[data-a="code-creer"]');
  await attendreSync(a.page, 'Synchronisé');
  const id = Object.keys(service.carnets)[0], t = service.carnets[id].t, ecritures = service.ecritures;
  await a.page.reload();
  await attendreSync(a.page, 'Synchronisé');
  assert.equal(service.carnets[id].t, t);
  assert.equal(service.ecritures, ecritures);
  await a.contexte.close();
});

test('arrêter la synchronisation demande confirmation et garde la progression sur l\'appareil', async () => {
  const service = fauxService();
  const a = await appareil(service);
  await unePartie(a.page, 1);
  await a.page.click('[data-a="code-creer"]');
  await attendreSync(a.page, 'Synchronisé');
  const cartes = Object.keys((await progression(a.page)).cards).length;
  await a.page.click('[data-a="couper-oui"]');
  assert.match(await texte(a.page, '.bloc:has(#code-affiche)'), /Note ce code avant de continuer/);
  await a.page.click('[data-a="couper-non"]');
  assert.equal(await a.page.locator('#code-affiche').count(), 1);
  await a.page.click('[data-a="couper-oui"]');
  await a.page.click('[data-a="sync-couper"]');
  assert.equal(await texte(a.page, '#sync-detail'), 'Progression sur cet appareil');
  assert.equal(await a.page.locator('[data-a="code-creer"]').count(), 1);
  assert.equal(Object.keys((await progression(a.page)).cards).length, cartes);
  assert.equal(Object.keys(service.carnets).length, 1, 'la copie en ligne reste pour les autres appareils');
  await a.contexte.close();
});

test('service en panne : l\'état le dit, la progression reste sur l\'appareil et repart ensuite', async () => {
  const service = fauxService();
  const a = await appareil(service);
  await a.page.click('[data-a="code-creer"]');
  await attendreSync(a.page, 'Synchronisé');
  service.panne = true;
  await unePartie(a.page, 1);
  await attendreSync(a.page, 'Synchronisation interrompue', 12000);
  assert.match(await texte(a.page, '#sync-motif'), /^Le service refuse l'accès : les règles de la base/);
  assert.ok(Object.keys((await progression(a.page)).cards).length >= 1);
  service.panne = false;
  await a.page.reload();
  await attendreSync(a.page, 'Synchronisé');
  assert.equal(await texte(a.page, '#sync-motif'), '');
  await a.contexte.close();
});

test('avec la configuration du dépôt, le code est proposé et rien ne part en ligne avant un geste de l\'utilisateur', async () => {
  const contexte = await env.navigateur.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const appels = [];
  await contexte.route(/firebasedatabase\.app|firebaseio\.com/, (route) => { appels.push(route.request().url()); return route.abort(); });
  const page = await contexte.newPage();
  await page.goto(env.url + '#reglages');
  await page.waitForSelector('[data-a="code-creer"]');
  assert.equal(await page.locator('details.releve #jeton').count(), 1, 'le jeton reste proposé, replié');
  await page.goto(env.url + '#accueil');
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);
  await repondre(page, true);
  await page.waitForTimeout(400);
  assert.deepEqual(appels, []);
  await contexte.close();
});

test('sans service configuré, le code n\'est pas proposé et le jeton reste disponible', async () => {
  const { contexte, page } = await ouvrir(env.navigateur, env.url + '#reglages');
  assert.equal(await page.locator('[data-a="code-creer"]').count(), 0);
  assert.equal(await page.locator('#jeton').count(), 1);
  await contexte.close();
});
