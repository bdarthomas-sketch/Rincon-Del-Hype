import { Hono } from 'hono';
import type { Env, AdminUser, DashboardStats, ActivityLogRow } from "../types";
import { getSupabase } from "../lib/supabase";
import { verifySuperAdmin } from "../lib/auth";

const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dayLabel(d: Date): string {
  return DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]!;
}

function formatDateShort(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function buildBuckets(range: "week" | "month" | "all"): { buckets: string[]; labels: string[]; sinceDate: string } {
  const now = new Date();
  if (range === "week") {
    const since = new Date(now);
    since.setDate(now.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const buckets: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.push(d.toISOString().slice(0, 10));
      labels.push(dayLabel(d));
    }
    return { buckets, labels, sinceDate: since.toISOString() };
  }
  if (range === "month") {
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const buckets: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i + 1);
      buckets.push(d.toISOString().slice(0, 10));
      labels.push(formatDateShort(d));
    }
    return { buckets, labels, sinceDate: since.toISOString() };
  }
  // all — last 12 months
  const since = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const buckets: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push(key);
    labels.push(`${MONTHS_ES[d.getMonth()]}'${String(d.getFullYear()).slice(2)}`);
  }
  return { buckets, labels, sinceDate: since.toISOString() };
}

export async function getDashboardStats(env: Env, range: "week" | "month" | "all" = "week") {
  const supabase = getSupabase(env);

  const { buckets, labels, sinceDate } = buildBuckets(range);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Previous period (same length, before current period)
  const prevSinceDate = (() => {
    const d = new Date(sinceDate);
    if (range === "week") d.setDate(d.getDate() - 7);
    else if (range === "month") d.setDate(d.getDate() - 30);
    else d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  })();

  const [
    totalCount,
    activeCount,
    featuredCount,
    categoryCount,
    sizeCount,
    brandCount,
    categoriesWithProducts,
    allProducts,
    allStock,
    activity,
    pageViews,
    activeSessions,
    productsViewed,
    whatsappClicks,
    searches,
    changeHistory,
    dailyEvents,
    prevSessions,
    prevWhatsappClicks,
    prevSearches,
    prevTotal,
    prevActive,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_featured", true).is("deleted_at", null),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("sizes").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase.from("products").select("id, description, created_at, is_active, images:product_images(id)").is("deleted_at", null),
    supabase.from("product_sizes").select("product_id, stock"),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", sinceDate),
    supabase.from("analytics_events").select("session_id").eq("event_type", "page_view").gte("created_at", twentyFourHoursAgo),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "product_view").gte("created_at", sinceDate),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "whatsapp_click").gte("created_at", sinceDate),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "search").gte("created_at", sinceDate),
    supabase.from("activity_log").select("action"),
    supabase.from("analytics_events")
      .select("created_at, event_type, session_id")
      .gte("created_at", sinceDate)
      .in("event_type", ["page_view", "whatsapp_click", "search"]),
    supabase.from("analytics_events")
      .select("session_id")
      .eq("event_type", "page_view")
      .gte("created_at", prevSinceDate)
      .lt("created_at", sinceDate),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "whatsapp_click").gte("created_at", prevSinceDate).lt("created_at", sinceDate),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "search").gte("created_at", prevSinceDate).lt("created_at", sinceDate),
    supabase.from("products")
      .select("id", { count: "exact", head: true })
      .lt("created_at", sinceDate)
      .or(`deleted_at.is.null,deleted_at.gte.${sinceDate}`),
    supabase.from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lt("created_at", sinceDate)
      .or(`deleted_at.is.null,deleted_at.gte.${sinceDate}`),
  ]);

  // Compute out_of_stock: products where ALL sizes have stock = 0
  const stockByProduct: Record<string, number> = {};
  for (const row of allStock.data || []) {
    const sr = row as { product_id: string; stock: number };
    stockByProduct[sr.product_id] = (stockByProduct[sr.product_id] || 0) + Number(sr.stock);
  }

  let outOfStock = 0;
  let incomplete = 0;
  for (const row of allProducts.data || []) {
    const p = row as { id: string; is_active: boolean; created_at: string; images: { id: string }[] | null };
    if (!p.is_active) continue;
    if (!stockByProduct[p.id] || (stockByProduct[p.id] ?? 0) <= 0) outOfStock++;
    if (!p.images?.length) incomplete++;
  }

  const prevOutOfStock = (allProducts.data || []).filter(p => {
    const prod = p as { id: string; is_active: boolean; created_at: string; images: { id: string }[] | null };
    if (!prod.is_active || new Date(prod.created_at) >= new Date(sinceDate)) return false;
    return !stockByProduct[prod.id] || (stockByProduct[prod.id] ?? 0) <= 0;
  }).length;

  const prevIncomplete = (allProducts.data || []).filter(p => {
    const prod = p as { id: string; is_active: boolean; created_at: string; images: { id: string }[] | null };
    if (!prod.is_active || new Date(prod.created_at) >= new Date(sinceDate)) return false;
    return !prod.images?.length;
  }).length;

  const activeUsersSet = new Set((activeSessions.data || []).map((r: { session_id: string }) => r.session_id).filter(Boolean));

  const actionCounts: Record<string, number> = {};
  for (const row of (changeHistory.data || []) as { action: string }[]) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
  }

  const catIds = (categoriesWithProducts.data || []).map((c) => c.id);
  const { data: productCats } = await supabase
    .from("products")
    .select("category_id")
    .in("category_id", catIds)
    .is("deleted_at", null) as unknown as { data: { category_id: string }[] | null; error: unknown };

  const catCountMap: Record<string, number> = {};
  for (const p of productCats || []) {
    catCountMap[p.category_id] = (catCountMap[p.category_id] || 0) + 1;
  }

  const productsByCategory = (categoriesWithProducts.data || []).map((c) => ({
    name: c.name,
    slug: c.slug,
    count: catCountMap[c.id] || 0,
  }));

  // Bucket breakdown — visits count distinct sessions per bucket
  const bucketVisitSessions: Record<string, Set<string>> = {};
  const bucketWhatsapp: Record<string, number> = {};
  const bucketSearches: Record<string, number> = {};
  for (const b of buckets) {
    bucketVisitSessions[b] = new Set();
    bucketWhatsapp[b] = 0;
    bucketSearches[b] = 0;
  }
  const allUniqueSessions = new Set<string>();
  for (const evt of (dailyEvents.data || []) as { created_at: string; event_type: string; session_id: string | null }[]) {
    let key: string;
    if (range === "all") {
      key = evt.created_at.slice(0, 7);
    } else {
      key = evt.created_at.slice(0, 10);
    }
    if (bucketVisitSessions[key]) {
      if (evt.event_type === "page_view") {
        if (evt.session_id) {
          bucketVisitSessions[key].add(evt.session_id);
          allUniqueSessions.add(evt.session_id);
        }
      } else if (evt.event_type === "whatsapp_click") bucketWhatsapp[key] = (bucketWhatsapp[key] ?? 0) + 1;
      else if (evt.event_type === "search") bucketSearches[key] = (bucketSearches[key] ?? 0) + 1;
    }
  }
  const visits = buckets.map((b) => bucketVisitSessions[b]?.size ?? 0);
  const whatsapp = buckets.map((b) => bucketWhatsapp[b] ?? 0);
  const searchesDaily = buckets.map((b) => bucketSearches[b] ?? 0);

  const prevUniqueVisits = new Set((prevSessions.data || []).map((r: { session_id: string }) => r.session_id).filter(Boolean)).size;

  const stats: DashboardStats = {
    product_stats: {
      total: totalCount.count || 0,
      active: activeCount.count || 0,
      out_of_stock: outOfStock,
      featured: featuredCount.count || 0,
      incomplete,
    },
    page_activity_daily: { visits, whatsapp, searches: searchesDaily, labels },
    page_activity: {
      total_visits: pageViews.count || 0,
      unique_visits: allUniqueSessions.size,
      active_users: activeUsersSet.size,
      products_viewed: productsViewed.count || 0,
      whatsapp_clicks: whatsappClicks.count || 0,
      searches: searches.count || 0,
    },
    change_history: {
      created: actionCounts["created"] || 0,
      edited: (actionCounts["updated"] || 0) + (actionCounts["duplicated"] || 0),
      stock_changes: actionCounts["stock_changed"] || 0,
      price_changes: actionCounts["price_changed"] || 0,
      deleted: actionCounts["deleted"] || 0,
      toggles: (actionCounts["activated"] || 0) + (actionCounts["deactivated"] || 0) + (actionCounts["featured"] || 0) + (actionCounts["unfeatured"] || 0),
      sold: actionCounts["sold"] || 0,
      stock_updated: actionCounts["stock_updated"] || 0,
    },
    page_activity_previous: {
      unique_visits: prevUniqueVisits,
      whatsapp_clicks: prevWhatsappClicks.count || 0,
      searches: prevSearches.count || 0,
    },
    product_stats_previous: {
      total: prevTotal.count || 0,
      active: prevActive.count || 0,
      out_of_stock: prevOutOfStock,
      incomplete: prevIncomplete,
    },
    total_categories: categoryCount.count || 0,
    total_sizes: sizeCount.count || 0,
    total_brands: brandCount.count || 0,
    products_by_category: productsByCategory,
    recent_activity: (activity.data || []) as ActivityLogRow[],
  };

  return { data: stats };
}

