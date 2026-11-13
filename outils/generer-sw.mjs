#!/usr/bin/env node
// Met à jour, dans sw.js, la liste des fichiers à garder hors connexion et le numéro de version.
// À lancer après toute modification de l'application ou des fiches : npm run sw
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fichiers mis en cache à l'installation. data/actu.json n'en fait pas partie : il est relu sur le réseau à chaque lancement. */
export function fichiers() {
  const lister = (dossier, garder) => readdirSync(join(racine, dossier)).filter(garder).sort().map((f) => dossier + '/' + f);
  return [
    'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
    ...lister('fonts', (f) => /\.(css|woff2)$/.test(f)),
    ...lister('icons', (f) => /\.png$/.test(f)),
    ...lister('data', (f) => /\.js$/.test(f)),
  ];
}

/** Le numéro de version change dès qu'un fichier change : l'application se met alors à jour au lancement suivant. */
export function version(liste = fichiers()) {
  const h = createHash('sha256');
  for (const f of liste) { h.update(f); h.update(readFileSync(join(racine, f))); }
  return 'pdv-' + h.digest('hex').slice(0, 12);
}

export function appliquer(texte) {
  const liste = fichiers();
  const entete = 'var VERSION = ' + JSON.stringify(version(liste)) + ';\nvar FICHIERS = ' + JSON.stringify(liste, null, 2) + ';';
  if (!/var VERSION = [\s\S]*?\];/.test(texte)) throw new Error('En-tête de sw.js introuvable');
  return texte.replace(/var VERSION = [\s\S]*?\];/, entete);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chemin = join(racine, 'sw.js');
  const avant = readFileSync(chemin, 'utf8');
  const apres = appliquer(avant);
  if (process.argv.includes('--verifier')) {
    if (avant !== apres) { console.error('sw.js n\'est pas à jour : lance « npm run sw » puis valide le fichier.'); process.exit(1); }
    console.log('sw.js est à jour (' + version() + ').');
  } else {
    writeFileSync(chemin, apres);
    console.log('sw.js mis à jour : ' + version());
  }
}
