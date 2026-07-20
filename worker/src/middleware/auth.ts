import { createMiddleware } from 'hono/factory';
import type { Env, AdminUser } from '../types';
import { unauthorized } from '../lib/errors';

export const verifyAdmin = createMiddleware<{
  Bindings: Env;
  Variables: { adminUser: AdminUser };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  const userResp = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!userResp.ok) throw unauthorized('Invalid or expired token');

  const user: { id: string; email?: string } = await userResp.json();

  const adminResp = await fetch(
    `${c.env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${user.id}&select=id,role`,
    {
      headers: {
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  const admins: { id: string; role: string }[] = await adminResp.json();
  if (!admins?.length) throw unauthorized('Not an admin user');

  c.set('adminUser', {
    id: admins[0]!.id,
    userId: user.id,
    email: user.email,
    role: admins[0]!.role,
  });

  await next();
});
