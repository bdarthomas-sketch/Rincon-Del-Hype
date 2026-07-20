import type { Env } from "../types";
import { getSupabase } from "./supabase";

export async function logActivity(
  env: Env,
  params: {
    adminId: string;
    adminEmail?: string;
    action: "created" | "updated" | "deleted" | "duplicated" | "reordered" | "activated" | "deactivated" | "featured" | "unfeatured" | "price_changed" | "stock_changed" | "stock_updated" | "sold" | "restored";
    entity: "product" | "category" | "size" | "image" | "setting" | "admin" | "brand" | "video_drop";
    entityId: string;
    entityName?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const supabase = getSupabase(env);

  const { adminId, action, entity, entityId, entityName, details } = params;

  let adminEmail = params.adminEmail;
  if (!adminEmail) {
    const { data: admin } = await supabase
      .from("admins")
      .select("user_id")
      .eq("id", adminId)
      .single();

    if ((admin as any)?.user_id) {
      const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${(admin as any).user_id}`, {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      });
      if (userResp.ok) {
        const user: any = await userResp.json();
        adminEmail = user.email;
      }
    }
  }

  await supabase.from("activity_log").insert({
    admin_id: adminId,
    admin_email: adminEmail || "unknown",
    action,
    entity,
    entity_id: entityId,
    entity_name: entityName || null,
    details: details || null,
  });
}
