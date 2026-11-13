// Aides communes aux tests : serveur local, navigateur, gestes fréquents.
import { chromium } from 'playwright';
import { servir } from '../outils/servir.mjs';

export const TELEPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

/** Démarre le serveur local et un navigateur. PDV_CHROME permet d'utiliser un Chrome déjà installé. */
export async function demarrer() {
  const serveur = await servir(0);
  const navigateur = await chromium.launch({
    executablePath: process.env.PDV_CHROME || undefined,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
  });
  return { url: serveur.url, navigateur, arreter: async () => { await navigateur.close(); await serveur.fermer(); } };
}

/** Ouvre l'application dans un contexte neuf (stockage vide). Sans service worker, sauf demande contraire. */
export async function ouvrir(navigateur, url, options = {}) {
  const contexte = await navigateur.newContext({ ...TELEPHONE, serviceWorkers: 'block', ...options });
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(url);
  await page.waitForSelector('h1.page-t');
  return { contexte, page, erreurs };
}

export const texte = async (page, selecteur) => ((await page.locator(selecteur).first().textContent()) || '').replace(/\s+/g, ' ').trim();

/** Passe les cartes de découverte jusqu'à la prochaine question à choix. */
export async function jusquAuxChoix(page) {
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.opt:not([disabled])').count()) return;
    if (await page.locator('[data-a="voir"]').count()) { await page.click('[data-a="voir"]'); await page.click('[data-a="auto"][data-r="ok"]'); continue; }
    await page.click('[data-a="suite"]');
  }
  throw new Error('aucune question à choix trouvée');
}

/** Répond à la question affichée : la bonne réponse si bonne = true, une mauvaise sinon. */
export async function repondre(page, bonne) {
  const i = await page.evaluate((b) => window.PDV.test.seance().q.opts.findIndex((o) => !!o.ok === b), bonne);
  await page.locator('.opt').nth(i).click();
}

export const attendreSync = (page, mot, delai = 9000) =>
  page.waitForFunction((m) => document.getElementById('sync').textContent.includes(m), mot, { timeout: delai });
