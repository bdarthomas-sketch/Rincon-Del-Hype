interface CacheEntry {
  body: string;
  status: number;
  headers: Record<string, string>;
  expiry: number;
}

const store = new Map<string, CacheEntry>();

const TTL: Record<string, number> = {
  "/api/products": 10,
  "/api/categories": 300,
  "/api/sizes": 300,
};

export function shouldCache(request: Request, admin: boolean): boolean {
  if (request.method !== "GET") return false;
  if (admin) return false;
  if (request.headers.has("Authorization")) return false;
  return true;
}

export function buildCacheKey(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.sort();
  return url.toString();
}

export function getTTL(pathname: string): number {
  for (const [prefix, ttl] of Object.entries(TTL)) {
    if (pathname.startsWith(prefix)) return ttl;
  }
  return 60;
}

export function getCachedResponse(key: string): Response | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  const headers = new Headers(entry.headers);
  headers.set("CF-Cache-Status", "HIT");
  return new Response(entry.body, { status: entry.status, headers });
}

export function setCachedJson(key: string, pathname: string, data: unknown, corsHeaders: Record<string, string>): void {
  const body = JSON.stringify(data);
  const ttl = getTTL(pathname);
  store.set(key, {
    body,
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      "Cache-Control": `public, s-maxage=0, max-age=${ttl}`,
    },
    expiry: Date.now() + ttl * 1000,
  });
}

export function invalidateRelated(pathname: string): void {
  for (const key of store.keys()) {
    if (key.includes(pathname)) store.delete(key);
  }
}
