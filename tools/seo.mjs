/**
 * Genera las etiquetas SEO / Open Graph de cada página, robots.txt y sitemap.xml.
 * Idempotente: reemplaza el bloque entre <!-- SEO --> y <!-- /SEO --> si ya existe.
 * Uso: npm run seo   (volver a correr cuando cambie un título, una categoría o se complete una ficha)
 *
 * Los datos salen del propio HTML (título, categoría, asignatura); la imagen de vista previa
 * de cada ficha es imgs/og/<categoria>/<ficha>.jpg si existe, si no la general.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_URL = 'https://nominadoshuella.netlify.app/';
const SITE_NAME = 'Premios Huella 2026';
const OG_DEFAULT = { path: 'imgs/og-huella.jpg', width: 1200, height: 630, alt: 'Premios Huella 2026 · Museo de los nominados' };
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAX_DESC = 160;
const PLACEHOLDER = /Nombre del proyecto|Nombre de la asignatura|PlaceholderLC|proyecto-no-foto/;

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textoPlano = (html) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const primero = (html, re) => { const m = html.match(re); return m ? textoPlano(m[1]) : ''; };
const aPosix = (p) => p.split(sep).join('/');

/** Recorta en el último espacio para no cortar palabras. */
export function recortar(texto, max = MAX_DESC) {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}

/** URL absoluta y codificada (espacios, tildes) a partir de una ruta relativa al repo. */
export const absoluta = (rutaRepo) => new URL(rutaRepo.split('/').map(encodeURIComponent).join('/'), SITE_URL).href;

function paginas() {
  const lista = ['index.html'];
  const recorrer = (dir) => {
    for (const n of readdirSync(join(ROOT, dir)).sort()) {
      const r = join(dir, n);
      if (statSync(join(ROOT, r)).isDirectory()) recorrer(r);
      else if (n.endsWith('.html')) lista.push(aPosix(r));
    }
  };
  recorrer('docs/categorias');
  recorrer('proyectos');
  return lista;
}

/** Extrae los datos de una página según su tipo. */
export function datos(ruta, html) {
  const esPlantilla = PLACEHOLDER.test(primero(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) ||
                      /ficha__titulo">\s*Nombre del proyecto/.test(html);

  if (ruta === 'index.html') {
    return {
      titulo: 'Museo de los nominados | Premios Huella 2026',
      descripcion: 'Museo de los nominados de los Premios Huella 2026: explora los proyectos nominados en seis categorías.',
      imagen: null, indexable: true
    };
  }

  if (ruta.startsWith('docs/categorias/')) {
    const categoria = primero(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/^Categoría:\s*/i, '');
    return {
      titulo: `${categoria} | ${SITE_NAME}`,
      descripcion: recortar(`Proyectos nominados en la categoría ${categoria} de los Premios Huella 2026.`),
      imagen: null, indexable: true
    };
  }

  // Ficha de proyecto
  const titulo = primero(html, /class="ficha__titulo"[^>]*>([\s\S]*?)<\/h1>/i);
  const categoria = primero(html, /class="ficha__categoria"[^>]*>([\s\S]*?)<\/span>/i);
  const asignatura = primero(html, /class="ficha__etiqueta">\s*Asignatura\s*<\/p>\s*<p class="ficha__dato">([\s\S]*?)<\/p>/i);

  // Vista previa: JPG 1200x630 en imgs/og/<categoria>/<ficha>.jpg (WhatsApp/LinkedIn no siempre aceptan WebP).
  // Si no existe (ficha nueva), se usa la imagen general del sitio.
  const [, cat, archivo] = ruta.split('/');
  const jpg = `imgs/og/${cat}/${archivo.replace(/\.html$/, '')}.jpg`;
  const imagen = !esPlantilla && existsSync(join(ROOT, jpg))
    ? { path: jpg, width: 1200, height: 630, alt: `Imagen del proyecto «${titulo}»` }
    : null;

  let descripcion = `«${titulo}», proyecto nominado en ${categoria} en los Premios Huella 2026.`;
  if (asignatura && !PLACEHOLDER.test(asignatura)) descripcion += ` Asignatura: ${asignatura}.`;

  return {
    titulo: `${titulo} | ${SITE_NAME}`,
    descripcion: recortar(descripcion),
    imagen,
    indexable: !esPlantilla
  };
}

export function bloque(ruta, d) {
  const url = absoluta(ruta === 'index.html' ? '' : ruta);
  const img = d.imagen ?? OG_DEFAULT;
  const lineas = [
    '<!-- SEO (generado por tools/seo.mjs: no editar a mano, correr "npm run seo") -->',
    `<meta name="description" content="${escapar(d.descripcion)}">`,
    d.indexable ? null : '<meta name="robots" content="noindex">',
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    '<meta property="og:locale" content="es_CO">',
    `<meta property="og:title" content="${escapar(d.titulo)}">`,
    `<meta property="og:description" content="${escapar(d.descripcion)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${absoluta(img.path)}">`,
    img.width ? `<meta property="og:image:width" content="${img.width}">` : null,
    img.height ? `<meta property="og:image:height" content="${img.height}">` : null,
    `<meta property="og:image:alt" content="${escapar(img.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<!-- /SEO -->'
  ];
  return lineas.filter(Boolean).join('\n');
}

export function aplicar(html, nuevo) {
  const previo = /<!-- SEO[\s\S]*?<!-- \/SEO -->\n?/;
  if (previo.test(html)) return html.replace(previo, nuevo + '\n');
  return html.replace(/(<\/title>\s*\n?)/i, `$1${nuevo}\n`);
}

function main() {
  const urls = [];
  let cambios = 0;
  for (const ruta of paginas()) {
    const archivo = join(ROOT, ruta);
    const html = readFileSync(archivo, 'utf8');
    const d = datos(ruta, html);
    const salida = aplicar(html, bloque(ruta, d));
    if (salida !== html) { writeFileSync(archivo, salida); cambios++; }
    if (d.indexable) urls.push(absoluta(ruta === 'index.html' ? '' : ruta));
  }

  writeFileSync(join(ROOT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');

  writeFileSync(join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /tests/\nDisallow: /tools/\n\nSitemap: ${SITE_URL}sitemap.xml\n`);

  console.log(`SEO: ${cambios} páginas actualizadas, ${urls.length} URLs en el sitemap (las fichas de plantilla quedan con noindex).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
