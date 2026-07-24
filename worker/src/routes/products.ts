import { Hono } from 'hono';
import type { Env, AdminUser, ProductRow } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import {
  CreateProductSchema,
  UpdateProductSchema,
  QueryProductsSchema,
  ReorderProductsSchema,
} from "../lib/validate";
import { logActivity } from "../lib/activity";
import { purgeCache } from "../middleware/cache";
import type { z } from "zod";

export async function listProducts(env: Env, url: URL, adminUser?: { userId: string; role: string } | null) {
  const query = QueryProductsSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  );

  const supabase = getSupabase(env);

  let q = supabase
    .from("products")
    .select(
      `
      *,
      category:categories!inner(name, slug),
      images:product_images(id, url, is_primary, sort_order, image_mode, image_scale, image_offset_x, image_offset_y, image_padding),
      product_sizes(stock, size:size_id(label))
    `,
      { count: "exact" }
    );

  if (!adminUser) {
    q = q.eq("is_active", true);
    q = q.is("deleted_at", null);
  }

  if (adminUser && !query.show_deleted) {
    q = q.is("deleted_at", null);
  }

  if (query.category) q = q.eq("category.slug", query.category);
  if (query.brand) q = q.eq("brand", query.brand);
  if (query.search)
    q = q.ilike("name", `%${query.search}%`);
  if (query.min_price) q = q.gte("price", query.min_price);
  if (query.max_price) q = q.lte("price", query.max_price);
  if (query.is_new !== undefined) q = q.eq("is_new", query.is_new);
  if (query.is_featured !== undefined) q = q.eq("is_featured", query.is_featured);
  if (query.size)
    q = q.filter("product_sizes.size.label", "eq", query.size);

  const sortMap: Record<string, { column: string; direction: "asc" | "desc" }> =
    {
      sort_order: { column: "sort_order", direction: "asc" },
      price_asc: { column: "price", direction: "asc" },
      price_desc: { column: "price", direction: "desc" },
      name_asc: { column: "name", direction: "asc" },
      name_desc: { column: "name", direction: "desc" },
      newest: { column: "created_at", direction: "desc" },
      oldest: { column: "created_at", direction: "asc" },
    };

  if (query.sort === "sort_order") {
    q = q.order("sort_order", { ascending: true });
  } else {
    const sort = sortMap[query.sort]!;
    q = q.order(sort.column, { ascending: sort.direction === "asc" });
  }

  const from = (query.page - 1) * query.per_page;
  const to = from + query.per_page - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;

  if (error) {
    console.error("Supabase query error:", error);
    throw error;
  }

  const products = (data || []).map(mapProductRow);

  return {
    data: products,
    meta: {
      page: query.page,
      per_page: query.per_page,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / query.per_page),
    },
  };
}

