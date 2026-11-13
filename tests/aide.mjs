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

/**
 * Écrit une progression d'exemple dans le navigateur, puis recharge la page.
 * vus : repères déjà rencontrés ; jours : jours d'historique ; oral : jours avant l'oral ; neu : nouveautés par jour réglées.
 */
export async function semer(page, options = {}) {
  await page.evaluate((o) => {
    const jour = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    const ids = Object.keys(window.PDV.test.faits());
    const p = window.PDV.test.vide();
    const vus = o.vus === undefined ? 170 : o.vus, jours = o.jours === undefined ? 35 : o.jours;
    ids.slice(0, vus).forEach((id, i) => {
      const b = i < vus * 0.55 ? 4 + (i % 3) : 1 + (i % 3), rate = i % 5 === 0 ? 4 : 0, n = b + 2 + rate;
      p.cards[id] = { b, due: jour - 2 + (i % 12), n, ok: n - 1 - rate, t: Date.now() - i * 1000 };
    });
    for (let j = 0; j < jours; j++) {
      if (j % 9 === 4) continue;
      p.days[jour - j] = { n: 18 + ((j * 7) % 23), ok: 12 + ((j * 5) % 11), neu: j < 22 ? 7 : 2, ms: (8 + (j % 5)) * 60000 };
    }
    if (o.oraux !== false) {
      p.oraux = [[30, 'La dissuasion nucléaire française est-elle encore crédible ?', [2, 2, 3, 2]], [16, 'L\'Europe peut-elle se défendre seule ?', [3, 3, 3, 2]], [5, 'La puissance aérienne suffit-elle à gagner une guerre ?', [3, 4, 3, 4]]]
        .map(([il, titre, notes]) => ({ t: Date.now() - il * 86400000, s: null, titre, notes, total: notes.reduce((a, b) => a + b, 0) }));
    }
    p.best = { 'blitz:tout': 2340, 'frise:tout': 12 };
    if (o.oral !== null) p.set.exam = new Date(Date.now() + (o.oral === undefined ? 68 : o.oral) * 86400000).toISOString().slice(0, 10);
    if (o.neu) p.set.neu = o.neu;
    p.set.t = Date.now();
    window.localStorage.setItem('pdv.progression.v1', JSON.stringify(p));
  }, options);
  await page.reload();
  await page.waitForSelector('h1.page-t');
}

