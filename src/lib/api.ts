import type { Product, Category } from "../data/types";

const API_BASE = (typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_API_BASE : undefined) || "https://rincondelhype-api.bdarthomas.workers.dev";
const API_PATH = `${API_PATH}/api`;

interface ApiProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brands: string[];
  price: number;
  category_id: string;
  category_name: string;
  category_slug: string;
  description: string | null;
  is_new: boolean;
  is_active: boolean;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  image_padding: string | null;
  primary_image: string | null;
  images: { url: string; image_mode?: string; image_scale?: number; image_offset_x?: number; image_offset_y?: number; image_padding?: number }[];
  sizes: { label: string; stock: number }[];
  out_of_stock_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brands: string[];
  price: number;
  category_id: string;
  description: string | null;
  is_new: boolean;
  is_active: boolean;
  auto_trim?: boolean;
  image_margin?: number;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_mode?: string;
  image_padding: string | null;
  created_at: string;
  updated_at: string;
  category: { name: string; slug: string };
  images: { url: string; alt_text: string; is_primary: boolean; image_mode?: string; image_scale?: number; image_offset_x?: number; image_offset_y?: number; image_padding?: number }[];
  category_name: string;
  category_slug: string;
  sizes: { label: string; stock: number }[];
  out_of_stock_message: string | null;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface ApiSingleResponse<T> {
  data: T;
}

function mapToProduct(row: ApiProductRow): Product {
  const primaryImg = row.images?.[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    brands: row.brands.length > 0 ? row.brands : undefined,
    price: row.price,
    image: row.primary_image || row.images?.[0]?.url || undefined,
    images: row.images && row.images.length > 0 ? row.images.map(i => i.url) : undefined,
    category: row.category_name as Category,
    description: row.description || undefined,
    sizes: row.sizes,
    isNew: row.is_new || undefined,
    auto_trim: row.auto_trim,
    image_margin: row.image_margin,
    image_scale: primaryImg?.image_scale ?? row.image_scale,
    image_offset_x: primaryImg?.image_offset_x ?? row.image_offset_x,
    image_offset_y: primaryImg?.image_offset_y ?? row.image_offset_y,
    image_mode: primaryImg?.image_mode ?? row.image_mode,
    image_padding: primaryImg?.image_padding ?? 0,
    out_of_stock_message: row.out_of_stock_message || undefined,
  };
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function fetchAllProducts(): Promise<Product[]> {
  const perPage = 100;
  const url = `${API_PATH}/products?page=1&per_page=${perPage}`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);

  const json: ApiListResponse<ApiProductRow> = await res.json();
  return json.data.map(mapToProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const url = `${API_PATH}/products/${slug}`;

  const res = await fetchWithTimeout(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch product: ${res.statusText}`);

  const json: ApiSingleResponse<ApiProductDetail> = await res.json();
  const d = json.data;

  const primaryImage = d.images.find((i) => i.is_primary)?.url || d.images[0]?.url || "";
  const additionalImages = d.images
    .filter((i) => !i.is_primary)
    .map((i) => i.url);

  const primaryImgData = d.images.find((i) => i.is_primary) || d.images[0];

  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    brand: d.brand,
    brands: d.brands.length > 0 ? d.brands : undefined,
    price: d.price,
    image: primaryImage,
    images: additionalImages.length > 0 ? additionalImages : undefined,
    category: d.category.name as Category,
    description: d.description || undefined,
    sizes: d.sizes,
    isNew: d.is_new || undefined,
    auto_trim: d.auto_trim,
    image_margin: d.image_margin,
    image_scale: primaryImgData?.image_scale ?? d.image_scale,
    image_offset_x: primaryImgData?.image_offset_x ?? d.image_offset_x,
    image_offset_y: primaryImgData?.image_offset_y ?? d.image_offset_y,
    image_mode: primaryImgData?.image_mode ?? d.image_mode,
    image_padding: primaryImgData?.image_padding ?? 0,
    out_of_stock_message: d.out_of_stock_message || undefined,
  };
}

export async function fetchSettings(): Promise<Record<string, any>> {
  const res = await fetchWithTimeout(`${API_PATH}/settings`);
  if (!res.ok) return { out_of_stock_label: "¡Sin stock!" };
  const json = await res.json();
  return json.data || {};
}

export async function fetchCategories(): Promise<string[]> {
  const res = await fetchWithTimeout(`${API_PATH}/categories`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);

  const json: { data: { name: string }[] } = await res.json();
  return json.data.map((c) => c.name);
}

// ── Video Drops (public) ──

export interface VideoDropItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string | null;
  youtube_url: string | null;
  is_new: boolean;
  clicks: number;
}

export async function fetchVideoDrops(): Promise<VideoDropItem[]> {
  const res = await fetchWithTimeout(`${API_PATH}/video-drops`);
  if (!res.ok) throw new Error(`Failed to fetch video drops: ${res.statusText}`);

  const json: { data: VideoDropItem[] } = await res.json();
  return json.data;
}

export async function incrementVideoDropClick(id: string): Promise<void> {
  try {
    await fetch(`${API_PATH}/video-drops/${id}/click`, { method: "POST" });
  } catch {
    // Fire-and-forget — don't block user navigation
  }
}