export async function getProduct(env: Env, idOrSlug: string) {
  const supabase = getSupabase(env);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories!inner(name, slug),
      images:product_images(id, url, alt_text, is_primary, sort_order, image_mode, image_scale, image_offset_x, image_offset_y, image_padding),
      product_sizes(stock, size:size_id(label))
    `
    )
    .is("deleted_at", null);

  if (isUuid) {
    query = query.eq("id", idOrSlug);
  } else {
    query = query.eq("slug", idOrSlug);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Supabase getProduct error:", error);
    throw error;
  }
  if (!data) throw notFound("Product");

  return { data: mapProductDetail(data) };
}

async function ensureBrand(env: Env, brandName: string): Promise<string | null> {
  if (!brandName?.trim()) return null;
  const name = brandName.trim();
  const supabase = getSupabase(env);

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing.id;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("brands")
        .select("id")
        .eq("name", name)
        .maybeSingle();
      return retry?.id || null;
    }
    throw error;
  }

  return created.id;
}

export async function createProduct(env: Env, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = CreateProductSchema.parse(body);

    const supabase = getSupabase(env);

  const { sizes, ...productData } = parsed;

  if (!productData.sort_order || productData.sort_order === 0) {
    const { data: cat } = await supabase
      .from("categories")
      .select("sort_order")
      .eq("id", productData.category_id)
      .single();

    if (cat) {
      const base = cat.sort_order * 100;
      const { data: existing } = await supabase
        .from("products")
        .select("sort_order")
        .gte("sort_order", base)
        .lt("sort_order", base + 100)
        .order("sort_order", { ascending: false })
        .limit(1);

      productData.sort_order = existing?.[0]?.sort_order
        ? existing[0].sort_order + 10
        : base;
    }
  }

  const brand_id = await ensureBrand(env, productData.brand);

  // Check if a soft-deleted product with this slug exists
  const { data: deletedProduct } = await supabase
    .from("products")
    .select("*")
    .eq("slug", productData.slug)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (deletedProduct) {
    // Reactivate the soft-deleted product with new data
    const { data: product, error: updateError } = await supabase
      .from("products")
      .update({
        ...productData,
        brand_id,
        brands: productData.brands || [],
        is_new: productData.is_new ?? false,
        is_featured: productData.is_featured ?? false,
        deleted_at: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deletedProduct.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Replace sizes for the reactivated product
    await supabase.from("product_sizes").delete().eq("product_id", product.id);

    const sizeRows = (sizes || []).map((s: { size_id: string; stock: number }) => ({
      product_id: product.id,
      size_id: s.size_id,
      stock: s.stock,
    }));

    if (sizeRows.length > 0) {
      const { error: sizeError } = await supabase
        .from("product_sizes")
        .insert(sizeRows);

      if (sizeError) throw sizeError;
    }

    if (adminInfo) {
      await logActivity(env, {
        adminId: adminInfo.id,
        action: "created",
        entity: "product",
        entityId: product.id,
        entityName: product.name,
      });
    }

    return { data: product };
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      ...productData,
      brand_id,
      brands: productData.brands || [],
      is_new: productData.is_new ?? false,
      is_featured: productData.is_featured ?? false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw validationError("Slug already exists");
    throw error;
  }

  const sizeRows = (sizes || []).map((s: { size_id: string; stock: number }) => ({
    product_id: product.id,
    size_id: s.size_id,
    stock: s.stock,
  }));

  if (sizeRows.length > 0) {
    const { error: sizeError } = await supabase
      .from("product_sizes")
      .insert(sizeRows);

    if (sizeError) throw sizeError;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "product",
      entityId: product.id,
      entityName: product.name,
    });
  }

  return { data: product };
}

export async function updateProduct(
  env: Env,
  id: string,
  body: unknown,
  adminInfo?: { id: string; role: string } | null
) {
  const parsed = UpdateProductSchema.parse(body);
  const supabase = getSupabase(env);

  const { sizes, ...productData } = parsed;

  const { data: current } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!current) throw notFound("Product");

  let brand_id: string | null = current.brand_id || null;
  if (productData.brand !== undefined && productData.brand !== current.brand) {
    brand_id = await ensureBrand(env, productData.brand);
  }

  const updateData: Record<string, unknown> = { ...productData };
  if (brand_id !== (current.brand_id || null)) {
    updateData.brand_id = brand_id;
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") throw validationError("Slug already exists");
      throw error;
    }
  }

  if (sizes) {
    await supabase.from("product_sizes").delete().eq("product_id", id);

    if (sizes.length > 0) {
      const sizeRows = sizes.map((s: { size_id: string; stock: number }) => ({
        product_id: id,
        size_id: s.size_id,
        stock: s.stock,
      }));

      const { error: sizeError } = await supabase
        .from("product_sizes")
        .insert(sizeRows);

      if (sizeError) throw sizeError;
    }
  }

  const { data: updated } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!updated) throw notFound("Product");

  if (adminInfo) {
    const activityLogs: { action: "activated" | "deactivated" | "featured" | "unfeatured" | "price_changed"; details: Record<string, unknown> }[] = [];
    const pd = productData as Record<string, unknown>;

    if (pd.is_active !== undefined && pd.is_active !== current.is_active) {
      activityLogs.push({
        action: pd.is_active ? "activated" : "deactivated",
        details: { old: current.is_active, new: pd.is_active },
      });
    }

    if (pd.is_featured !== undefined && pd.is_featured !== current.is_featured) {
      activityLogs.push({
        action: pd.is_featured ? "featured" : "unfeatured",
        details: { old: current.is_featured, new: pd.is_featured },
      });
    }

    if (pd.price !== undefined && Number(pd.price) !== Number(current.price)) {
      activityLogs.push({
        action: "price_changed",
        details: { old_price: Number(current.price), new_price: pd.price },
      });
    }

    if (activityLogs.length > 0) {
      for (const log of activityLogs) {
        await logActivity(env, {
          adminId: adminInfo.id,
          action: log.action,
          entity: "product",
          entityId: id,
          entityName: updated.name,
          details: log.details,
        });
      }
    } else if (Object.keys(productData).length > 0 || sizes) {
      await logActivity(env, {
        adminId: adminInfo.id,
        action: "updated",
        entity: "product",
        entityId: id,
        entityName: updated.name,
        details: { updated_fields: Object.keys(productData) },
      });
    }
  }

  return { data: updated };
}

export async function deleteProduct(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .single();

  if (!product) throw notFound("Product");

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "product",
      entityId: id,
      entityName: product.name,
    });
  }

  return { data: { message: "Product deleted" } };
}

export async function duplicateProduct(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: original, error: fetchError } = await supabase
    .from("products")
    .select(`
      *,
      product_sizes(stock, size_id),
      product_images(id, url, alt_text, is_primary, sort_order, image_mode, image_scale, image_offset_x, image_offset_y, image_padding)
    `)
    .eq("id", id)
    .single();

  if (fetchError || !original) throw notFound("Product");

  const dupSlug = `${original.slug}-copy-${Date.now()}`;

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      name: `${original.name} (Copia)`,
      slug: dupSlug,
      brand: original.brand,
      brand_id: original.brand_id,
      brands: original.brands || [],
      price: original.price,
      old_price: original.old_price,
      category_id: original.category_id,
      description: original.description,
      is_new: true,
      is_featured: false,
      image_padding: original.image_padding,
      auto_trim: true,
      image_margin: 50,
      image_scale: original.image_scale ?? 1.0,
      image_offset_x: original.image_offset_x ?? 0,
      image_offset_y: original.image_offset_y ?? 0,
      image_mode: original.image_mode ?? (original.auto_trim ? 'cover' : 'fit'),
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") throw validationError("Slug conflict, try again");
    throw insertError;
  }

  const sizeRows = (original.product_sizes || []).map((ps: { size_id: string; stock: number }) => ({
    product_id: product.id,
    size_id: ps.size_id,
    stock: ps.stock,
  }));

  if (sizeRows.length > 0) {
    await supabase.from("product_sizes").insert(sizeRows);
  }

  // Copy image composition from original images
  const originalImages = original.product_images || [];
  if (originalImages.length > 0) {
    const imageRows = originalImages.map((img: any) => ({
      product_id: product.id,
      url: img.url,
      alt_text: img.alt_text,
      is_primary: img.is_primary,
      sort_order: img.sort_order,
      image_mode: img.image_mode ?? 'cover',
      image_scale: img.image_scale ?? 1.0,
      image_offset_x: img.image_offset_x ?? 0,
      image_offset_y: img.image_offset_y ?? 0,
      image_padding: img.image_padding ?? 0,
    }));

    const { error: imgError } = await supabase
      .from("product_images")
      .insert(imageRows);

    if (imgError) console.error("Failed to copy images:", imgError);
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "duplicated",
      entity: "product",
      entityId: product.id,
      entityName: product.name,
      details: { original_id: id },
    });
  }

  return { data: product };
}

export async function reorderProducts(env: Env, body: unknown, adminInfo?: { id: string; role: string } | null) {
  const parsed = ReorderProductsSchema.parse(body);
  const supabase = getSupabase(env);

  for (const item of parsed.items) {
    const { error } = await supabase
      .from("products")
      .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) throw error;
  }

  if (adminInfo && parsed.items.length > 0) {
    const { data: names } = await supabase
      .from("products")
      .select("id, name")
      .in("id", parsed.items.map((i) => i.id));

    await logActivity(env, {
      adminId: adminInfo.id,
      action: "reordered",
      entity: "product",
      entityId: "batch",
      entityName: `${parsed.items.length} products`,
      details: { count: parsed.items.length, items: parsed.items.map((i) => ({ id: i.id, sort_order: i.sort_order })) },
    });
  }

  return { success: true };
}

function mapProductRow(row: any): ProductRow {
  const allImages: { id: string; url: string; is_primary: boolean; sort_order: number; image_mode?: string; image_scale?: number; image_offset_x?: number; image_offset_y?: number; image_padding?: number }[] =
    (row.images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const primary = allImages.find((img) => img.is_primary);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    brand_id: row.brand_id || null,
    brands: row.brands || [],
    price: Number(row.price),
    old_price: row.old_price ? Number(row.old_price) : null,
    category_id: row.category_id,
    description: row.description,
    is_new: row.is_new,
    is_active: row.is_active,
    is_featured: row.is_featured || false,
    sort_order: row.sort_order ?? 0,
    image_padding: row.image_padding,
    auto_trim: row.auto_trim ?? true,
    image_margin: row.image_margin ?? 50,
    image_scale: row.image_scale ?? 1.0,
    image_offset_x: row.image_offset_x ?? 0,
    image_offset_y: row.image_offset_y ?? 0,
    image_mode: row.image_mode ?? (row.auto_trim ? 'cover' : 'fit'),
    deleted_at: row.deleted_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: row.category?.name || "",
    category_slug: row.category?.slug || "",
    primary_image: primary?.url || allImages[0]?.url || null,
    images: allImages.map((img) => ({
      url: img.url,
      id: img.id,
      image_mode: img.image_mode ?? (row.auto_trim ? 'cover' : 'fit'),
      image_scale: img.image_scale ?? 1.0,
      image_offset_x: img.image_offset_x ?? 0,
      image_offset_y: img.image_offset_y ?? 0,
      image_padding: img.image_padding ?? 0,
    })),
    sizes: (row.product_sizes || [])
      .map((ps: any) => ({ label: ps.size?.label, stock: ps.stock ?? 0 }))
      .filter((s: any) => s.label),
    out_of_stock_message: row.out_of_stock_message || null,
  };
}

function mapProductDetail(row: any) {
  const images = (row.images || [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order);

  return {
    ...row,
    price: Number(row.price),
    old_price: row.old_price ? Number(row.old_price) : null,
    is_featured: row.is_featured || false,
    auto_trim: row.auto_trim ?? true,
    image_margin: row.image_margin ?? 50,
    image_scale: row.image_scale ?? 1.0,
    image_offset_x: row.image_offset_x ?? 0,
    image_offset_y: row.image_offset_y ?? 0,
    image_mode: row.image_mode ?? (row.auto_trim ? 'cover' : 'fit'),
    category_name: row.category?.name,
    category_slug: row.category?.slug,
    images: images.map((i: any) => ({
      id: i.id,
      url: i.url,
      alt_text: i.alt_text,
      is_primary: i.is_primary,
      image_mode: i.image_mode ?? (row.auto_trim ? 'cover' : 'fit'),
      image_scale: i.image_scale ?? 1.0,
      image_offset_x: i.image_offset_x ?? 0,
      image_offset_y: i.image_offset_y ?? 0,
      image_padding: i.image_padding ?? 0,
    })),
    sizes: (row.product_sizes || [])
      .map((ps: any) => ({ label: ps.size?.label, stock: ps.stock ?? 0 }))
      .filter((s: any) => s.label),
  };
}

const productsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

productsRouter.get('/', async (c) => {
  const url = new URL(c.req.url);
  const adminUser = c.get('adminUser');
  const result = await listProducts(c.env, url, adminUser || null);
  return c.json(result);
});

productsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const result = await getProduct(c.env, slug);
  return c.json(result);
});

productsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createProduct(c.env, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/products']);
  return c.json(result, 201);
});

productsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateProduct(c.env, id, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  const updated = result.data as { slug?: string } | null;
  await purgeCache(c, ['/api/products', updated?.slug ? `/api/products/${updated.slug}` : '', `/api/products/${id}`].filter(Boolean));
  return c.json(result);
});

productsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteProduct(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/products']);
  return c.json(result);
});

productsRouter.post('/reorder', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await reorderProducts(c.env, body, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/products']);
  return c.json(result);
});

productsRouter.post('/:id/duplicate', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await duplicateProduct(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  await purgeCache(c, ['/api/products']);
  return c.json(result);
});

export default productsRouter;
