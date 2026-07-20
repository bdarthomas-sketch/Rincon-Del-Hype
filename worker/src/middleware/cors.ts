import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

export const cors = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const origin = c.req.header('origin') || '';
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || '').split(',').map((s: string) => s.trim());

  let corsOrigin = allowedOrigins.includes(origin) ? origin : '';

  if (!corsOrigin) {
    try {
      const originHost = new URL(origin).hostname;
      const matched = allowedOrigins.find((a: string) => {
        try {
          return new URL(a).hostname === originHost || originHost.endsWith('.' + new URL(a).hostname);
        } catch {
          return false;
        }
      });
      corsOrigin = matched ? origin : isPrivate(originHost) ? origin : '';
    } catch {
      corsOrigin = '';
    }
  }

  const setHeaders = () => {
    c.res.headers.set('Access-Control-Allow-Origin', corsOrigin);
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.res.headers.set('Access-Control-Max-Age', '86400');
    c.res.headers.set('Vary', 'Origin');
  };

  if (c.req.method === 'OPTIONS') {
    c.res = new Response(null, { status: 204 });
    setHeaders();
    return;
  }

  setHeaders();
  await next();
});

function isPrivate(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return false;
  const [o1, o2, o3, o4] = nums;
  if (o1 === undefined || o2 === undefined || o3 === undefined || o4 === undefined) return false;
  return o1 === 10 || o1 === 127
    || (o1 === 172 && o2 >= 16 && o2 <= 31)
    || (o1 === 192 && o2 === 168);
}
