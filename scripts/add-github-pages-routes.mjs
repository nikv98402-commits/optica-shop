import { copyFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PILOT_ROUTE_ENVIRONMENT_KEYS = {
  employer: 'VILU_PILOT_EMPLOYER_ORG_ID',
  provider: 'VILU_PILOT_PROVIDER_ORG_ID',
};

export function getPilotBaseRoutes(environment = process.env) {
  const employerOrganizationId = environment[PILOT_ROUTE_ENVIRONMENT_KEYS.employer]?.trim();
  const providerOrganizationId = environment[PILOT_ROUTE_ENVIRONMENT_KEYS.provider]?.trim();

  if (!employerOrganizationId && !providerOrganizationId) return [];
  if (!employerOrganizationId || !providerOrganizationId) {
    throw new Error('Both pilot organization IDs are required to generate protected route entries');
  }
  if (!UUID_PATTERN.test(employerOrganizationId) || !UUID_PATTERN.test(providerOrganizationId)) {
    throw new Error('Pilot organization IDs must be canonical UUIDs');
  }
  if (employerOrganizationId === providerOrganizationId) {
    throw new Error('Pilot employer and provider organization IDs must be different');
  }

  return ['ru', 'en'].flatMap((locale) => [
    `${locale}/organizations/${employerOrganizationId}/employee/today`,
    `${locale}/organizations/${employerOrganizationId}/employee/passport`,
    `${locale}/organizations/${employerOrganizationId}/employee/profile`,
    `${locale}/organizations/${employerOrganizationId}/employer/outcomes`,
    `${locale}/organizations/${providerOrganizationId}/provider/queue`,
  ]);
}

export const PRODUCT_SLUGS = [
  'aurora-crystal',
  'noir-line',
  'solstice-honey',
  'polar-drive',
  'daily-air-plus',
  'comfort-monthly',
];

export const DIRECT_ROUTE_ENTRIES = ['assistant', 'dashboard', 'checkout', 'profile'];

export const STATIC_ROUTES = [
  'tryon',
  'eye-check',
  'eyecheck',
  'vision-check',
  'vision-tracker',
  'visiontracker',
  'catalog',
  'products',
  'product',
  'assistant',
  'dashboard',
  'profile',
  'cabinet',
  'checkout',
  'about',
  'brand',
  'payment/return',
  'payment/success',
  'payment/failed',
  'face-fit-score',
  'kak-vybrat-razmer-opravy',
  'pd-i-oprava',
  'oprava-pri-vysokih-dioptriyah',
  'primerit-ochki-online',
  'podbor-opravy-po-forme-lica',
  'vision-care',
  'vision-access',
  'impact',
  'access',
  'ai-source',
  'privacy',
  'terms',
  'disclaimer',
  ...PRODUCT_SLUGS.map((slug) => `products/${slug}`),
];

export async function addGithubPagesRoutes(distDirectory = 'dist', environment = process.env) {
  const entryPoint = join(distDirectory, 'index.html');
  const routes = [...STATIC_ROUTES, ...getPilotBaseRoutes(environment)];
  await Promise.all(
    routes.map(async (route) => {
      if (DIRECT_ROUTE_ENTRIES.includes(route)) {
        await copyFile(entryPoint, join(distDirectory, `${route}.html`));
        return;
      }

      const routeDirectory = join(distDirectory, route);
      await mkdir(routeDirectory, { recursive: true });
      await copyFile(entryPoint, join(routeDirectory, 'index.html'));
    }),
  );
  await copyFile(entryPoint, join(distDirectory, '404.html'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await addGithubPagesRoutes(process.argv[2] ?? 'dist');
}