export async function getActivityLog(
  env: Env,
  opts?: {
    limit?: number;
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
  }
) {
  const supabase = getSupabase(env);
  const { limit, entity, action, from, to, page, per_page } = opts || {};

  let query = supabase.from("activity_log").select("*", { count: "exact" });

  if (entity) query = query.eq("entity", entity);
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  query = query.order("created_at", { ascending: false });

  if (page && per_page) {
    const start = (page - 1) * per_page;
    query = query.range(start, start + per_page - 1);
  } else {
    query = query.limit(Math.min(limit || 20, 100));
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return { data, count };
}

export async function clearActivity(env: Env, request: Request) {
  await verifySuperAdmin(env, request);

  const supabase = getSupabase(env);
  const { error } = await supabase.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;

  return { data: { message: "Activity log cleared successfully" } };
}

const statsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

statsRouter.get('/dashboard', async (c) => {
  const range = (c.req.query('range') as 'week' | 'month' | 'all') || 'week';
  const result = await getDashboardStats(c.env, range);
  return c.json(result);
});

statsRouter.get('/activity', async (c) => {
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : undefined;
  const per_page = c.req.query('per_page') ? parseInt(c.req.query('per_page')!) : undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
  const entity = c.req.query('entity') || undefined;
  const action = c.req.query('action') || undefined;
  const from = c.req.query('from') || undefined;
  const to = c.req.query('to') || undefined;
  const result = await getActivityLog(c.env, { limit, entity, action, from, to, page, per_page });
  return c.json(result);
});

statsRouter.post('/activity/clear', async (c) => {
  const result = await clearActivity(c.env, c.req.raw);
  return c.json(result);
});

export default statsRouter;
