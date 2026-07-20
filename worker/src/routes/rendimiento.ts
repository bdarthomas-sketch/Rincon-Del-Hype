import { Hono } from 'hono';
import type { Env, AdminUser, PerformanceItem } from "../types";
import { getSupabase } from "../lib/supabase";

export async function getPerformance(env: Env) {
  const supabase = getSupabase(env);

  const { data: events } = await supabase
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", "product_view")
    .not("product_id", "is", null);

  const viewCounts: Record<string, number> = {};
  for (const e of events || []) {
    if (e.product_id) {
      viewCounts[e.product_id] = (viewCounts[e.product_id] || 0) + 1;
    }
  }

  const sorted = Object.entries(viewCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (sorted.length === 0) {
    return { data: { most_viewed: [] } };
  }

  const productIds = sorted.map(([id]) => id);

  const [products, waEvents, sizeData, imageData] = await Promise.all([
    supabase
      .from("products")
      .select(`id, name, slug, price, old_price, description,
        category:categories!inner(name),
        images:product_images(url, is_primary)
      `)
      .in("id", productIds),
    supabase
      .from("analytics_events")
      .select("product_id")
      .eq("event_type", "whatsapp_click")
      .not("product_id", "is", null)
      .in("product_id", productIds),
    supabase
      .from("product_sizes")
      .select("product_id, stock")
      .in("product_id", productIds),
    supabase
      .from("product_images")
      .select("product_id")
      .in("product_id", productIds),
  ]);

  // WhatsApp click counts per product
  const waCounts: Record<string, number> = {};
  for (const e of (waEvents.data || []) as any[]) {
    if (e.product_id) {
      waCounts[e.product_id] = (waCounts[e.product_id] || 0) + 1;
    }
  }

  // Stock totals per product
  const stockTotals: Record<string, number> = {};
  for (const s of (sizeData.data || []) as any[]) {
    stockTotals[s.product_id] = (stockTotals[s.product_id] || 0) + Number(s.stock);
  }

  // Products with images
  const productsWithImages = new Set((imageData.data || []).map((r: any) => r.product_id));

  const descMap: Record<string, string | null> = {};
  for (const p of (products.data || []) as any[]) {
    descMap[p.id] = p.description;
  }

  const productMap: Record<string, any> = {};
  for (const raw of products.data || []) {
    const p = raw as any;
    const images: any[] = p.images || [];
    const primary = images.find((i: any) => i.is_primary)?.url || images[0]?.url || null;
    const cat: any = p.category;
    productMap[p.id] = {
      product_id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      old_price: p.old_price ? Number(p.old_price) : null,
      primary_image: primary,
      category_name: cat?.name || "",
    };
  }

  const mostViewed: PerformanceItem[] = sorted.map(([id, views]) => {
    const ts = stockTotals[id] || 0;
    return ({
      ...productMap[id],
      views,
      whatsapp_clicks: waCounts[id] || 0,
      out_of_stock: ts === 0,
      incomplete: !productsWithImages.has(id) || !descMap[id] || descMap[id] === "",
    });
  }).filter(Boolean);

  return { data: { most_viewed: mostViewed } };
}

const rendimientoRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

rendimientoRouter.get('/', async (c) => {
  const result = await getPerformance(c.env);
  return c.json(result);
});

export default rendimientoRouter;
