import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const forbidden = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'KNOWLEDGE_CHAT_API_KEY',
  'KNOWLEDGE_CHAT_BASE_URL',
  'KNOWLEDGE_CHAT_MODEL',
  'KNOWLEDGE_EMBEDDING_API_KEY',
  'KNOWLEDGE_EMBEDDING_BASE_URL',
  'KNOWLEDGE_EMBEDDING_MODEL',
  'RATE_LIMIT_SALT',
];

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)]))).flat();
}

for (const directory of ['src', 'dist']) {
  const directoryPath = resolve(root, directory);
  let candidates = [];
  try { candidates = await files(directoryPath); } catch { continue; }
  for (const file of candidates) {
    if (!/\.(js|css|html|ts|tsx)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    const secret = forbidden.find((name) => content.includes(name));
    if (secret) throw new Error(`${secret} leaked into browser-owned file ${file}`);
  }
}
console.log('Knowledge Assistant browser boundary: OK');
