#!/usr/bin/env node
// Petit serveur local pour essayer l'application : npm run servir
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

/** Démarre le serveur. port = 0 laisse le système choisir un port libre (utilisé par les tests). */
export function servir(port = 0) {
  return new Promise((pret) => {
    const serveur = createServer(async (req, rep) => {
      try {
        let chemin = decodeURIComponent(new URL(req.url, 'http://local').pathname);
        if (chemin.endsWith('/')) chemin += 'index.html';
        const fichier = join(racine, normalize(chemin));
        if (fichier !== racine && !fichier.startsWith(racine + sep)) throw new Error('hors du dépôt');
        const corps = await readFile(fichier);
        rep.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        rep.end(corps);
      } catch {
        rep.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        rep.end('Introuvable');
      }
    });
    serveur.listen(port, '127.0.0.1', () => pret({
      url: 'http://127.0.0.1:' + serveur.address().port + '/',
      fermer: () => new Promise((fin) => { serveur.closeAllConnections?.(); serveur.close(fin); }),
    }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await servir(Number(process.env.PORT) || 8080);
  console.log('Plan de vol est servi sur ' + url + ' (Ctrl+C pour arrêter)');
}
