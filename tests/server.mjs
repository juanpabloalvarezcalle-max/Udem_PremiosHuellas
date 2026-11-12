/**
 * Servidor estático mínimo que imita GitHub Pages de un repositorio de proyecto:
 * el sitio se sirve bajo un subcamino (/Udem_PremiosHuellas/), no en la raíz.
 * Así, una ruta absoluta como "/imgs/x.webp" da 404 igual que en producción.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = '/Udem_PremiosHuellas/';
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT ?? 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.json': 'application/json'
};

async function resolver(urlPath) {
  if (!urlPath.startsWith(BASE)) return null;                       // fuera del subcamino: 404, como en Pages
  let relativo;
  try { relativo = decodeURIComponent(urlPath.slice(BASE.length)); } catch { return null; }
  const destino = normalize(join(ROOT, relativo));
  if (destino !== ROOT && !destino.startsWith(ROOT + sep)) return null; // evita path traversal
  if (relativo.split('/').some((p) => p.startsWith('.'))) return null;   // no expone .git, .github, etc.
  try {
    const info = await stat(destino);
    return info.isDirectory() ? join(destino, 'index.html') : destino;
  } catch { return null; }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const archivo = await resolver(pathname);
  if (!archivo) { res.writeHead(404).end('404'); return; }
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream' }).end(cuerpo);
  } catch { res.writeHead(404).end('404'); }
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}`));
