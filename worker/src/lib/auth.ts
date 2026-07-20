import type { Env } from "../types";
import { unauthorized, forbidden } from "./errors";

interface AdminUserInfo {
  userId: string;
  role: string;
}

interface FullAdminInfo {
  id: string;
  userId: string;
  role: string;
}

export async function verifyAdmin(
  env: Env,
  request: Request
): Promise<AdminUserInfo> {
  const result = await tryVerifyAdmin(env, request);
  if (!result) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw unauthorized("Missing or invalid Authorization header");
    }
    throw unauthorized("Invalid or expired token");
  }
  return result;
}

export async function tryVerifyAdmin(
  env: Env,
  request: Request
): Promise<AdminUserInfo | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (!response.ok) return null;

  const user: any = await response.json();

  const adminResp = await fetch(
    `${env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${user.id}&select=role,id`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  const admins: any[] = await adminResp.json();

  if (!admins || admins.length === 0) return null;

  return { userId: user.id, role: admins[0].role };
}

export async function verifySuperAdmin(
  env: Env,
  request: Request
): Promise<AdminUserInfo> {
  const admin = await verifyAdmin(env, request);
  if (admin.role !== "superadmin") {
    throw forbidden("Only superadmins can perform this action");
  }
  return admin;
}

export async function getAdminInfo(
  env: Env,
  request: Request
): Promise<FullAdminInfo | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (!response.ok) return null;

  const user: any = await response.json();

  const adminResp = await fetch(
    `${env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${user.id}&select=id,role`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  const admins: any[] = await adminResp.json();

  if (!admins || admins.length === 0) return null;

  return { id: admins[0].id, userId: user.id, role: admins[0].role };
}
