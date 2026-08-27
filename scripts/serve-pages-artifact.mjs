import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.env.PORT ?? 4174);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequest(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = normalize(decodedPath).replace(/^([/\\])+/, '');
  const requestedPath = join(root, relativePath);

  if (!requestedPath.startsWith(root)) return null;
  if (decodedPath === '/') return join(root, 'index.html');

  if (await exists(requestedPath)) {
    const requestedStat = await stat(requestedPath);
    if (requestedStat.isFile()) return requestedPath;
    const directoryIndex = join(requestedPath, 'index.html');
    if (await exists(directoryIndex)) return directoryIndex;
  }

  const cleanUrlEntry = `${requestedPath}.html`;
  return (await exists(cleanUrlEntry)) ? cleanUrlEntry : join(root, '404.html');
}

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname;
  const filePath = await resolveRequest(pathname);

  if (!filePath || !(await exists(filePath))) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Pages artifact server listening on http://127.0.0.1:${port}`);
});
