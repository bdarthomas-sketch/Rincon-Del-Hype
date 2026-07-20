// @ts-nocheck — temporary legacy router, replaced as routes migrate to Hono
import type { Env } from "./types";
import { AppError } from "./lib/errors";
import { ZodError } from "zod";
import { shouldCache, buildCacheKey, getCachedResponse, setCachedJson, invalidateRelated } from "./lib/cache";

import * as products from "./routes/products";
import * as categories from "./routes/categories";
import * as sizes from "./routes/sizes";
import * as images from "./routes/images";
import { getFeaturedProducts } from "./routes/analytics";
import { tryVerifyAdmin, getAdminInfo } from "./lib/auth";

export async function legacyFetch(request: Request, env: Env): Promise<Response> {
  try {
    return await handleRequest(request, env);
  } catch (error) {
    const corsHeaders = getCorsHeaders(env, request);
    return handleError(error, corsHeaders);
  }
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

  const corsHeaders = getCorsHeaders(env, request);
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (shouldCache(request, path.startsWith("/api/admin/"))) {
    const cacheKey = buildCacheKey(request);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      for (const [key, value] of Object.entries(corsHeaders)) {
        cached.headers.set(key, value);
      }
      return cached;
    }
  }

  let adminUser: { userId: string; role: string } | null = null;

  if (method !== "GET" || path.startsWith("/api/admin/")) {
    adminUser = await tryVerifyAdmin(env, request);
  } else if (method === "GET") {
    adminUser = await tryVerifyAdmin(env, request);
  }

  try {
    const json = await parseBody(request);
    const response = await routeRequest(method, path, url, env, request, json, adminUser, clientIp);
    return jsonResponse(response, corsHeaders, request);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error, corsHeaders);
    }
    throw error;
  }
}

async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function routeRequest(
  method: string,
  path: string,
  url: URL,
  env: Env,
  request: Request,
  body: unknown,
  adminUser: { userId: string; role: string } | null,
  _clientIp: string
): Promise<unknown> {
  let result: unknown;

  const adminInfo = adminUser ? await fetchFullAdminInfo(env, request) : null;

  // Products public
  if (path === "/api/products" && method === "GET") {
    return products.listProducts(env, url, adminUser);
  }

  // Products admin
  if (path === "/api/products" && method === "POST") {
    result = await products.createProduct(env, body, adminInfo);
    invalidateRelated("/api/products");
    return result;
  }

  if (path === "/api/products/reorder" && method === "PUT") {
    result = await products.reorderProducts(env, body, adminInfo);
    invalidateRelated("/api/products");
    return result;
  }

  if (path === "/api/products/featured" && method === "GET") {
    return getFeaturedProducts(env);
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const idOrSlug = productMatch[1];
    if (method === "GET") return products.getProduct(env, idOrSlug);
    if (method === "PUT") {
      result = await products.updateProduct(env, idOrSlug, body, adminInfo);
      invalidateRelated("/api/products");
      return result;
    }
    if (method === "DELETE") {
      result = await products.deleteProduct(env, idOrSlug, adminInfo);
      invalidateRelated("/api/products");
      return result;
    }
  }

  const dupMatch = path.match(/^\/api\/products\/([^/]+)\/duplicate$/);
  if (dupMatch && method === "POST") {
    result = await products.duplicateProduct(env, dupMatch[1], adminInfo);
    invalidateRelated("/api/products");
    return result;
  }

  const compositionMatch = path.match(/^\/api\/products\/([^/]+)\/images\/([^/]+)\/composition$/);
  if (compositionMatch && method === "PATCH") {
    result = await images.updateImageComposition(env, compositionMatch[2], body, adminInfo);
    invalidateRelated("/api/products");
    return result;
  }

  // Categories
  if (path === "/api/categories" && method === "GET") {
    return categories.listCategories(env);
  }
  if (path === "/api/categories" && method === "POST") {
    result = await categories.createCategory(env, body, adminInfo);
    invalidateRelated("/api/categories");
    return result;
  }

  const catMatch = path.match(/^\/api\/categories\/([^/]+)$/);
  if (catMatch) {
    const id = catMatch[1];
    if (method === "GET") return categories.getCategory(env, id);
    if (method === "PUT") {
      result = await categories.updateCategory(env, id, body, adminInfo);
      invalidateRelated("/api/categories");
      invalidateRelated("/api/products");
      return result;
    }
    if (method === "DELETE") {
      result = await categories.deleteCategory(env, id, adminInfo);
      invalidateRelated("/api/categories");
      invalidateRelated("/api/products");
      return result;
    }
  }

  // Sizes
  if (path === "/api/sizes" && method === "GET") {
    return sizes.listSizes(env);
  }
  if (path === "/api/sizes" && method === "POST") {
    result = await sizes.createSize(env, body, adminInfo);
    invalidateRelated("/api/sizes");
    return result;
  }

  const sizeMatch = path.match(/^\/api\/sizes\/([^/]+)$/);
  if (sizeMatch) {
    const id = sizeMatch[1];
    if (method === "PUT") {
      result = await sizes.updateSize(env, id, body, adminInfo);
      invalidateRelated("/api/sizes");
      return result;
    }
    if (method === "DELETE") {
      result = await sizes.deleteSize(env, id, adminInfo);
      invalidateRelated("/api/sizes");
      return result;
    }
  }

  return new AppError(404, "NOT_FOUND", `Route ${method} ${path} not found`).toResponse();
}

async function fetchFullAdminInfo(
  env: Env,
  request: Request
): Promise<{ id: string; userId: string; role: string } | null> {
  return getAdminInfo(env, request);
}

function getCorsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());

  let corsOrigin = allowedOrigins.includes(origin) ? origin : "";

  if (!corsOrigin) {
    try {
      const originHost = new URL(origin).hostname;
      const matched = allowedOrigins.find((a) => {
        try {
          const allowedHost = new URL(a).hostname;
          return originHost === allowedHost || originHost.endsWith("." + allowedHost);
        } catch {
          return false;
        }
      });
      corsOrigin = matched ? origin : (isPrivateHostname(originHost) ? origin : "");
    } catch {
      corsOrigin = "";
    }
  }

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return false;
  return nums[0] === 10
    || nums[0] === 127
    || (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31)
    || (nums[0] === 192 && nums[1] === 168);
}

function jsonResponse(data: unknown, corsHeaders: Record<string, string>, request?: Request): Response {
  const body = JSON.stringify(data);
  const isAdmin = request?.headers.has("Authorization") ?? false;
  const noCache = request && new URL(request.url).pathname === "/api/video-drops";
  const res = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      "Cache-Control": isAdmin
        ? "private, no-cache, no-store"
        : noCache
          ? "no-cache"
          : "public, max-age=10, s-maxage=0",
    },
  });

  if (request && shouldCache(request, request.url.includes("/api/admin/"))) {
    const cacheKey = buildCacheKey(request);
    res.headers.set("CF-Cache-Status", "MISS");
    setCachedJson(cacheKey, new URL(request.url).pathname, data, corsHeaders);
  }

  return res;
}

function handleError(error: unknown, corsHeaders?: Record<string, string>): Response {
  if (error instanceof AppError) {
    return error.toResponse(corsHeaders);
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";
  console.error("Unhandled error:", message, stack);

  return new Response(
    JSON.stringify({
      error: { code: "INTERNAL_ERROR", message: "Internal server error", detail: message },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json", ...(corsHeaders || {}) },
    }
  );
}

function handleZodError(error: ZodError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}
