import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [appSource, envExample, packageJsonSource] = await Promise.all([
  readFile(resolve(root, 'src/App.tsx'), 'utf8'),
  readFile(resolve(root, '.env.example'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
]);

const packageJson = JSON.parse(packageJsonSource);
const dependencyNames = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});
const violations = [];

if (/['"]eye-map['"]\s*:/.test(appSource) || /\/eye-map/.test(appSource)) {
  violations.push('src/App.tsx exposes an Eye Map route before the signed Go ADR');
}

if (!/^VITE_FEATURE_EYE_MAP=false$/m.test(envExample)) {
  violations.push('.env.example must keep VITE_FEATURE_EYE_MAP=false');
}

const forbiddenDependencies = dependencyNames.filter((name) =>
  /periorbital|pytorch|torchvision/i.test(name),
);
if (forbiddenDependencies.length > 0) {
  violations.push(
    `public app must not depend on private ML packages: ${forbiddenDependencies.join(', ')}`,
  );
}

if (violations.length > 0) {
  console.error('Eye Map production boundary check failed:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Eye Map production boundary is intact: no route, flag off, no ML dependency.');
