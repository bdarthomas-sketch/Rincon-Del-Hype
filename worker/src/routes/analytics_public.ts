import { Hono } from 'hono';
import type { Env } from "../types";
import { getSupabase } from "../lib/supabase";
import { TrackEventSchema } from "../lib/validate";

export async function trackEvent(
  env: Env,
  body: unknown,
  clientIp: string,
  userAgent: string
) {
  const parsed = TrackEventSchema.parse(body);
  const supabase = getSupabase(env);

  const { error } = await supabase.from("analytics_events").insert({
    event_type: parsed.event_type,
    session_id: parsed.session_id || null,
    product_id: parsed.product_id || null,
    metadata: parsed.metadata || {},
    ip_address: clientIp,
    user_agent: userAgent,
  });

  if (error) throw error;

  return { data: { ok: true } };
}

const analyticsPublicRoutes = new Hono<{ Bindings: Env }>();

analyticsPublicRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const clientIp = c.req.header('cf-connecting-ip') || 'unknown';
  const userAgent = c.req.header('user-agent') || '';
  const result = await trackEvent(c.env, body, clientIp, userAgent);
  return c.json(result, 201);
});

export default analyticsPublicRoutes;
