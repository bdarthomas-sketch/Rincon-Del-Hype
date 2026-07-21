const API_BASE = (typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_API_BASE : undefined) || "https://rincondelhype-api.bdarthomas.workers.dev";
const API_PATH = `${API_BASE}/api`;

const TOKEN_KEY = "rdh_admin_token";
const REFRESH_TOKEN_KEY = "rdh_admin_refresh";
const EXPIRES_IN_KEY = "rdh_admin_expires_in";

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

const UNAUTHORIZED_EVENT = "rdh:unauthorized";

function isAuthError(res: Response, json: any): boolean {
  return res.status === 401 && json?.error?.code === "UNAUTHORIZED";
}

async function silentRefresh(): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefresh) return null;
  const res = await fetch(`${API_PATH}/admin/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefresh }),
  });
  const json = await res.json();
  if (!res.ok) return null;
  const data = json.data as { access_token: string; refresh_token: string; expires_in: number };
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(EXPIRES_IN_KEY, String(data.expires_in));
  return data;
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const doFetch = (extraHeaders?: Record<string, string>) => {
    const headers = { "Content-Type": "application/json", ...opts?.headers, ...extraHeaders };
    return fetch(url, { ...opts, headers });
  };

  let res = await doFetch();
  const json = await res.json();
  if (!res.ok) {
    if (isAuthError(res, json)) {
      const refreshed = await silentRefresh();
      if (refreshed) {
        res = await doFetch({ Authorization: `Bearer ${refreshed.access_token}` });
        const retryJson = await res.json();
        if (!res.ok) {
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
          throw new Error(retryJson?.error?.message || retryJson?.error || `HTTP ${res.status}`);
        }
        return retryJson;
      }
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new Error(json?.error?.message || json?.error || `HTTP ${res.status}`);
  }
  return json;
}

export { UNAUTHORIZED_EVENT, TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_IN_KEY, silentRefresh };

export interface AdminUser {
  id: string;
  email: string;
  role: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  product_count?: number;
}

export interface Size {
  id: string;
  label: string;
  sort_order: number;
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  product_count?: number;
}

export interface ImageComposition {
  image_mode: string;
  image_scale: number;
  image_offset_x: number;
  image_offset_y: number;
  image_padding: number;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brand_id: string | null;
  brands: string[];
  price: number;
  old_price: number | null;
  category_id: string;
  description: string | null;
  is_new: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  image_padding: string | null;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_slug?: string;
  primary_image?: string | null;
  images?: { url: string; image_mode?: string; image_scale?: number; image_offset_x?: number; image_offset_y?: number; image_padding?: number }[];
  sizes?: { label: string; stock: number }[];
  out_of_stock_message?: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brands: string[];
  price: number;
  old_price: number | null;
  category_id: string;
  description: string | null;
  is_new: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  image_padding: string | null;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  created_at: string;
  updated_at: string;
  category: { name: string; slug: string };
  images: { id: string; url: string; alt_text: string; is_primary: boolean; image_mode?: string; image_scale?: number; image_offset_x?: number; image_offset_y?: number; image_padding?: number }[];
  sizes: { label: string; stock: number }[];
  out_of_stock_message?: string | null;
}

export interface ImageRecord {
  id: string;
  product_id: string;
  url: string;
  path?: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  image_mode?: string;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_padding?: number;
}

export interface ActivityEntry {
  id: string;
  admin_id: string | null;
  admin_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  product_stats: {
    total: number;
    active: number;
    out_of_stock: number;
    featured: number;
    incomplete: number;
  };
  product_stats_previous: {
    total: number;
    active: number;
    out_of_stock: number;
    incomplete: number;
  };
  page_activity: {
    total_visits: number;
    unique_visits: number;
    active_users: number;
    products_viewed: number;
    whatsapp_clicks: number;
    searches: number;
  };
  page_activity_daily: {
    visits: number[];
    whatsapp: number[];
    searches: number[];
    labels: string[];
  };
  page_activity_previous: {
    unique_visits: number;
    whatsapp_clicks: number;
    searches: number;
  };
  change_history: {
    created: number;
    edited: number;
    stock_changes: number;
    price_changes: number;
    deleted: number;
    toggles: number;
    sold: number;
    stock_updated: number;
  };
  total_categories: number;
  total_sizes: number;
  products_by_category: { name: string; slug: string; count: number }[];
  recent_activity: ActivityEntry[];
}

export interface PerformanceItem {
  product_id: string;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  primary_image: string | null;
  category_name: string;
  views: number;
  whatsapp_clicks: number;
  out_of_stock: boolean;
  incomplete: boolean;
}

export interface StockAlert {
  product_id: string;
  name: string;
  slug: string;
  sizes: string[];
}

// Auth
export async function loginAdmin(email: string, password: string) {
  return request<{ data: { access_token: string; refresh_token: string; expires_in: number; user: AdminUser } }>(
    `${API_PATH}/admin/login`,
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
}

export async function checkSession(token: string) {
  return request<{ data: { authenticated: boolean; user?: AdminUser; role?: string | null } }>(
    `${API_PATH}/admin/check`,
    { headers: authHeaders(token) }
  );
}

// Products
export async function listProducts(token: string, page = 1, perPage = 50, params?: Record<string, string>) {
  const searchParams = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) searchParams.set(k, v); });
  }
  return request<{ data: ProductRow[]; meta: { total: number; total_pages: number } }>(
    `${API_PATH}/products?${searchParams.toString()}`,
    { headers: authHeaders(token) }
  );
}

export async function getProduct(token: string, slug: string) {
  return request<{ data: ProductDetail }>(
    `${API_PATH}/products/${slug}`,
    { headers: authHeaders(token) }
  );
}

export async function createProduct(token: string, data: Record<string, unknown>) {
  return request<{ data: ProductRow }>(
    `${API_PATH}/products`,
    { method: "POST", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function updateProduct(token: string, id: string, data: Record<string, unknown>) {
  return request<{ data: ProductRow }>(
    `${API_PATH}/products/${id}`,
    { method: "PUT", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function deleteProduct(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/products/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

export async function duplicateProduct(token: string, id: string) {
  return request<{ data: ProductRow }>(
    `${API_PATH}/products/${id}/duplicate`,
    { method: "POST", headers: authHeaders(token) }
  );
}

export async function getFeaturedProducts(token?: string) {
  const headers = token ? authHeaders(token) : undefined;
  return request<{ data: ProductRow[] }>(`${API_PATH}/products/featured`, { headers });
}

// Reorder
export interface ReorderItem {
  id: string;
  sort_order: number;
}

export async function reorderProducts(token: string, items: ReorderItem[]) {
  return request<{ success: boolean }>(
    `${API_PATH}/products/reorder`,
    { method: "PUT", body: JSON.stringify({ items }), headers: authHeaders(token) }
  );
}

// Categories
export async function listCategories(token?: string) {
  const headers = token ? authHeaders(token) : undefined;
  return request<{ data: Category[] }>(`${API_PATH}/categories`, { headers });
}

export async function createCategory(token: string, data: { name: string; slug: string; description?: string; sort_order?: number }) {
  return request<{ data: Category }>(
    `${API_PATH}/categories`,
    { method: "POST", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function updateCategory(token: string, id: string, data: Partial<Category>) {
  return request<{ data: Category }>(
    `${API_PATH}/categories/${id}`,
    { method: "PUT", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function deleteCategory(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/categories/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

// Sizes
export async function listSizes(token?: string) {
  const headers = token ? authHeaders(token) : undefined;
  return request<{ data: Size[] }>(`${API_PATH}/sizes`, { headers });
}

export async function createSize(token: string, data: { label: string; sort_order?: number }) {
  return request<{ data: Size }>(
    `${API_PATH}/sizes`,
    { method: "POST", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function updateSize(token: string, id: string, data: Partial<Size>) {
  return request<{ data: Size }>(
    `${API_PATH}/sizes/${id}`,
    { method: "PUT", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function deleteSize(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/sizes/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

// Brands
export async function listBrands(token?: string) {
  const headers = token ? authHeaders(token) : undefined;
  return request<{ data: BrandRow[] }>(`${API_PATH}/admin/brands`, { headers });
}

export async function createBrand(token: string, name: string) {
  return request<{ data: BrandRow }>(
    `${API_PATH}/admin/brands`,
    { method: "POST", body: JSON.stringify({ name }), headers: authHeaders(token) }
  );
}

export async function renameBrand(token: string, id: string, name: string) {
  return request<{ data: BrandRow }>(
    `${API_PATH}/admin/brands/${id}`,
    { method: "PATCH", body: JSON.stringify({ name }), headers: authHeaders(token) }
  );
}

export async function deleteBrand(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/brands/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

export async function mergeBrands(token: string, fromId: string, toId: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/brands/merge`,
    { method: "POST", body: JSON.stringify({ from_id: fromId, to_id: toId }), headers: authHeaders(token) }
  );
}

