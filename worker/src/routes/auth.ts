import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env, AdminUser } from '../types';
import { LoginBody, RefreshBody } from '../lib/validate';
import { unauthorized } from '../lib/errors';

export async function loginHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const { email, password } = parsed.data;

  const response = await fetch(
    `${c.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) throw unauthorized('Invalid credentials');

  const data: any = await response.json();
  return c.json({
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      user: data.user,
    },
  });
}

export async function refreshHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = RefreshBody.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const response = await fetch(
    `${c.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ refresh_token: parsed.data.refresh_token }),
    }
  );

  if (!response.ok) throw unauthorized('Invalid or expired refresh token');

  const data: any = await response.json();
  return c.json({
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      user: data.user,
    },
  });
}

export async function checkHandler(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ data: { authenticated: false } });
  }

  const token = authHeader.slice(7);
  const response = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!response.ok) return c.json({ data: { authenticated: false } });

  const user: { id: string; email: string } = await response.json();

  const adminResp = await fetch(
    `${c.env.SUPABASE_URL}/rest/v1/admins?user_id=eq.${user.id}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  const admins: { role: string }[] = await adminResp.json();

  return c.json({
    data: {
      authenticated: true,
      user: { id: user.id, email: user.email },
      role: admins?.[0]?.role || null,
    },
  });
}

const auth = new Hono<{ Bindings: Env; Variables: { adminUser: AdminUser } }>();
auth.post('/login', loginHandler);
auth.post('/refresh', refreshHandler);
auth.get('/check', checkHandler);

export default auth;
