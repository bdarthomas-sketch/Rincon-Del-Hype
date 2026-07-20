import { Hono } from 'hono';
import type { Env, AdminUser } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import { CreateCategorySchema, UpdateCategorySchema } from "../lib/validate";
import { logActivity } from "../lib/activity";
import { purgeCache } from "../middleware/cache";

export async function listCategories(env: Env) {
  const supabase = getSupabase(env);

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const categoryIds = categories.map((c: any) => c.id);

  const { data: counts } = await supabase
    .from("products")
    .select("category_id, id")
    .in("category_id", categoryIds)
    .is("deleted_at", null);

  const countMap: Record<string, number> = {};
  for (const row of counts || []) {
    countMap[row.category_id] = (countMap[row.category_id] || 0) + 1;
  }

  const data = categories.map((c: any) => ({
    ...c,
    product_count: countMap[c.id] || 0,
  }));

  return { data };
}

export async function getCategory(env: Env, id: string) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) throw notFound("Category");

  return { data };
}

export async function createCategory(env: Env, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = CreateCategorySchema.parse(body);
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("categories")
    .insert(parsed)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw validationError("Category slug or name already exists");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "category",
      entityId: data.id,
      entityName: data.name,
    });
  }

  return { data };
}

export async function updateCategory(env: Env, id: string, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = UpdateCategorySchema.parse(body);
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("categories")
    .update(parsed)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw validationError("Category slug or name already exists");
    throw error;
  }

  if (!data) throw notFound("Category");

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "category",
      entityId: id,
      entityName: data.name,
    });
  }

  return { data };
}

export async function deleteCategory(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: category } = await supabase
    .from("categories")
    .select("name")
    .eq("id", id)
    .single();

  if (!category) throw notFound("Category");

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);

  if (count && count > 0) {
    throw validationError(`Cannot delete category with ${count} active product(s)`);
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503")
      throw validationError("Cannot delete category with existing products");
    throw error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "category",
      entityId: id,
      entityName: category.name,
    });
  }

  return { data: { message: "Category deleted" } };
}

const categoriesRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

categoriesRouter.get('/', async (c) => {
  const result = await listCategories(c.env);
  return c.json(result);
});

categoriesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await getCategory(c.env, id);
  return c.json(result);
});

categoriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createCategory(c.env, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/categories']);
  return c.json(result, 201);
});

categoriesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateCategory(c.env, id, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/categories']);
  return c.json(result);
});

categoriesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteCategory(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/categories']);
  return c.json(result);
});

export default categoriesRouter;
