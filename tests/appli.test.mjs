// Parcours principaux de l'application, dans un navigateur réel.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { SANS_SERVICE, TELEPHONE, demarrer, jusquAuxChoix, ouvrir, repondre, semer, texte } from './aide.mjs';

let env;
before(async () => { env = await demarrer(); });
after(async () => { await env.arreter(); });

test('l\'accueil présente la séance du jour, les actualités et les packs par thème', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  assert.equal(await page.locator('.check').count(), 8);
  assert.deepEqual(await page.locator('.bloc .groupe').allTextContents(), ['Histoire', 'Armées françaises', 'Culture générale']);
  assert.ok(await page.locator('[data-a="jour"]').isVisible());
  assert.equal(await page.locator('#news h2').textContent(), 'Actualités');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('séance : rien n\'enchaîne tout seul par défaut, « En savoir plus » s\'ouvre, et la séance se reprend', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);

  await repondre(page, false);
  await page.waitForSelector('.feuille.ko');
  assert.match(await texte(page, '.feuille .bonne'), /^Bonne réponse/);
  assert.match(await page.locator('.feuille a[data-a="flag"]').getAttribute('href'), /github\.com\/[^/]+\/[^/]+\/issues\/new\?template=erreur-fiche\.yml&title=/);
  await page.click('.feuille [data-a="suite"]');

  await jusquAuxChoix(page);
  await repondre(page, true);
  await page.waitForSelector('.feuille.ok');
  assert.equal(await page.locator('.btn.rebours').count(), 0, 'par défaut, une bonne réponse attend aussi');
  const plus = page.locator('.feuille details.plus');
  assert.equal(await plus.count(), 1);
  assert.equal(await plus.locator('.plus-corps').isVisible(), false);
  await plus.locator('summary').click();
  assert.ok(await plus.locator('.plus-corps').isVisible());
  assert.match(await plus.locator('.plus-wiki a').getAttribute('href'), /^https:\/\/fr\.wikipedia\.org\/w\/index\.php\?search=/);
  assert.equal(await plus.locator('.plus-wiki a').getAttribute('target'), '_blank');
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.feuille.ok').count(), 1);

  // on quitte en pleine séance : l'accueil propose de reprendre, même après un rechargement
  const [n, total] = (await texte(page, '.compte')).split(' / ').map(Number);
  await page.click('[data-a="quitter"]');
  await page.reload();
  await page.waitForSelector('[data-a="reprendre"]');
  assert.match(await texte(page, '.bloc.seance .chiffres'), new RegExp('question ' + (n + 1) + ' sur ' + total + '\\.$'));
  await page.click('[data-a="reprendre"]');
  await page.waitForSelector('.compte');
  assert.equal(await texte(page, '.compte'), (n + 1) + ' / ' + total);
  await page.click('[data-a="quitter"]');
  await page.click('[data-a="seance-abandon"]');
  assert.equal(await page.locator('[data-a="reprendre"]').count(), 0);
  assert.ok(await page.locator('.bloc.seance').isVisible());
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('réglage : passer à la suite après une bonne réponse, au délai choisi, et le choix est gardé', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url + '#reglages');
  assert.equal(await page.locator('#r-enchaine').inputValue(), '0', 'par défaut : jamais');
  await page.selectOption('#r-enchaine', '3');
  await page.reload();
  assert.equal(await page.locator('#r-enchaine').inputValue(), '3');
  await page.goto(env.url + '#accueil');
  await page.click('[data-a="jour"]');
  await jusquAuxChoix(page);
  const avant = await texte(page, '.compte');
  await repondre(page, true);
  await page.waitForSelector('.feuille.ok .btn.rebours');
  assert.equal(await page.locator('.feuille .btn.rebours').getAttribute('style'), '--rebours:3s');
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.feuille.ok').count(), 1, 'pas avant trois secondes');
  await page.waitForFunction((a) => !document.querySelector('.feuille') && document.querySelector('.compte').textContent.trim() !== a, avant, { timeout: 4000 });

  await jusquAuxChoix(page);
  await repondre(page, true);
  await page.waitForSelector('.feuille.ok .btn.rebours');
  await page.click('.feuille details.plus summary');
  await page.waitForTimeout(3500);
  assert.equal(await page.locator('.feuille.ok').count(), 1, 'ouvrir « En savoir plus » suspend l\'enchaînement');
  assert.equal(await page.locator('.btn.rebours').count(), 0);
  await page.click('.feuille .fait-r');
  assert.equal(await page.locator('.feuille.ok').count(), 1);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('actualités : les gros titres défilent, se filtrent par thème et ouvrent le site du média', async () => {
  const contexte = await env.navigateur.newContext({ ...TELEPHONE, serviceWorkers: 'block' });
  await contexte.route('**/config.js', (route) => route.fulfill(SANS_SERVICE));
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  const articles = [
    { t: 'Un titre sur les armées', u: 'https://media-a.example/armees', s: 'Média A', th: 'def', d: il(2) },
    { t: 'Un titre sur le monde', u: 'https://media-b.example/monde', s: 'Média B', th: 'int', d: il(5) },
    { t: 'Un titre sur l\'espace', u: 'https://media-c.example/espace', s: 'Média C', th: 'aero', d: il(30) },
  ];
  let reponse = { contentType: 'application/json', body: JSON.stringify({ maj: il(1), articles }) };
  await contexte.route('**/data/news.json', (route) => route.fulfill(reponse));
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(env.url);
  await page.waitForSelector('.news-carte');
  assert.equal(await page.locator('.news-carte').count(), 3);
  assert.equal(await texte(page, '.news-maj'), 'Mis à jour il y a 1 h');
  const carte = page.locator('.news-carte').first();
  assert.equal(await carte.getAttribute('href'), 'https://media-a.example/armees');
  assert.equal(await carte.getAttribute('target'), '_blank');
  assert.equal(await texte(page, '.news-carte .news-meta'), 'Média A, il y a 2 h');
  assert.equal(await page.locator('#news-rail').evaluate((el) => getComputedStyle(el).overflowX), 'auto');

  await page.click('#news [data-a="news"][data-th="def"]');
  assert.equal(await page.locator('.news-carte').count(), 1);
  assert.equal(await page.locator('#news [data-th="def"]').getAttribute('aria-pressed'), 'true');
  await page.click('#news [data-a="news"][data-th="pol"]');
  assert.equal(await page.locator('.news-carte').count(), 0);
  assert.match(await texte(page, '#news-rail'), /Aucun titre/);

  reponse = { status: 404, body: '' };
  await page.reload();
  await page.waitForSelector('#news .note');
  assert.match(await texte(page, '#news .note'), /indisponibles|retour du réseau/);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('citations : 57 citations, chacune avec son paragraphe « En savoir plus »', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url + '#fiches');
  await page.click('.onglets.themes [data-a="fpack"][data-p="cit"]');
  assert.equal(await page.locator('details.fiche').count(), 57);
  await page.fill('#rech', 'faire face');
  await page.locator('details.fiche summary').first().click();
  await page.locator('details.fiche[open] details.plus summary').first().click();
  assert.match(await texte(page, 'details.fiche[open] .plus-corps p'), /Guynemer/);
  assert.equal(await texte(page, 'details.fiche[open] .plus-wiki a'), 'Pour aller plus loin : Wikipédia');
  assert.deepEqual(erreurs, []);
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
  await page.waitForFunction(() => document.querySelectorAll('.check').length === 9);
  assert.deepEqual(await page.locator('.bloc .groupe').allTextContents(), ['Histoire', 'Armées françaises', 'Culture générale', 'Actualité']);
  await contexte.close();
});

test('première ouverture : la date de l\'oral et le rythme se règlent depuis l\'accueil', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  assert.equal(await texte(page, 'h1.page-t'), 'Cap sur l\'oral');
  assert.equal(await texte(page, '.seance h2'), 'Avant le décollage');
  const champ = await page.locator('#a-exam').elementHandle();
  await page.fill('#a-exam', new Date(Date.now() + 40 * 86400000 + 43200000).toISOString().slice(0, 10));
  await page.waitForFunction(() => /^Oral dans (39|40|41) jours$/.test(document.querySelector('h1.page-t').textContent));
  assert.match(await texte(page, '.piste .numero'), /^J-(39|40|41)$/);
  assert.ok(await champ.evaluate((n) => n.isConnected), 'le champ de date ne doit pas être redessiné pendant la saisie');
  await page.selectOption('#a-neu', '15');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pdv.progression.v1')).set.neu), 15);
  await page.click('[data-a="jour"]');
  await page.waitForSelector('.ecran-seance');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('carnet : prévision, calendrier, maîtrise par thème et chiffres en tableau', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await semer(page);
  assert.match(await texte(page, '.cap-ligne'), /programme vu le \d/);
  await page.click('#nav a[href="#carnet"]');
  await page.waitForSelector('.courbe');
  assert.equal(await texte(page, '.cap .statut.ok'), 'Dans les temps');
  assert.match(await texte(page, '.cap .chiffres'), /tout le programme est vu le .+ jours avant l'oral\.$/);
  assert.match(await page.locator('.cap .g-plot').getAttribute('aria-label'), /^Repères vus au fil des jours : 170 sur \d+ aujourd'hui/);
  const futurs = 6 - ((new Date().getDay() + 6) % 7);
  assert.equal(await page.locator('.cal-grille i[data-v]').count(), 105 - futurs);
  assert.equal(await page.locator('.cal-grille i.auj').count(), 1);
  assert.equal(await page.locator('.mr .seg').count(), 8);
  assert.equal(await page.locator('.tuile').count(), 7);
  assert.ok(await page.locator('.rates li').count() >= 4, 'repères qui résistent et oraux');

  // les mêmes chiffres en tableau
  await page.click('.cap .releve summary');
  assert.ok(await page.locator('.cap .releve tbody tr').count() >= 8);

  // au clavier : une semaine en arrière dans le calendrier
  await page.mouse.move(2, 2);
  await page.locator('.cal-grille i.auj').focus();
  await page.keyboard.press('ArrowLeft');
  const ilYASeptJours = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date());
  await page.waitForSelector('#bulle:not([hidden])');
  assert.match(await texte(page, '#bulle'), new RegExp(ilYASeptJours));

  // au pointeur : le viseur lit la courbe
  await page.locator('.cap .g-plot').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);   // le défilement ferme les bulles : on le laisse finir
  const cadre = await page.locator('.cap .g-plot').boundingBox();
  await page.mouse.move(cadre.x + cadre.width * 0.8, cadre.y + cadre.height / 2);
  await page.waitForFunction(() => /repères? vus?/.test(document.getElementById('bulle').textContent));
  assert.match(await texte(page, '#bulle'), /prévision$/);
  assert.equal(await page.locator('.cap .g-fil').isVisible(), true);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('carnet : en retard sur le plan, le rythme conseillé s\'applique en un geste', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await semer(page, { vus: 20, jours: 2, oral: 25, neu: 5, oraux: false });
  await page.click('#nav a[href="#carnet"]');
  assert.equal(await texte(page, '.cap .statut.attn'), 'En retard sur le plan');
  assert.equal(await texte(page, '[data-a="rythme"]'), 'Passer à 20 nouveautés par jour');
  await page.click('[data-a="rythme"]');
  assert.equal(await texte(page, '.bravo'), 'Rythme réglé sur 20 nouveautés par jour.');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pdv.progression.v1')).set.neu), 20);
  assert.equal(await texte(page, '.cap .statut.ok'), 'Dans les temps');
  assert.equal(await page.locator('[data-a="rythme"]').count(), 0);
  assert.match(await texte(page, '.bloc:has(> h2:text-is("Oraux blancs")) .note'), /Aucun oral blanc/);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('carnet : les repères qui résistent se retravaillent en une séance', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  await semer(page);
  await page.click('#nav a[href="#carnet"]');
  await page.waitForSelector('[data-a="faibles"]');
  const nb = await page.locator('.bloc:has(> h2:text-is("Repères qui résistent")) .rates li').count();
  assert.ok(nb >= 2 && nb <= 8);
  await page.click('[data-a="faibles"]');
  await page.waitForSelector('.ecran-seance');
  assert.equal(await page.evaluate(() => window.PDV.test.seance().items.length), nb);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('apparence : le thème choisi est appliqué tout de suite et gardé au rechargement', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url, { colorScheme: 'light' });
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const fond = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#sync');
  const clair = await fond();
  await page.selectOption('#r-theme', 'dark');
  assert.equal(await theme(), 'dark');
  assert.notEqual(await fond(), clair);
  await page.reload();
  await page.waitForSelector('#r-theme');
  assert.equal(await theme(), 'dark');
  assert.equal(await page.inputValue('#r-theme'), 'dark');
  await page.selectOption('#r-theme', '');
  assert.equal(await theme(), null);
  assert.equal(await fond(), clair);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('écran large : accueil et carnet sur deux colonnes, onglets dans l\'en-tête', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url, { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await semer(page);
  const colonnes = () => page.evaluate(() => getComputedStyle(document.querySelector('.cols')).gridTemplateColumns.split(' ').length);
  assert.equal(await colonnes(), 2);
  const marque = await page.locator('.brand').boundingBox(), onglets = await page.locator('#nav').boundingBox();
  assert.ok(Math.abs((marque.y + marque.height / 2) - (onglets.y + onglets.height / 2)) < 8, 'la marque et les onglets partagent une ligne');
  await page.click('#nav a[href="#carnet"]');
  await page.waitForSelector('.courbe');
  assert.equal(await colonnes(), 2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'aucun défilement horizontal');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('en-tête : un bouton Réglages explicite, à côté de l\'état de synchronisation', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  assert.equal((await texte(page, '#vers-reglages')).trim(), 'Réglages');
  assert.equal(await texte(page, '#sync'), 'Progression sur cet appareil');
  const bouton = await page.locator('#vers-reglages').boundingBox(), etat = await page.locator('#sync').boundingBox();
  assert.ok(bouton.height >= 40 && bouton.x + bouton.width <= 390, 'bouton assez grand pour le doigt, sans déborder');
  assert.ok(etat.x + etat.width <= bouton.x, 'l\'état de synchronisation ne passe pas sous le bouton');
  await page.click('#vers-reglages');
  await page.waitForFunction(() => document.querySelector('h1.page-t').textContent === 'Réglages');
  assert.equal(await page.locator('#vers-reglages').getAttribute('aria-current'), 'page');
  await page.click('#nav a[href="#accueil"]');
  await page.waitForFunction(() => document.querySelector('h1.page-t').textContent !== 'Réglages');
  assert.equal(await page.locator('#vers-reglages').getAttribute('aria-current'), null);
  await page.click('[data-a="jour"]');
  await page.waitForSelector('.ecran-seance');
  assert.equal(await page.locator('#vers-reglages').isVisible(), false, 'pas de sortie accidentelle pendant une séance');
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

test('après une mise à jour, l\'accueil annonce une seule fois la version installée', async () => {
  const { contexte, page, erreurs } = await ouvrir(env.navigateur, env.url);
  assert.equal(await page.locator('.bravo').count(), 0, 'rien à annoncer à la première ouverture');
  const version = await page.evaluate(() => localStorage.getItem('pdv.version'));
  assert.match(version, /^\d+\.\d+\.\d+$/);
  await page.evaluate(() => localStorage.setItem('pdv.version', '0.9.0'));
  await page.reload();
  assert.equal(await texte(page, '.bravo'), 'Application mise à jour : version ' + version + '.');
  await page.reload();
  await page.waitForSelector('h1.page-t');
  assert.equal(await page.locator('.bravo').count(), 0);
  await page.click('#vers-reglages');
  await page.waitForSelector('#version');
  assert.equal(await texte(page, '#version'), version);
  assert.deepEqual(erreurs, []);
  await contexte.close();
});

