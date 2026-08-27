import { copyFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const PRODUCT_SLUGS = [
  'aurora-crystal',
  'noir-line',
  'solstice-honey',
  'polar-drive',
  'daily-air-plus',
  'comfort-monthly',
];

export const DIRECT_ROUTE_ENTRIES = ['assistant', 'dashboard', 'checkout'];

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

export async function addGithubPagesRoutes(distDirectory = 'dist') {
  const entryPoint = join(distDirectory, 'index.html');
  await Promise.all(
    STATIC_ROUTES.map(async (route) => {
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
