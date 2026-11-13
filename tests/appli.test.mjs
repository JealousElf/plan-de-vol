// Parcours principaux de l'application, dans un navigateur réel.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { demarrer, jusquAuxChoix, ouvrir, repondre, texte } from './aide.mjs';

let env;
before(async () => { env = await demarrer(); });
after(async () => { await env.arreter(); });

test('l\'accueil présente la séance du jour et les packs par thème', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  assert.equal(await page.locator('.check').count(), 7);
  assert.deepEqual(await page.locator('.bloc .groupe').allTextContents(), ['Histoire', 'Armées françaises']);
  assert.ok(await page.locator('[data-a="jour"]').isVisible());
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('séance : la fiche s\'ouvre en feuille basse, une bonne réponse enchaîne, une erreur attend', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);

  await repondre(page, false);
  await page.waitForSelector('.feuille.ko');
  assert.match(await texte(page, '.feuille .bonne'), /^Bonne réponse/);
  assert.match(await page.locator('.feuille a[data-a="flag"]').getAttribute('href'), /github\.com\/[^/]+\/[^/]+\/issues\/new\?template=erreur-fiche\.yml&title=/);
  await page.waitForTimeout(2100);
  assert.equal(await page.locator('.feuille.ko').count(), 1, 'une erreur ne doit pas enchaîner toute seule');
  await page.click('.feuille [data-a="suite"]');

  await jusquAuxChoix(page);
  const avant = await texte(page, '.compte');
  await repondre(page, true);
  await page.waitForSelector('.feuille.ok .btn.rebours');
  await page.waitForFunction((a) => !document.querySelector('.feuille') && document.querySelector('.compte').textContent.trim() !== a, avant, { timeout: 4000 });

  await jusquAuxChoix(page);
  await repondre(page, true);
  await page.click('.feuille .fait-r');
  await page.waitForTimeout(2100);
  assert.equal(await page.locator('.feuille.ok').count(), 1, 'toucher la fiche doit suspendre l\'enchaînement');
  assert.equal(await page.locator('.btn.rebours').count(), 0);
  await page.click('.feuille [data-a="suite"]');
  await page.click('[data-a="quitter"]');
  assert.match(await texte(page, '.legende'), /en cours/);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('réglage : on peut couper l\'enchaînement automatique, et le choix est gardé', async () => {
  const { contexte, page } = await ouvrir(env.navigateur, env.url + '#reglages');
  await page.selectOption('#r-auto', '0');
  await page.reload();
  assert.equal(await page.locator('#r-auto').inputValue(), '0');
  await page.goto(env.url + '#accueil');
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);
  await repondre(page, true);
  await page.waitForSelector('.feuille.ok');
  assert.equal(await page.locator('.btn.rebours').count(), 0);
  await page.waitForTimeout(2100);
  assert.equal(await page.locator('.feuille.ok').count(), 1);
  await contexte.close();
});

test('blitz : une bonne réponse enchaîne sans fiche, une erreur montre la bonne réponse', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await page.click('[data-a="choix"][data-m="blitz"]');
  await page.click('[data-a="go"][data-p="aae"]');
  const avant = await texte(page, '.compte');
  await repondre(page, true);
  await page.waitForFunction((a) => document.querySelector('.compte').textContent.trim() !== a, avant, { timeout: 3000 });
  assert.equal(await page.locator('.feuille').count(), 0);
  await repondre(page, false);
  await page.waitForSelector('.feuille.ko .bonne');
  await page.click('.feuille [data-a="suite"]');
  await page.click('[data-a="quitter"]');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('frise : cinq événements à ordonner, puis correction', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await page.click('[data-a="choix"][data-m="frise"]');
  assert.equal(await page.locator('[data-a="go"][data-p="prog"]').count(), 0, 'un pack sans assez de dates n\'est pas proposé');
  await page.click('[data-a="go"][data-p="ops"]');
  assert.equal(await page.locator('button.frise-item').count(), 5);
  for (let i = 0; i < 5; i++) await page.locator('button.frise-item').nth(i).click();
  await page.click('[data-a="frise-ok"]');
  await page.waitForSelector('[data-a="frise-suite"]');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('fiches : onglets par thème, recherche, fiche à question', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url + '#fiches');
  await page.click('.onglets.themes [data-a="fpack"][data-p="aae"]');
  assert.equal(await page.locator('details.fiche').count(), 33);
  await page.fill('#rech', 'rafale');
  const n = await page.locator('details.fiche').count();
  assert.ok(n > 0 && n < 33);
  await page.locator('details.fiche summary').first().click();
  assert.ok(await page.locator('details.fiche[open] .fait-r').first().isVisible());
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('grand oral : deux sujets au choix, trois temps, bilan enregistré', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url + '#oral');
  assert.equal(await page.locator('.tirage').count(), 2);
  const sujets = await page.locator('.tirage .sujet').allTextContents();
  assert.notEqual(sujets[0], sujets[1]);
  await page.click('[data-a="oral-go"][data-i="1"]');
  await page.waitForSelector('#minuteur');
  assert.equal(await texte(page, 'h1.sujet'), sujets[1].trim());
  for (let i = 0; i < 3; i++) await page.click('[data-a="oral-suite"]');
  for (let c = 0; c < 4; c++) await page.click(`[data-a="note"][data-c="${c}"][data-n="3"]`);
  await page.click('[data-a="oral-save"]');
  await page.waitForSelector('.bravo');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('pack d\'actualité : un fichier valide ajoute le thème Actualité', async () => {
  const contexte = await env.navigateur.newContext({ serviceWorkers: 'block' });
  const fait = (n) => ({ id: 'ac-test-' + n, g: 'Semaine de test', y: 2026, d: n + ' novembre 2026', t: 'Fait ' + n, q: 'Question ' + n + ' ?', a: 'Oui', x: ['Non', 'Peut-être', 'Jamais'], r: 'Résumé du fait de test numéro ' + n + '.', maj: 1 });
  await contexte.route('**/data/actu.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'actu', theme: 'Actualité', titre: 'Actualité de la semaine', court: 'Actualité', sous: 'Test', maj: '2026-11-16', faits: [1, 2, 3].map(fait) }) }));
  const page = await contexte.newPage();
  await page.goto(env.url);
  await page.waitForFunction(() => document.querySelectorAll('.check').length === 8);
  assert.deepEqual(await page.locator('.bloc .groupe').allTextContents(), ['Histoire', 'Armées françaises', 'Actualité']);
  await contexte.close();
});
