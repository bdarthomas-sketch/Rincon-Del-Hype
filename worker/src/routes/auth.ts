import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Env, AdminUser } from '../types';
import { LoginBody } from '../lib/validate';
import { unauthorized } from '../lib/errors';

const REFRESH_COOKIE_PATH = '/api/admin/refresh';
const ACCESS_COOKIE_PATH = '/api';

function setTokenCookies(c: Context<{ Bindings: Env }>, accessToken: string, refreshToken: string, expiresIn: number) {
  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: ACCESS_COOKIE_PATH,
    maxAge: expiresIn,
  });
  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: REFRESH_COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 30,
  });
}

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
  setTokenCookies(c, data.access_token, data.refresh_token, data.expires_in);

  return c.json({
    data: {
      access_token: data.access_token,
      expires_in: data.expires_in,
      user: data.user,
    },
  });
}

export async function refreshHandler(c: Context<{ Bindings: Env }>) {
  const refreshToken = getCookie(c, 'refresh_token');
  if (!refreshToken) throw unauthorized('No refresh token');

  const response = await fetch(
    `${c.env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) throw unauthorized('Invalid or expired refresh token');

  const data: any = await response.json();
  setTokenCookies(c, data.access_token, data.refresh_token, data.expires_in);

  return c.json({
    data: {
      access_token: data.access_token,
      expires_in: data.expires_in,
      user: data.user,
    },
  });
}

export async function checkHandler(c: Context<{ Bindings: Env }>) {
  const token = getCookie(c, 'access_token');
  if (!token) {
    return c.json({ data: { authenticated: false } });
  }

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
      access_token: token,
    },
  });
}

export async function logoutHandler(c: Context<{ Bindings: Env }>) {
  deleteCookie(c, 'access_token', { path: ACCESS_COOKIE_PATH, sameSite: 'None', secure: true });
  deleteCookie(c, 'refresh_token', { path: REFRESH_COOKIE_PATH, sameSite: 'None', secure: true });
  return c.json({ data: { message: 'Logged out' } });
}

const auth = new Hono<{ Bindings: Env; Variables: { adminUser: AdminUser } }>();
auth.post('/login', loginHandler);
auth.post('/refresh', refreshHandler);
auth.get('/check', checkHandler);

export default auth;
