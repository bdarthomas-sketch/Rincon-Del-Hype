import { Hono } from 'hono';
import type { Env, AdminUser } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import { CreateSizeSchema, UpdateSizeSchema } from "../lib/validate";
import { logActivity } from "../lib/activity";
import { purgeCache } from "../middleware/cache";

export async function listSizes(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("sizes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return { data };
}

export async function createSize(env: Env, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = CreateSizeSchema.parse(body);
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("sizes")
    .insert(parsed)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      throw validationError("Size label already exists");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "size",
      entityId: data.id,
      entityName: data.label,
    });
  }

  return { data };
}

export async function updateSize(env: Env, id: string, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = UpdateSizeSchema.parse(body);
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("sizes")
    .update(parsed)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505")
      throw validationError("Size label already exists");
    throw error;
  }

  if (!data) throw notFound("Size");

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "size",
      entityId: id,
      entityName: data.label,
    });
  }

  return { data };
}

export async function deleteSize(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: size } = await supabase
    .from("sizes")
    .select("label")
    .eq("id", id)
    .single();

  if (!size) throw notFound("Size");

  const { error } = await supabase.from("sizes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503")
      throw validationError("Cannot delete size assigned to products");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "size",
      entityId: id,
      entityName: size.label,
    });
  }

  return { data: { message: "Size deleted" } };
}

const sizesRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

sizesRouter.get('/', async (c) => {
  const result = await listSizes(c.env);
  return c.json(result);
});

sizesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createSize(c.env, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/sizes']);
  return c.json(result, 201);
});

sizesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateSize(c.env, id, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/sizes']);
  return c.json(result);
});

sizesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteSize(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/sizes']);
  return c.json(result);
});

export default sizesRouter;
