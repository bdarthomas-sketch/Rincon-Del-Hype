const API_BASE = (typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_API_BASE : undefined) || "https://rincondelhype-api.bdarthomas.workers.dev";
const API_PATH = `${API_BASE}/api`;

const SESSION_KEY = "rdh_session_id";
const SESSION_EXPIRY_KEY = "rdh_session_expiry";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function getSessionId(): string {
  const now = Date.now();
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  const expired = expiry !== null && now > Number(expiry);

  if (expired) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_TTL_MS));
  }
  return id;
}

type EventType = "page_view" | "product_view" | "whatsapp_click" | "search";

interface TrackPayload {
  event_type: EventType;
  product_id?: string;
  metadata?: Record<string, unknown>;
}

function buildTrackBody(payload: TrackPayload): Record<string, unknown> {
  return { ...payload, session_id: getSessionId() };
}

export function trackEvent(payload: TrackPayload): Promise<void> {
  const body = buildTrackBody(payload);

  return fetch(`${API_PATH}/analytics/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then(() => {})
    .catch((err) => {
      console.warn("trackEvent failed:", err);
    });
}
