#!/usr/bin/env node
// Refait les captures d'écran du README (docs/captures) avec une progression d'exemple : npm run captures
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { servir } from './servir.mjs';
import { jusquAuxChoix, semer } from '../tests/aide.mjs';

const sortie = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'captures');
mkdirSync(sortie, { recursive: true });

const serveur = await servir(0);
const navigateur = await chromium.launch({ executablePath: process.env.PDV_CHROME || undefined, args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const page = await contexte.newPage();

// Une progression d'exemple : cinq semaines de révisions régulières.
await page.goto(serveur.url);
await page.waitForSelector('h1.page-t');
await semer(page);
await page.waitForTimeout(1300);
await page.screenshot({ path: join(sortie, 'accueil.png') });

await page.click('[data-a="jour"]');
await jusquAuxChoix(page);
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

await page.click('#nav a[href="#carnet"]');
await page.waitForSelector('.courbe');
await page.waitForTimeout(1300);
await page.screenshot({ path: join(sortie, 'carnet.png') });

await navigateur.close();
await serveur.fermer();
console.log('Captures enregistrées dans docs/captures');
