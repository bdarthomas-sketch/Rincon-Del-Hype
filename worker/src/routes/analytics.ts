import { Hono } from 'hono';
import type { Env, AdminUser } from "../types";
import { getSupabase } from "../lib/supabase";
import { verifySuperAdmin } from "../lib/auth";

export async function getStockAlerts(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("product_sizes")
    .select(`
      product_id,
      stock,
      product:products!inner(id, name, slug),
      size:sizes(label)
    `)
    .eq("stock", 0)
    .order("product_id");

  if (error) throw error;

  const grouped: Record<string, { product_id: string; name: string; slug: string; sizes: string[] }> = {};

  for (const row of data || []) {
    const pid = row.product_id;
    if (!grouped[pid]) {
      grouped[pid] = {
        product_id: pid,
        name: (row.product as any)?.name || "Unknown",
        slug: (row.product as any)?.slug || "",
        sizes: [],
      };
    }
    grouped[pid].sizes.push((row.size as any)?.label || "Unknown");
  }

  return { data: Object.values(grouped) };
}

export async function getByCategory(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("sort_order");

  if (error) throw error;

  const categoryIds = data.map((c: any) => c.id);

  const { data: products } = await supabase
    .from("products")
    .select("category_id, id")
    .in("category_id", categoryIds)
    .is("deleted_at", null);

  const countMap: Record<string, number> = {};
  for (const p of products || []) {
    countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
  }

  const result = (data || []).map((c: any) => ({
    name: c.name,
    slug: c.slug,
    count: countMap[c.id] || 0,
  }));

  return { data: result };
}

export async function getRecentlyUpdated(env: Env, limit = 10) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, updated_at, is_active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(Math.min(limit, 50));

  if (error) throw error;

  return { data };
}

export async function getFeaturedProducts(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, brand, price, old_price, is_new")
    .eq("is_featured", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) throw error;

  return { data };
}

export async function resetAnalytics(env: Env, request: Request) {
  await verifySuperAdmin(env, request);

  const supabase = getSupabase(env);
  const { error } = await supabase.from("analytics_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;

  return { data: { message: "Analytics data reset successfully" } };
}

const analyticsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

analyticsRouter.get('/stock-alerts', async (c) => {
  const result = await getStockAlerts(c.env);
  return c.json(result);
});

analyticsRouter.get('/by-category', async (c) => {
  const result = await getByCategory(c.env);
  return c.json(result);
});

analyticsRouter.get('/recently-updated', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const result = await getRecentlyUpdated(c.env, limit);
  return c.json(result);
});

analyticsRouter.post('/reset', async (c) => {
  const result = await resetAnalytics(c.env, c.req.raw);
  return c.json(result);
});

export default analyticsRouter;
