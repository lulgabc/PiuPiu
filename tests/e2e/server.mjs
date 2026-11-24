import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
});

export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function normalizeOverrideResult(override, cleanPath) {
  if (override === undefined) return null;
  if (override === null || override.fail === true || override.error) {
    return {
      fail: true,
      errorReason: (override && override.error) || 'InternetDisconnected',
      delayMs: (override && Number(override.delayMs)) || 0,
    };
  }
  const defaultMime = getMimeType(cleanPath === '/' ? '/index.html' : cleanPath);
  if (typeof override === 'string' || Buffer.isBuffer(override)) {
    return {
      status: 200,
      headers: {
        'Content-Type': defaultMime,
        'Cache-Control': 'no-store',
      },
      body: Buffer.isBuffer(override) ? override : Buffer.from(override, 'utf8'),
      delayMs: 0,
    };
  }
  const body = Buffer.isBuffer(override.body)
    ? override.body
    : Buffer.from(String(override.body ?? ''), 'utf8');
  return {
    status: Number(override.status) || 200,
    headers: {
      'Content-Type': defaultMime,
      'Cache-Control': 'no-store',
      ...(override.headers || {}),
    },
    body,
    delayMs: Number(override.delayMs) || 0,
  };
}

function lookupOverride(overrides, cleanPath, rawUrl) {
  if (!overrides) return undefined;
  if (typeof overrides === 'function') {
    return overrides(cleanPath, rawUrl);
  }
  if (overrides instanceof Map) {
    if (overrides.has(rawUrl)) return overrides.get(rawUrl);
    if (overrides.has(cleanPath)) return overrides.get(cleanPath);
    for (const [pattern, val] of overrides.entries()) {
      if (pattern instanceof RegExp && pattern.test(cleanPath)) {
        return typeof val === 'function' ? val(cleanPath, rawUrl) : val;
      }
    }
    return undefined;
  }
  if (typeof overrides === 'object') {
    if (Object.hasOwn(overrides, rawUrl)) return overrides[rawUrl];
    if (Object.hasOwn(overrides, cleanPath)) return overrides[cleanPath];
  }
  return undefined;
}

export function resolveStaticAsset(urlPath, rootDir, overrides) {
  let cleanPath;
  try {
    const rawStr = String(urlPath || '/');
    const withoutOrigin = rawStr.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*/, '');
    const rawPathOnly = withoutOrigin.split(/[?#]/)[0] || '/';
    cleanPath = decodeURIComponent(rawPathOnly);
  } catch {
    return {
      status: 400,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Bad Request', 'utf8'),
      delayMs: 0,
    };
  }

  if (cleanPath.includes('\0') || cleanPath.includes('\\')) {
    return {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Forbidden', 'utf8'),
      delayMs: 0,
    };
  }

  const rawSegments = cleanPath.split('/').filter(Boolean);
  if (rawSegments.some((seg) => seg === '..')) {
    return {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Forbidden', 'utf8'),
      delayMs: 0,
    };
  }

  const normalizedUrlPath = cleanPath === '/' ? '/index.html' : cleanPath;

  const overrideHit = lookupOverride(overrides, cleanPath, urlPath);
  if (overrideHit !== undefined) {
    const normalized = normalizeOverrideResult(overrideHit, normalizedUrlPath);
    if (normalized) return normalized;
  }

  const root = path.resolve(rootDir);
  const segments = normalizedUrlPath.split('/').filter(Boolean);
  if (segments.some((seg) => seg === '..')) {
    return {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Forbidden', 'utf8'),
      delayMs: 0,
    };
  }

  const relPath = normalizedUrlPath.replace(/^\/+/, '');
  const resolved = path.resolve(root, relPath);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Forbidden', 'utf8'),
      delayMs: 0,
    };
  }

  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Not Found', 'utf8'),
      delayMs: 0,
    };
  }

  let targetFile = resolved;
  if (stat.isDirectory()) {
    const indexCandidate = path.join(resolved, 'index.html');
    try {
      const idxStat = fs.statSync(indexCandidate);
      if (!idxStat.isFile()) {
        return {
          status: 404,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          },
          body: Buffer.from('Not Found', 'utf8'),
          delayMs: 0,
        };
      }
      targetFile = indexCandidate;
    } catch {
      return {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
        body: Buffer.from('Not Found', 'utf8'),
        delayMs: 0,
      };
    }
  } else if (!stat.isFile()) {
    return {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: Buffer.from('Not Found', 'utf8'),
      delayMs: 0,
    };
  }

  const body = fs.readFileSync(targetFile);
  return {
    status: 200,
    headers: {
      'Content-Type': getMimeType(targetFile),
      'Cache-Control': 'no-store',
    },
    body,
    delayMs: 0,
  };
}

export function startStaticServer({
  rootDir = process.cwd(),
  host = '127.0.0.1',
  port = 0,
  overrides = null,
} = {}) {
  const absRoot = path.resolve(rootDir);
  let activeOverrides = overrides;

  const server = http.createServer((req, res) => {
    const urlPath = req.url || '/';
    const asset = resolveStaticAsset(urlPath, absRoot, activeOverrides);

    const respond = () => {
      if (res.destroyed || req.destroyed) return;
      if (asset.fail) {
        req.socket.destroy();
        return;
      }
      res.writeHead(asset.status, asset.headers);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(asset.body);
      }
    };

    if (asset.delayMs > 0) {
      setTimeout(respond, asset.delayMs);
    } else {
      respond();
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve({
        server,
        host,
        port: actualPort,
        baseUrl: `http://${host}:${actualPort}`,
        setOverrides(nextOverrides) {
          activeOverrides = nextOverrides;
        },
        close() {
          return new Promise((done) => {
            if (typeof server.closeAllConnections === 'function') {
              server.closeAllConnections();
            }
            server.close(() => done());
          });
        },
      });
    });
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT) || 4173;
  const host = process.env.HOST || '127.0.0.1';
  const rootDir = path.resolve(process.argv[2] || process.cwd());
  const srv = await startStaticServer({ rootDir, host, port });
  console.log(`PiuPiu static server listening at ${srv.baseUrl} (root: ${rootDir})`);

  const shutdown = async () => {
    await srv.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
