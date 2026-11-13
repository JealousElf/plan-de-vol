#!/usr/bin/env node
// Refait les captures d'écran du README (docs/captures) avec une progression d'exemple : npm run captures
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { servir } from './servir.mjs';

const sortie = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'captures');
mkdirSync(sortie, { recursive: true });

const serveur = await servir(0);
const navigateur = await chromium.launch({ executablePath: process.env.PDV_CHROME || undefined, args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const page = await contexte.newPage();

// Une progression d'exemple : trois semaines de révisions régulières.
await page.goto(serveur.url);
await page.waitForSelector('h1.page-t');
await page.evaluate(() => {
  const jour = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ids = Object.keys(window.PDV.test.faits());
  const p = window.PDV.test.vide();
  ids.slice(0, 170).forEach((id, i) => { const b = i < 95 ? 4 + (i % 3) : 1 + (i % 3); p.cards[id] = { b, due: jour + 1 + (i % 9), n: b + 2, ok: b + 1, t: Date.now() - i * 1000 }; });
  for (let j = 1; j <= 21; j++) p.days[jour - j] = { n: 18 + ((j * 7) % 23), ok: 14 + ((j * 5) % 11), neu: 10 };
  const examen = new Date(Date.now() + 68 * 86400000);
  p.set.exam = examen.toISOString().slice(0, 10); p.set.t = Date.now();
  window.localStorage.setItem('pdv.progression.v1', JSON.stringify(p));
});
await page.reload();
await page.waitForSelector('h1.page-t');
await page.screenshot({ path: join(sortie, 'accueil.png') });

await page.click('[data-a="jour"]');
for (let i = 0; i < 30 && !(await page.locator('.opt:not([disabled])').count()); i++) await page.click('[data-a="suite"]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(sortie, 'question.png') });
const mauvaise = await page.evaluate(() => window.PDV.test.seance().q.opts.findIndex((o) => !o.ok));
await page.locator('.opt').nth(mauvaise).click();
await page.waitForSelector('.feuille.ko');
await page.waitForTimeout(400);
await page.screenshot({ path: join(sortie, 'fiche.png') });
await page.click('.feuille [data-a="suite"]');
await page.click('[data-a="quitter"]');

await page.click('#nav a[href="#oral"]');
await page.waitForSelector('.tirage');
await page.screenshot({ path: join(sortie, 'grand-oral.png') });

await navigateur.close();
await serveur.fermer();
console.log('Captures enregistrées dans docs/captures');