// Images
export async function uploadImage(token: string, productId: string, file: File, altText?: string, isPrimary?: boolean) {
  const form = new FormData();
  form.append("file", file);
  form.append("product_id", productId);
  if (altText) form.append("alt_text", altText);
  if (isPrimary) form.append("is_primary", "true");

  const res = await fetch(`${API_PATH}/images/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || json?.error || "Upload failed");
  return json as { data: ImageRecord };
}

export async function deleteImage(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/images/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

export async function updateImageComposition(token: string, productId: string, imageId: string, composition: ImageComposition) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/products/${productId}/images/${imageId}/composition`,
    { method: "PATCH", body: JSON.stringify(composition), headers: authHeaders(token) }
  );
}

// Dashboard & Activity
export async function getStats(token: string, range?: string) {
  const params = range ? `?range=${range}` : "";
  return request<{ data: DashboardStats }>(
    `${API_PATH}/admin/stats${params}`,
    { headers: authHeaders(token) }
  );
}

export interface ActivityFilters {
  page?: number;
  per_page?: number;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
}

export async function getActivityPage(token: string, filters: ActivityFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return request<{ data: ActivityEntry[]; count: number; page: number; per_page: number }>(
    `${API_PATH}/admin/activity?${params.toString()}`,
    { headers: authHeaders(token) }
  );
}

