const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:5176').replace(/\/$/, '');

const checks = [
  { path: '/', type: 'html' },
  { path: '/products', type: 'html' },
  { path: '/tryon', type: 'html' },
  { path: '/vision-tracker', type: 'html' },
  { path: '/face-fit-score', type: 'html' },
  { path: '/ai-source', type: 'html' },
  { path: '/privacy', type: 'html' },
  { path: '/terms', type: 'html' },
  { path: '/disclaimer', type: 'html' },
  { path: '/robots.txt', type: 'text' },
  { path: '/sitemap.xml', type: 'text' },
  { path: '/llms.txt', type: 'text' },
];

const failures = [];

async function checkRoute({ path, type }) {
  const url = `${baseUrl}${path}`;
  // GitHub Pages canonicalizes directory routes with a trailing-slash redirect.
  // Follow it so the smoke test validates the final application response.
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();

  if (!response.ok) {
    failures.push(`${path}: expected 2xx, got ${response.status}`);
    return;
  }

  if (type === 'html' && !body.includes('<div id="root">')) {
    failures.push(`${path}: expected Vite app HTML root`);
  }

  if (path === '/robots.txt' && !body.includes('Sitemap:')) {
    failures.push('/robots.txt: missing Sitemap entry');
  }

  if (path === '/sitemap.xml' && !body.includes('<urlset')) {
    failures.push('/sitemap.xml: missing urlset');
  }

  if (path === '/llms.txt' && !body.includes('# ViLu')) {
    failures.push('/llms.txt: missing ViLu heading');
  }

  console.log(`OK ${path} ${response.status}`);
}

for (const check of checks) {
  try {
    await checkRoute(check);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${check.path}: ${message}`);
  }
}

if (failures.length > 0) {
  console.error('\nSmoke test failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`\nSmoke test passed for ${baseUrl}`);

