import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoProducts } from '../src/data/products';
import {
  addGithubPagesRoutes,
  DIRECT_ROUTE_ENTRIES,
  PRODUCT_SLUGS,
  STATIC_ROUTES,
} from './add-github-pages-routes.mjs';

describe('GitHub Pages SPA routing', () => {
  it('publishes a static entry for every product deep link', () => {
    expect(PRODUCT_SLUGS).toEqual(demoProducts.map(({ id }) => id));
    for (const slug of PRODUCT_SLUGS) {
      expect(STATIC_ROUTES).toContain(`products/${slug}`);
    }
  });

  it('materializes nested product routes and the SPA fallback', async () => {
    const distDirectory = await mkdtemp(join(tmpdir(), 'vilu-pages-'));
    await writeFile(join(distDirectory, 'index.html'), '<main>ViLu SPA</main>');

    await addGithubPagesRoutes(distDirectory);

    await expect(
      readFile(join(distDirectory, 'products/aurora-crystal/index.html'), 'utf8'),
    ).resolves.toBe('<main>ViLu SPA</main>');
    await expect(readFile(join(distDirectory, '404.html'), 'utf8')).resolves.toBe(
      '<main>ViLu SPA</main>',
    );
  });

  it('publishes direct app routes as clean-url HTML files without redirect directories', async () => {
    const distDirectory = await mkdtemp(join(tmpdir(), 'vilu-pages-'));
    await writeFile(join(distDirectory, 'index.html'), '<main>ViLu SPA</main>');

    await addGithubPagesRoutes(distDirectory);

    for (const route of DIRECT_ROUTE_ENTRIES) {
      await expect(readFile(join(distDirectory, `${route}.html`), 'utf8')).resolves.toBe(
        '<main>ViLu SPA</main>',
      );
      await expect(access(join(distDirectory, route, 'index.html'))).rejects.toThrow();
    }
  });

  it('publishes /profile as a direct HTTP 200 entry before the SPA canonicalizes it', async () => {
    const distDirectory = await mkdtemp(join(tmpdir(), 'vilu-pages-'));
    await writeFile(join(distDirectory, 'index.html'), '<main>ViLu SPA</main>');

    await addGithubPagesRoutes(distDirectory);

    await expect(readFile(join(distDirectory, 'profile.html'), 'utf8')).resolves.toBe(
      '<main>ViLu SPA</main>',
    );
    await expect(access(join(distDirectory, 'profile', 'index.html'))).rejects.toThrow();
  });
});
