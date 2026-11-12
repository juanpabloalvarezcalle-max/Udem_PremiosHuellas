import { test, expect } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Páginas públicas del sitio: portada, categorías y fichas (se descubren solas al agregar archivos). */
function paginas() {
  const lista = ['index.html'];
  const recorrer = (dir) => {
    for (const nombre of readdirSync(join(ROOT, dir))) {
      const ruta = join(dir, nombre);
      if (statSync(join(ROOT, ruta)).isDirectory()) recorrer(ruta);
      else if (nombre.endsWith('.html')) lista.push(ruta.split(sep).join('/'));
    }
  };
  recorrer('docs/categorias');
  recorrer('proyectos');
  return lista;
}

/* ---------- Regresión: recursos y enlaces de cada página ---------- */

for (const pagina of paginas()) {
  test.describe(pagina, () => {
    test('should resolve every local image, link, script and stylesheet with 200 when served from a subpath', async ({ page, request }) => {
      await page.goto(pagina);
      const origen = new URL(page.url()).origin;

      // Se leen los atributos del HTML (no solo lo que el navegador descargó) para cubrir imágenes con loading="lazy"
      const urls = await page.evaluate(() => [
        ...[...document.querySelectorAll('img[src]')].map((e) => e.src),
        ...[...document.querySelectorAll('a[href]')].map((e) => e.href),
        ...[...document.querySelectorAll('script[src]')].map((e) => e.src),
        ...[...document.querySelectorAll('link[rel="stylesheet"][href], link[rel="icon"][href]')].map((e) => e.href)
      ]);

      const locales = [...new Set(urls.map((u) => u.split('#')[0]).filter((u) => u && u.startsWith(origen)))];
      const rotas = [];
      for (const url of locales) {
        const respuesta = await request.get(url);
        if (respuesta.status() !== 200) rotas.push(`${respuesta.status()}  ${decodeURI(new URL(url).pathname)}`);
      }
      expect(rotas, `Recursos rotos en ${pagina}`).toEqual([]);
    });

    test('should not throw JavaScript errors when loaded', async ({ page }) => {
      const errores = [];
      page.on('pageerror', (e) => errores.push(e.message));
      await page.goto(pagina, { waitUntil: 'load' });
      expect(errores).toEqual([]);
    });
  });
}

/* ---------- Smoke: flujos críticos ---------- */

test.describe('Portada', () => {
  test('should list six categories linking to their pages', async ({ page }) => {
    await page.goto('index.html');
    const tarjetas = page.locator('.categoria');
    await expect(tarjetas).toHaveCount(6);
    for (const href of await tarjetas.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^docs\/categorias\/[a-z-]+\.html$/);
    }
  });

  test('should open the category page when a category card is clicked', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('.categoria').first().click();
    await expect(page).toHaveURL(/docs\/categorias\/[a-z-]+\.html$/);
    await expect(page.locator('.proyecto').first()).toBeVisible();
  });

  test('should open the credits dialog and close it when Escape is pressed', async ({ page }) => {
    await page.goto('index.html');
    const dialogo = page.locator('#dialogo-creditos');
    await page.locator('[data-abrir-creditos]').click();
    await expect(dialogo).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
  });

  test.describe('con animaciones', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('should reveal header and categories when the entrance animation finishes', async ({ page }) => {
      await page.goto('index.html');
      // Las clases que ocultan el contenido deben retirarse (por la animación o por la red de seguridad)
      await expect(page.locator('html')).not.toHaveClass(/con-animaciones|con-carga/, { timeout: 10_000 });
      await expect(page.locator('.header__titulos h1')).toBeVisible();
      await expect(page.locator('.categoria')).toHaveCount(6);
    });
  });
});

test.describe('Ficha de proyecto: galería', () => {
  const FICHA = 'proyectos/entretenimiento-digital/forja-de-los-martires.html';

  test('should disable the previous arrow when the gallery is on the first image', async ({ page }) => {
    await page.goto(FICHA);
    await expect(page.locator('.galeria__flecha--anterior')).toBeDisabled();
    await expect(page.locator('.galeria__punto').first()).toHaveAttribute('aria-current', 'true');
  });

  test('should move to the second image when the next arrow is clicked', async ({ page }) => {
    await page.goto(FICHA);
    await page.locator('.galeria__flecha--siguiente').click();
    await expect(page.locator('.galeria__punto').nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.galeria__flecha--anterior')).toBeEnabled();
  });

  test('should move with arrow keys when the gallery track has focus', async ({ page }) => {
    await page.goto(FICHA);
    await page.locator('.galeria__pista').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.galeria__punto').nth(1)).toHaveAttribute('aria-current', 'true');
  });

  test('should prioritize the first gallery image and defer member photos when the page opens', async ({ page }) => {
    await page.goto(FICHA);
    const galeria = await page.locator('.galeria__imagen').evaluateAll((imgs) => imgs.map((i) => [i.loading, i.fetchPriority]));
    expect(galeria[0]).toEqual(['auto', 'high']);
    expect(galeria.every(([carga]) => carga === 'auto')).toBe(true);   // sin lazy: no hay huecos al deslizar
    const fotos = await page.locator('.integrante__foto').evaluateAll((imgs) => imgs.map((i) => i.loading));
    expect(fotos.every((l) => l === 'lazy')).toBe(true);
  });
});

/* ---------- SEO / Open Graph ---------- */

const SITE_URL = 'https://nominadoshuella.netlify.app/';

for (const pagina of paginas()) {
  test(`${pagina} should have description, canonical and a reachable Open Graph image`, async ({ page, request }) => {
    await page.goto(pagina);
    const meta = async (sel) => page.locator(sel).first().getAttribute('content');

    const descripcion = await meta('meta[name="description"]');
    expect(descripcion?.length, 'description').toBeGreaterThan(30);
    expect(descripcion.length, 'description <= 160').toBeLessThanOrEqual(160);
    expect(await meta('meta[property="og:title"]')).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`^${SITE_URL}`));

    // La imagen de vista previa debe existir: se traduce la URL pública a la del servidor de pruebas
    const ogImage = await meta('meta[property="og:image"]');
    expect(ogImage).toMatch(new RegExp(`^${SITE_URL}`));
    const local = new URL(ogImage.slice(SITE_URL.length), new URL('/Udem_PremiosHuellas/', page.url())).href;
    expect((await request.get(local)).status(), `og:image ${ogImage}`).toBe(200);
  });
}

test('should list only existing pages in sitemap.xml', async ({ request, baseURL }) => {
  const xml = await (await request.get('sitemap.xml')).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length).toBeGreaterThan(10);
  for (const u of urls) {
    expect(u.startsWith(SITE_URL)).toBe(true);
    expect((await request.get(new URL(u.slice(SITE_URL.length), baseURL).href)).status(), u).toBe(200);
  }
});

test('should point robots.txt to the sitemap', async ({ request }) => {
  const txt = await (await request.get('robots.txt')).text();
  expect(txt).toContain(`Sitemap: ${SITE_URL}sitemap.xml`);
});
