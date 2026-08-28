import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const entryPath = resolve(root, 'supabase/functions/knowledge-assistant/index.ts');
const configPath = resolve(root, 'supabase/functions/knowledge-assistant/deno.json');
const lockPath = resolve(root, 'supabase/functions/knowledge-assistant/deno.lock');
const entry = await readFile(entryPath, 'utf8');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const lock = JSON.parse(await readFile(lockPath, 'utf8'));

assert.equal(
  config.nodeModulesDir,
  'auto',
  'knowledge-assistant must allow Deno to resolve its pinned npm: dependency',
);

assert.match(
  entry,
  /from ['"]npm:\@supabase\/supabase-js\@2\.50\.0['"];/,
  'knowledge-assistant must use the pinned Deno npm: Supabase client import',
);

assert.equal(
  lock.specifiers?.['npm:@supabase/supabase-js@2.50.0'],
  '2.50.0',
  'knowledge-assistant lockfile must pin the same Supabase client version',
);

assert.equal(
  JSON.stringify(lock).includes('https://esm.sh'),
  false,
  'knowledge-assistant lockfile must not contain an esm.sh dependency chain',
);

for (const forbiddenDependency of [
  'esm.sh/@supabase/supabase-js',
  'esm.sh/ws',
  'node:url',
  'utf-8-validate',
  'bufferutil',
]) {
  assert.equal(
    entry.includes(forbiddenDependency),
    false,
    `knowledge-assistant entrypoint must not depend on ${forbiddenDependency}`,
  );
}

console.log('Knowledge Assistant Edge import contract: OK');
