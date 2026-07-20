import { Hono } from 'hono';
import type { Env, AdminUser, BrandRow } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import { logActivity } from "../lib/activity";
import { purgeCache } from "../middleware/cache";

export async function listBrands(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      slug,
      product_count:products(count)
    `)
    .order("name");

  if (error) throw error;

  const brands = (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    product_count: b.product_count?.[0]?.count || 0,
  }));

  return { data: brands };
}

export async function createBrand(env: Env, body: unknown, adminInfo?: { id: string } | null) {
  const parsed = body as { name: string };
  if (!parsed.name?.trim()) throw validationError("Name is required");

  const name = parsed.name.trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw validationError("Brand already exists");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "brand",
      entityId: data.id,
      entityName: data.name,
    });
  }

  return { data };
}

export async function updateBrand(env: Env, id: string, body: unknown, adminInfo?: { id: string } | null) {
  const parsed = body as { name: string };
  if (!parsed.name?.trim()) throw validationError("Name is required");

  const name = parsed.name.trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const supabase = getSupabase(env);

  const { data: existing } = await supabase
    .from("brands")
    .select("name")
    .eq("id", id)
    .single();

  if (!existing) throw notFound("Brand");

  const { data, error } = await supabase
    .from("brands")
    .update({ name, slug })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw validationError("Brand name already exists");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "brand",
      entityId: id,
      entityName: data.name,
      details: { old_name: existing.name },
    });
  }

  return { data };
}

export async function deleteBrand(env: Env, id: string, adminInfo?: { id: string } | null) {
  const supabase = getSupabase(env);

  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", id)
    .single();

  if (!brand) throw notFound("Brand");

  // Check if brand has products
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);

  if (count && count > 0) {
    throw validationError(`Cannot delete brand "${brand.name}": ${count} product(s) still reference it. Reassign or merge first.`);
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", id);

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "brand",
      entityId: id,
      entityName: brand.name,
    });
  }

  return { data: { message: "Brand deleted" } };
}

export async function mergeBrands(env: Env, body: unknown, adminInfo?: { id: string } | null) {
  const parsed = body as { from_id: string; to_id: string };
  if (!parsed.from_id || !parsed.to_id) throw validationError("from_id and to_id are required");
  if (parsed.from_id === parsed.to_id) throw validationError("Cannot merge a brand into itself");

  const supabase = getSupabase(env);

  const [fromBrand, toBrand] = await Promise.all([
    supabase.from("brands").select("name").eq("id", parsed.from_id).single(),
    supabase.from("brands").select("name").eq("id", parsed.to_id).single(),
  ]);

  if (!fromBrand.data) throw notFound("Source brand");
  if (!toBrand.data) throw notFound("Target brand");

  // Update all products from from_id to to_id
  const { error: updateError } = await supabase
    .from("products")
    .update({ brand_id: parsed.to_id })
    .eq("brand_id", parsed.from_id);

  if (updateError) throw updateError;

  // Delete the source brand
  const { error: deleteError } = await supabase
    .from("brands")
    .delete()
    .eq("id", parsed.from_id);

  if (deleteError) throw deleteError;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "brand",
      entityId: parsed.to_id,
      entityName: toBrand.data.name,
      details: { merged_from: fromBrand.data.name },
    });
  }

  return { data: { message: `Merged "${fromBrand.data.name}" into "${toBrand.data.name}"` } };
}

const brandsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

brandsRouter.get('/', async (c) => {
  const result = await listBrands(c.env);
  return c.json(result);
});

brandsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createBrand(c.env, body, adminUser ? { id: adminUser.id } : null);
  await purgeCache(c, ['/api/brands']);
  return c.json(result, 201);
});

brandsRouter.post('/merge', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await mergeBrands(c.env, body, adminUser ? { id: adminUser.id } : null);
  await purgeCache(c, ['/api/brands']);
  return c.json(result);
});

brandsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateBrand(c.env, id, body, adminUser ? { id: adminUser.id } : null);
  await purgeCache(c, ['/api/brands']);
  return c.json(result);
});

brandsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteBrand(c.env, id, adminUser ? { id: adminUser.id } : null);
  await purgeCache(c, ['/api/brands']);
  return c.json(result);
});

export default brandsRouter;
