import { Hono } from 'hono';
import type { Env, AdminUser, StoreSettingRow } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import { UpdateSettingSchema, CreateAdminSchema } from "../lib/validate";
import { logActivity } from "../lib/activity";
import { purgeCache } from "../middleware/cache";

const PUBLIC_SETTING_KEYS = ["out_of_stock_label", "store_info"];

export async function getPublicSettings(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .in("key", PUBLIC_SETTING_KEYS);

  if (error) throw error;

  const settings: Record<string, any> = {};
  for (const row of (data || []) as StoreSettingRow[]) {
    settings[row.key] = row.value;
  }
  if (!settings.out_of_stock_label) {
    settings.out_of_stock_label = "¡Sin stock!";
  }

  return { data: settings };
}

export async function getSettings(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .order("key");

  if (error) throw error;

  const settings: Record<string, any> = {};
  for (const row of (data || []) as StoreSettingRow[]) {
    settings[row.key] = row.value;
  }

  return { data: settings };
}

export async function updateSetting(env: Env, key: string, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = UpdateSettingSchema.parse(body);
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("store_settings")
    .upsert(
      {
        key,
        value: parsed.value,
        updated_at: new Date().toISOString(),
        updated_by: adminInfo?.id || null,
      } as Record<string, unknown>,
      { onConflict: "key" }
    )
    .select()
    .single() as unknown as { data: StoreSettingRow | null; error: unknown };

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "setting",
      entityId: data!.id,
      entityName: key,
    });
  }

  return { data };
}

export async function listAdmins(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("admins")
    .select("id, user_id, role, created_at");

  if (error) throw error;

  const admins = await Promise.all(
    ((data || []) as { id: string; user_id: string; role: string; created_at: string }[]).map(async (admin) => {
      try {
        const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${admin.user_id}`, {
          headers: {
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          },
        });
        if (userResp.ok) {
          const user = (await userResp.json()) as { email: string };
          return { ...admin, email: user.email };
        }
      } catch {
        // ignore
      }
      return { ...admin, email: "unknown" };
    })
  );

  return { data: admins };
}

export async function createAdmin(env: Env, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = CreateAdminSchema.parse(body);
  const supabase = getSupabase(env);

  const inviteResp = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parsed.email,
        password: crypto.randomUUID().slice(0, 16),
        email_confirm: true,
      }),
    }
  );

  if (!inviteResp.ok) {
    const errBody: any = await inviteResp.json();
    throw validationError(errBody.msg || "Failed to create user");
  }

  const invitedUser: any = await inviteResp.json();

  const { data: admin, error } = await supabase
    .from("admins")
    .insert({
      user_id: invitedUser.id,
      role: parsed.role,
    } as Record<string, unknown>)
    .select()
    .single() as unknown as { data: { id: string; user_id: string; role: string } | null; error: unknown };

  if (error) {
    throw validationError("Failed to create admin record");
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "admin",
      entityId: admin!.id,
      entityName: parsed.email,
      details: { role: parsed.role },
    });
  }

  return { data: { ...admin!, email: parsed.email } } as { data: { id: string; user_id: string; role: string; email: string } };
}

export async function deleteAdmin(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: admin, error: findError } = await supabase
    .from("admins")
    .select("id, user_id")
    .eq("id", id)
    .single() as unknown as { data: { id: string; user_id: string } | null; error: unknown };

  if (findError || !admin) throw notFound("Admin");

  await supabase.from("admins").delete().eq("id", id);

  await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${admin.user_id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "admin",
      entityId: id,
    });
  }

  return { data: { message: "Admin deleted" } };
}

const settingsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

settingsRouter.get('/', async (c) => {
  const adminUser = c.get('adminUser');
  if (adminUser) {
    const result = await getSettings(c.env);
    return c.json(result);
  }
  const result = await getPublicSettings(c.env);
  return c.json(result);
});

settingsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const key = (body as { key: string }).key;
  const result = await updateSetting(c.env, key, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/settings']);
  return c.json(result, 201);
});

settingsRouter.put('/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateSetting(c.env, key, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/settings']);
  return c.json(result);
});

export default settingsRouter;

export const adminsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

adminsRouter.get('/', async (c) => {
  const result = await listAdmins(c.env);
  return c.json(result);
});

adminsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createAdmin(c.env, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  return c.json(result, 201);
});

adminsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteAdmin(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  return c.json(result);
});
