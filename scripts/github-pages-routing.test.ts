import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoProducts } from '../src/data/products';
import {
  addGithubPagesRoutes,
  DIRECT_ROUTE_ENTRIES,
  getPilotBaseRoutes,
  PRODUCT_SLUGS,
  STATIC_ROUTES,
} from './add-github-pages-routes.mjs';

const employerOrganizationId = '20000000-0000-4000-8000-000000000001';
const providerOrganizationId = '20000000-0000-4000-8000-000000000002';
const pilotEnvironment = {
  VILU_PILOT_EMPLOYER_ORG_ID: employerOrganizationId,
  VILU_PILOT_PROVIDER_ORG_ID: providerOrganizationId,
};

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

  it('keeps pilot routes absent unless both organization IDs are configured', () => {
    expect(getPilotBaseRoutes({})).toEqual([]);
    expect(() => getPilotBaseRoutes({ VILU_PILOT_EMPLOYER_ORG_ID: employerOrganizationId }))
      .toThrow('Both pilot organization IDs');
    expect(() => getPilotBaseRoutes({
      VILU_PILOT_EMPLOYER_ORG_ID: 'not-a-uuid',
      VILU_PILOT_PROVIDER_ORG_ID: providerOrganizationId,
    })).toThrow('canonical UUIDs');
    expect(() => getPilotBaseRoutes({
      VILU_PILOT_EMPLOYER_ORG_ID: employerOrganizationId,
      VILU_PILOT_PROVIDER_ORG_ID: employerOrganizationId,
    })).toThrow('must be different');
  });

  it('materializes only the known RU/EN pilot base routes when IDs are configured', async () => {
    const distDirectory = await mkdtemp(join(tmpdir(), 'vilu-pages-'));
    await writeFile(join(distDirectory, 'index.html'), '<main>ViLu SPA</main>');

    await addGithubPagesRoutes(distDirectory, pilotEnvironment);

    const routes = getPilotBaseRoutes(pilotEnvironment);
    expect(routes).toHaveLength(10);
    for (const route of routes) {
      await expect(readFile(join(distDirectory, route, 'index.html'), 'utf8'))
        .resolves.toBe('<main>ViLu SPA</main>');
    }
    await expect(access(join(
      distDirectory,
      `ru/organizations/${employerOrganizationId}/employee/referrals/dynamic-id/index.html`,
    ))).rejects.toThrow();
  });
});