export async function getActivity(token: string, limit = 20) {
  return request<{ data: ActivityEntry[]; count: number }>(
    `${API_PATH}/admin/activity?limit=${limit}`,
    { headers: authHeaders(token) }
  );
}

// Analytics tracking (public)
export async function trackAnalyticsEvent(data: {
  event_type: 'page_view' | 'product_view' | 'whatsapp_click' | 'search';
  session_id?: string;
  product_id?: string;
  metadata?: Record<string, unknown>;
}) {
  return request<{ data: { ok: boolean } }>(
    `${API_PATH}/analytics/track`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

// Rendimiento / Performance
export async function getRendimiento(token: string) {
  return request<{ data: { most_viewed: PerformanceItem[] } }>(
    `${API_PATH}/admin/analytics/performance`,
    { headers: authHeaders(token) }
  );
}

// Analytics
export async function getStockAlerts(token: string) {
  return request<{ data: StockAlert[] }>(
    `${API_PATH}/admin/analytics/stock-alerts`,
    { headers: authHeaders(token) }
  );
}

export async function getAnalyticsByCategory(token: string) {
  return request<{ data: { name: string; slug: string; count: number }[] }>(
    `${API_PATH}/admin/analytics/by-category`,
    { headers: authHeaders(token) }
  );
}

export async function getRecentlyUpdated(token: string, limit = 10) {
  return request<{ data: { id: string; name: string; slug: string; updated_at: string; is_active: boolean }[] }>(
    `${API_PATH}/admin/analytics/recently-updated?limit=${limit}`,
    { headers: authHeaders(token) }
  );
}

export async function resetAnalytics(token: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/analytics/reset`,
    { method: "POST", headers: authHeaders(token) }
  );
}

export async function clearActivity(token: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/activity/clear`,
    { method: "POST", headers: authHeaders(token) }
  );
}

// Settings
export async function getSettings(token: string) {
  return request<{ data: Record<string, any> }>(
    `${API_PATH}/admin/settings`,
    { headers: authHeaders(token) }
  );
}

export async function updateSetting(token: string, key: string, value: Record<string, unknown>) {
  return request<{ data: any }>(
    `${API_PATH}/admin/settings/${key}`,
    { method: "PUT", body: JSON.stringify({ value }), headers: authHeaders(token) }
  );
}

// Admins (superadmin only)
export async function listAdmins(token: string) {
  return request<{ data: { id: string; user_id: string; email: string; role: string; created_at: string }[] }>(
    `${API_PATH}/admin/admins`,
    { headers: authHeaders(token) }
  );
}

export async function createAdmin(token: string, email: string, role: string) {
  return request<{ data: { id: string; email: string; role: string } }>(
    `${API_PATH}/admin/admins`,
    { method: "POST", body: JSON.stringify({ email, role }), headers: authHeaders(token) }
  );
}

export async function deleteAdmin(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/admins/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}

// ── Video Drops ──

export interface VideoDrop {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  original_url: string | null;
  youtube_url: string | null;
  is_new: boolean;
  is_active: boolean;
  clicks: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VideoDropFormData {
  title: string;
  youtube_url?: string;
  is_new?: boolean;
  is_active?: boolean;
  sort_order?: number;
  thumbnail?: File | null;
  video?: File | null;
  original?: File | null;
}

export async function listVideoDrops(token: string) {
  return request<{ data: VideoDrop[] }>(
    `${API_PATH}/admin/video-drops`,
    { headers: authHeaders(token) }
  );
}

export async function createVideoDrop(token: string, data: VideoDropFormData) {
  const form = new FormData();
  form.append("title", data.title);
  if (data.youtube_url) form.append("youtube_url", data.youtube_url);
  if (data.is_new !== undefined) form.append("is_new", String(data.is_new));
  if (data.is_active !== undefined) form.append("is_active", String(data.is_active));
  if (data.sort_order !== undefined) form.append("sort_order", String(data.sort_order));
  if (data.thumbnail) form.append("thumbnail", data.thumbnail);
  if (data.video) form.append("video", data.video);
  if (data.original) form.append("original", data.original);

  const res = await fetch(`${API_PATH}/admin/video-drops`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || json?.error || "Create failed");
  return json as { data: VideoDrop };
}

export async function updateVideoDrop(token: string, id: string, data: Partial<VideoDropFormData>) {
  return request<{ data: VideoDrop }>(
    `${API_PATH}/admin/video-drops/${id}`,
    { method: "PUT", body: JSON.stringify(data), headers: authHeaders(token) }
  );
}

export async function updateVideoDropMedia(token: string, id: string, files: { thumbnail?: File; video?: File; original?: File }) {
  const form = new FormData();
  if (files.thumbnail) form.append("thumbnail", files.thumbnail);
  if (files.video) form.append("video", files.video);
  if (files.original) form.append("original", files.original);

  const res = await fetch(`${API_PATH}/admin/video-drops/${id}/media`, {
    method: "PUT",
    headers: authHeaders(token),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || json?.error || "Media update failed");
  return json as { data: VideoDrop };
}

export async function clearVideoDropMedia(token: string, id: string) {
  return request<{ data: VideoDrop }>(
    `${API_PATH}/admin/video-drops/${id}/clear-media`,
    { method: "PUT", headers: authHeaders(token) }
  );
}

export async function reorderVideoDrops(token: string, items: { id: string; sort_order: number }[]) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/video-drops/reorder`,
    { method: "PUT", body: JSON.stringify({ items }), headers: authHeaders(token) }
  );
}

export async function deleteVideoDrop(token: string, id: string) {
  return request<{ data: { message: string } }>(
    `${API_PATH}/admin/video-drops/${id}`,
    { method: "DELETE", headers: authHeaders(token) }
  );
}
