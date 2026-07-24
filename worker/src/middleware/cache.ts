import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

async function cacheGet(c: Context, _ttl: number): Promise<Response | null> {
  const cache = caches.default;
  const url = new URL(c.req.url);
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  return null;
}

async function cacheSet(c: Context, response: Response, ttl: number): Promise<Response> {
  const cache = caches.default;
  const url = new URL(c.req.url);
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, s-maxage=${ttl}, max-age=0`);
  headers.set('CF-Cache-Status', 'HIT');

  const cachedResponse = new Response(response.body, {
    status: response.status,
    headers,
  });

  c.executionCtx.waitUntil(
    cache.put(cacheKey, cachedResponse.clone())
  );

  return cachedResponse;
}

export const publicCache = createMiddleware(async (c, next) => {
  if (c.req.method !== 'GET') return next();

  const cached = await cacheGet(c, 5);
  if (cached) return cached;

  await next();

  if (c.res.status === 200) {
    const cloned = await cacheSet(c, c.res.clone(), 5);
    c.res = cloned;
  }
});

export async function purgeCache(c: Context, paths: string[]) {
  const cache = caches.default;
  const baseUrl = new URL(c.req.url);
  const purges = paths.map(path => {
    const url = new URL(path, baseUrl.origin);
    const key = new Request(url.toString(), { method: 'GET' });
    return cache.delete(key, { ignoreSearch: true } as any);

  });
  await Promise.allSettled(purges);
}
