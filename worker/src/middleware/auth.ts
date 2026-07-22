import { createMiddleware } from 'hono/factory';
import type { Env, AdminUser } from '../types';
import { unauthorized } from '../lib/errors';

export const verifyAdmin = createMiddleware<{
  Bindings: Env;
  Variables: { adminUser: AdminUser };
}>(async (c, next) => {
  console.log('[DIAG] verifyAdmin running for', c.req.method, c.req.path);
  const authHeader = c.req.header('Authorization');
  console.log('[DIAG] verifyAdmin authHeader present:', !!authHeader);
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[DIAG] verifyAdmin: no Bearer token, throwing');
    throw unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  console.log('[DIAG] verifyAdmin: token length:', token.length);

  const userResp = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  console.log('[DIAG] verifyAdmin: supabase user response:', userResp.status);
  if (!userResp.ok) {
    console.log('[DIAG] verifyAdmin: invalid token, throwing');
    throw unauthorized('Invalid or expired token');
  }

  const user: { id: string; email?: string } = await userResp.json();
  console.log('[DIAG] verifyAdmin: got user', user.id, user.email);

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
  console.log('[DIAG] verifyAdmin: admins found:', admins?.length);
  if (!admins?.length) throw unauthorized('Not an admin user');

  c.set('adminUser', {
    id: admins[0]!.id,
    userId: user.id,
    email: user.email,
    role: admins[0]!.role,
  });
  console.log('[DIAG] verifyAdmin: adminUser set, calling next()');

  await next();
  console.log('[DIAG] verifyAdmin: after next()');
});
