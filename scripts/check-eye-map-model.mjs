import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [manifestSource, engineSource] = await Promise.all([
  readFile(resolve(root, 'src/lib/eyeMap/modelManifest.ts'), 'utf8'),
  readFile(resolve(root, 'src/lib/faceFitEngine.ts'), 'utf8'),
]);

const expectedUrl =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const expectedSha =
  '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
const violations = [];

if (!manifestSource.includes(expectedUrl)) {
  violations.push('model manifest must pin the reviewed Face Landmarker v1 URL');
}
if (!manifestSource.includes(expectedSha)) {
  violations.push('model manifest must contain the reviewed artifact SHA-256');
}
if (/\/latest\//i.test(manifestSource) || /\/latest\//i.test(engineSource)) {
  violations.push('Eye Map must not use a mutable latest model URL');
}
if (!/EYE_MAP_MODEL_MANIFEST\.artifactUrl/.test(engineSource)) {
  violations.push('faceFitEngine must read its model URL from the manifest');
}

if (violations.length > 0) {
  console.error('Eye Map model smoke check failed:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Eye Map model manifest is pinned to the reviewed artifact.');
