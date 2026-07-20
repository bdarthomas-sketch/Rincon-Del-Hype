import { Hono } from 'hono';
import type { Env, AdminUser } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError } from "../lib/errors";
import { logActivity } from "../lib/activity";
import { UpdateImageCompositionSchema } from "../lib/validate";
import { z } from "zod";

const UploadSchema = z.object({
  product_id: z.string().uuid(),
  alt_text: z.string().max(500).optional(),
  is_primary: z.boolean().optional(),
});

const CreateImageSchema = z.object({
  product_id: z.string().uuid(),
  url: z.string().url(),
  is_primary: z.boolean().optional(),
  alt_text: z.string().max(500).optional(),
});

const UpdateImageSchema = z.object({
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  image_mode: z.enum(['fit', 'cover']).optional(),
  image_scale: z.number().min(0.5).max(3.0).optional(),
  image_offset_x: z.number().min(-500).max(500).optional(),
  image_offset_y: z.number().min(-500).max(500).optional(),
  image_padding: z.number().int().min(0).max(25).optional(),
});

export async function uploadImage(env: Env, request: Request, adminInfo?: { id: string; role: string } | null) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const productId = formData.get("product_id") as string | null;
  const altText = (formData.get("alt_text") as string) || undefined;
  const isPrimary = formData.get("is_primary") === "true";

  if (!file) throw validationError("File is required");
  if (!productId) throw validationError("product_id is required");

  const allowedTypes = ["image/webp", "image/png", "image/jpeg", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    throw validationError(
      `Invalid file type. Allowed: ${allowedTypes.join(", ")}`
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    throw validationError("File size exceeds 10MB limit");
  }

  const supabase = getSupabase(env);

  // ── Check if auto_trim is enabled for this product ──
  let autoTrim = false;
  try {
    const { data: product } = await supabase
      .from("products")
      .select("auto_trim")
      .eq("id", productId)
      .single();
    autoTrim = product?.auto_trim === true;
  } catch {
    // si falla la consulta, asumir false
  }

  // ── Remove background via Cloudflare Images API ──
  let processedBlob: Blob;
  try {
    const imgResult = await env.IMAGES
      .input(file.stream() as ReadableStream<Uint8Array>)
      .transform({ segment: "foreground" })
      .output({ format: "image/png" });
    const imgResponse = await imgResult.response();
    processedBlob = await imgResponse.blob();
  } catch (imgError) {
    console.error("Images background removal failed, using original:", imgError);
    processedBlob = new Blob([await file.arrayBuffer()], { type: file.type });
  }

  // ── Trim + resize only if auto_trim is enabled ──
  let finalBlob = processedBlob;
  if (autoTrim) {
    try {
      const trimResult = await env.IMAGES
        .input(processedBlob.stream() as ReadableStream<Uint8Array>)
        .output({
          format: "image/png",
          width: 1200, height: 1200, fit: "pad",
          trim: { tolerance: 0 }, background: "rgba(0,0,0,0)",
        } as any);
      finalBlob = await (await trimResult.response()).blob();
    } catch (trimError) {
      console.error("Images trim/resize failed, using processed:", trimError);
    }
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const filePath = `${productId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, finalBlob, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  if (isPrimary) {
    await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId);
  }

  const { data: imageRecord, error: dbError } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url: imageUrl,
      path: filePath,
      alt_text: altText || null,
      is_primary: isPrimary,
      sort_order: 0,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "image",
      entityId: imageRecord.id,
      details: { product_id: productId },
    });
  }

  return { data: imageRecord };
}

export async function createImage(env: Env, body: unknown, adminInfo?: { id: string } | null) {
  const parsed = CreateImageSchema.parse(body);
  const supabase = getSupabase(env);

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", parsed.product_id)
    .single();

  if (!product) throw notFound("Product");

  if (parsed.is_primary) {
    await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", parsed.product_id);
  }

  const { data: imageRecord, error } = await supabase
    .from("product_images")
    .insert({
      product_id: parsed.product_id,
      url: parsed.url,
      alt_text: parsed.alt_text || null,
      is_primary: parsed.is_primary || false,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "image",
      entityId: imageRecord.id,
      details: { product_id: parsed.product_id },
    });
  }

  return { data: imageRecord };
}

export async function deleteImage(env: Env, id: string, adminInfo?: { id: string; role: string } | null) {
  const supabase = getSupabase(env);

  const { data: image, error: findError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !image) throw notFound("Image");

  const storagePath = image.path || extractPathFromUrl(image.url);

  try {
    await supabase.storage.from("product-images").remove([storagePath]);
  } catch {
    // Storage delete is best-effort
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "image",
      entityId: id,
      details: { product_id: image.product_id },
    });
  }

  return { data: { message: "Image deleted" } };
}

export async function updateImageComposition(
  env: Env,
  imageId: string,
  body: unknown,
  adminInfo?: { id: string; role: string } | null
) {
  const parsed = UpdateImageCompositionSchema.parse(body);
  const supabase = getSupabase(env);

  const { data: image, error: findError } = await supabase
    .from("product_images")
    .select("id, product_id")
    .eq("id", imageId)
    .single();

  if (findError || !image) throw notFound("Image");

  const updateData: Record<string, unknown> = {};
  if (parsed.image_mode !== undefined) updateData.image_mode = parsed.image_mode;
  if (parsed.image_scale !== undefined) updateData.image_scale = parsed.image_scale;
  if (parsed.image_offset_x !== undefined) updateData.image_offset_x = parsed.image_offset_x;
  if (parsed.image_offset_y !== undefined) updateData.image_offset_y = parsed.image_offset_y;
  if (parsed.image_padding !== undefined) updateData.image_padding = parsed.image_padding;

  if (Object.keys(updateData).length === 0) {
    return { data: { message: "No changes" } };
  }

  const { error: updateError } = await supabase
    .from("product_images")
    .update(updateData)
    .eq("id", imageId);

  if (updateError) throw updateError;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "image",
      entityId: imageId,
      details: { product_id: image.product_id, fields: Object.keys(updateData) },
    });
  }

  return { data: { message: "Composition updated" } };
}

export async function updateImage(env: Env, id: string, body: unknown, adminInfo?: { id: string } | null) {
  const parsed = UpdateImageSchema.parse(body);
  const supabase = getSupabase(env);

  const { data: image, error: findError } = await supabase
    .from("product_images")
    .select("id, product_id")
    .eq("id", id)
    .single();

  if (findError || !image) throw notFound("Image");

  const updateData: Record<string, unknown> = {};
  if (parsed.is_primary !== undefined) updateData.is_primary = parsed.is_primary;
  if (parsed.sort_order !== undefined) updateData.sort_order = parsed.sort_order;
  if (parsed.image_mode !== undefined) updateData.image_mode = parsed.image_mode;
  if (parsed.image_scale !== undefined) updateData.image_scale = parsed.image_scale;
  if (parsed.image_offset_x !== undefined) updateData.image_offset_x = parsed.image_offset_x;
  if (parsed.image_offset_y !== undefined) updateData.image_offset_y = parsed.image_offset_y;
  if (parsed.image_padding !== undefined) updateData.image_padding = parsed.image_padding;

  if (Object.keys(updateData).length === 0) {
    return { data: { message: "No changes" } };
  }

  if (parsed.is_primary) {
    await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", image.product_id)
      .neq("id", id);
  }

  const { error: updateError } = await supabase
    .from("product_images")
    .update(updateData)
    .eq("id", id);

  if (updateError) throw updateError;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "image",
      entityId: id,
      details: { product_id: image.product_id, fields: Object.keys(updateData) },
    });
  }

  return { data: { message: "Image updated" } };
}

const imagesRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

imagesRouter.post('/upload', async (c) => {
  const adminUser = c.get('adminUser');
  const result = await uploadImage(c.env, c.req.raw, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  return c.json(result, 201);
});

imagesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await createImage(c.env, body, adminUser ? { id: adminUser.id } : null);
  return c.json(result, 201);
});

imagesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const adminUser = c.get('adminUser');
  const result = await updateImage(c.env, id, body, adminUser ? { id: adminUser.id } : null);
  return c.json(result);
});

imagesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('adminUser');
  const result = await deleteImage(c.env, id, adminUser ? { id: adminUser.id, role: adminUser.role } : null);
  return c.json(result);
});

export default imagesRouter;

function extractPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    const idx = pathParts.indexOf("product-images");
    if (idx !== -1) {
      return pathParts.slice(idx + 1).join("/");
    }
  } catch {
    // ignore
  }
  return "";
}
