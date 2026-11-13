// L'application doit s'installer puis fonctionner sans réseau.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demarrer, jusquAuxChoix, ouvrir, repondre, texte } from './aide.mjs';

let env;
before(async () => { env = await demarrer(); });
after(async () => { await env.arreter(); });

test('tout est mis en cache à l\'installation, puis l\'application marche hors connexion', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url, { serviceWorkers: 'allow', configReelle: true });
  const rates = [];
  page.on('requestfailed', (r) => rates.push(r.url()));

  const cache = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((r) => setTimeout(r, 600));
    const cles = await caches.keys();
    const nom = cles.find((k) => /^pdv-[0-9a-f]{12}$/.test(k));
    return { nom, n: (await (await caches.open(nom)).keys()).length };
  });
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const attendus = JSON.parse(sw.match(/var FICHIERS = (\[[\s\S]*?\]);/)[1]);
  assert.equal(cache.nom, sw.match(/var VERSION = "([^"]+)"/)[1]);
  assert.equal(cache.n, attendus.length + 1, 'tous les fichiers, plus la page d\'entrée, doivent être en cache');

  await page.goto(env.url + '#reglages');
  await page.waitForFunction(() => document.getElementById('hors-detail').textContent.includes('Prête'));
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  assert.equal(await texte(page, '#version'), version);
  await page.click('[data-a="maj"]');
  await page.waitForFunction(() => /à jour \(version/.test(document.getElementById('maj-msg').textContent));
  assert.equal(await texte(page, '#maj-msg'), 'L\'application est à jour (version ' + version + ').');

  await contexte.setOffline(true);
  rates.length = 0;
  await page.goto(env.url + '#accueil');
  await page.reload();
  await page.waitForSelector('h1.page-t');
  const etat = await page.evaluate(async () => {
    await document.fonts.ready;
    return { packs: window.PDV.packs.length, b612: document.fonts.check('700 16px B612'), spectral: document.fonts.check('16px Spectral'), enLigne: navigator.onLine };
  });
  assert.deepEqual(etat, { packs: 7, b612: true, spectral: true, enLigne: false });
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);
  await repondre(page, false);
  await page.waitForSelector('.feuille.ko');
  await page.click('.feuille [data-a="suite"]');
  await page.click('[data-a="quitter"]');
  await page.click('#nav a[href="#oral"]');
  await page.waitForSelector('.tirage');
  assert.match(await texte(page, '#sync'), /cet appareil/);
  assert.deepEqual(rates, [], 'aucune requête ne doit échouer hors connexion');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});
