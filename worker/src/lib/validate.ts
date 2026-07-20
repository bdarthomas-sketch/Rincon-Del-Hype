import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  brand: z.string().min(1).max(100),
  brands: z.array(z.string().max(100)).optional(),
  price: z.number().positive("Price must be positive").max(999999),
  old_price: z.number().min(0).max(999999).optional(),
  category_id: z.string().uuid("Invalid category ID"),
  description: z.string().max(5000).nullish(),
  is_active: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  image_padding: z.string().max(50).nullish(),
  auto_trim: z.boolean().optional(),
  image_margin: z.number().int().min(1).max(100).optional(),
  image_scale: z.number().min(0.01).max(50).optional(),
  image_offset_x: z.number().optional(),
  image_offset_y: z.number().optional(),
  image_mode: z.enum(['fit','cover','original','custom']).optional(),
  out_of_stock_message: z.string().max(200).nullish(),
  sizes: z.array(z.object({
    size_id: z.string().uuid(),
    stock: z.number().int().min(0).default(0),
  })).min(1, "At least one size is required"),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateSizeSchema = z.object({
  label: z.string().min(1).max(50),
  sort_order: z.number().int().min(0).optional(),
});

export const UpdateSizeSchema = CreateSizeSchema.partial();

export const QueryProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().max(200).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  is_new: z.coerce.boolean().optional(),
  is_featured: z.coerce.boolean().optional(),
  show_deleted: z.coerce.boolean().optional(),
  sort: z
    .enum(["sort_order", "price_asc", "price_desc", "name_asc", "name_desc", "newest", "oldest"])
    .default("sort_order"),
});

export const UpdateSettingSchema = z.object({
  value: z.record(z.unknown()),
});

export const CreateAdminSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.number().int().min(0),
});

export const ReorderProductsSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
});

export const UpdateImageCompositionSchema = z.object({
  image_mode: z.enum(['fit', 'cover']).optional(),
  image_scale: z.number().min(0.5).max(3.0).optional(),
  image_offset_x: z.number().min(-500).max(500).optional(),
  image_offset_y: z.number().min(-500).max(500).optional(),
  image_padding: z.number().int().min(0).max(25).optional(),
});

export type UpdateImageCompositionInput = z.infer<typeof UpdateImageCompositionSchema>;

export const TrackEventSchema = z.object({
  event_type: z.enum(['page_view', 'product_view', 'whatsapp_click', 'search']),
  session_id: z.string().optional(),
  product_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Video Drops
export const CreateVideoDropSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  youtube_url: z.string().url().optional().or(z.literal('')),
  is_new: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const UpdateVideoDropSchema = CreateVideoDropSchema.partial();

export const ReorderVideoDropsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })).min(1),
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshBody = z.object({
  refresh_token: z.string().min(1),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateSizeInput = z.infer<typeof CreateSizeSchema>;
export type QueryProductsInput = z.infer<typeof QueryProductsSchema>;
export type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>;
export type CreateAdminInput = z.infer<typeof CreateAdminSchema>;
