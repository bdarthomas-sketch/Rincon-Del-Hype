import type { z } from "zod";
import type { CreateProductSchema, UpdateProductSchema } from "./lib/validate";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGINS: string;
  IMAGES: ImagesBinding;
}

export interface AdminUser {
  id: string;
  userId: string;
  email?: string;
  role: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ProductImageComposition = {
  url: string;
  image_mode?: string;
  image_scale?: number;
  image_offset_x?: number;
  image_offset_y?: number;
  image_padding?: number;
};

export type ProductRow = {
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
  auto_trim: boolean;
  image_margin: number;
  image_scale: number;
  image_offset_x: number;
  image_offset_y: number;
  image_mode: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_slug: string;
  primary_image: string | null;
  images: ProductImageComposition[];
  sizes: { label: string; stock: number }[];
  out_of_stock_message?: string;
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type SizeRow = {
  id: string;
  label: string;
  sort_order: number;
};

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
};

export interface VideoDropRow {
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

export interface ActivityLogRow {
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

export interface StoreSettingRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface AnalyticsEvent {
  id: string;
  event_type: 'page_view' | 'product_view' | 'whatsapp_click' | 'search';
  session_id: string | null;
  product_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ChangeHistoryEntry {
  created: number;
  edited: number;
  stock_changes: number;
  price_changes: number;
  deleted: number;
  toggles: number;
  sold: number;
  stock_updated: number;
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
  change_history: ChangeHistoryEntry;
  total_categories: number;
  total_sizes: number;
  total_brands: number;
  products_by_category: { name: string; slug: string; count: number }[];
  recent_activity: ActivityLogRow[];
}
