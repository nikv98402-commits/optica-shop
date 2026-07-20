import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const decisionPath = resolve(
  root,
  'docs/periorbital/eye-map-local-v1-release-decision.json',
);
const adrPath = resolve(
  root,
  'docs/periorbital/eye-map-local-v1-release-adr.md',
);
const [
  appSource,
  envExample,
  packageJsonSource,
  decisionSource,
  adrSource,
] = await Promise.all([
  readFile(resolve(root, 'src/App.tsx'), 'utf8'),
  readFile(resolve(root, '.env.example'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(decisionPath, 'utf8'),
  readFile(adrPath),
]);

const packageJson = JSON.parse(packageJsonSource);
const decision = JSON.parse(decisionSource);
const dependencyNames = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});
const violations = [];
const routeExposed =
  /['"]eye-map['"]\s*:/.test(appSource) || /\/eye-map/.test(appSource);
const expectedRoles = new Set([
  'Product',
  'Engineering',
  'Privacy/Legal',
  'Medical Copy',
]);
const actualAdrSha = createHash('sha256').update(adrSource).digest('hex');
const validDecision =
  decision &&
  decision.schemaVersion === 1 &&
  (decision.decision === 'NO_GO' ||
    decision.decision === 'GO_LOCAL_V1') &&
  !Number.isNaN(Date.parse(decision.decidedAt)) &&
  decision.adrPath ===
    'docs/periorbital/eye-map-local-v1-release-adr.md' &&
  /^[a-f0-9]{64}$/.test(decision.adrSha256) &&
  Array.isArray(decision.approvals) &&
  decision.approvals.length === expectedRoles.size &&
  decision.approvals.every(
    (approval) =>
      expectedRoles.has(approval.role) &&
      ['pending', 'approve', 'reject'].includes(approval.status) &&
      (approval.reviewer === null ||
        typeof approval.reviewer === 'string') &&
      (approval.reviewedAt === null ||
        !Number.isNaN(Date.parse(approval.reviewedAt))),
  ) &&
  new Set(decision.approvals.map((approval) => approval.role)).size ===
    expectedRoles.size;
const releaseApproved =
  validDecision &&
  decision.decision === 'GO_LOCAL_V1' &&
  decision.adrSha256 === actualAdrSha &&
  decision.approvals.every(
    (approval) =>
      approval.status === 'approve' &&
      typeof approval.reviewer === 'string' &&
      approval.reviewer.trim().length > 0 &&
      typeof approval.reviewedAt === 'string',
  );

if (!validDecision) {
  violations.push('release decision manifest is structurally invalid');
}

if (decision.adrSha256 !== actualAdrSha) {
  violations.push('release decision ADR SHA-256 does not match the current ADR');
}

if (routeExposed && !releaseApproved) {
  violations.push(
    'src/App.tsx exposes an Eye Map route without a signed GO_LOCAL_V1 decision',
  );
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

console.log(
  releaseApproved
    ? 'Eye Map boundary: signed GO_LOCAL_V1 is valid; production flag remains off.'
    : 'Eye Map boundary: valid NO_GO decision, no route, production flag off.',
);
