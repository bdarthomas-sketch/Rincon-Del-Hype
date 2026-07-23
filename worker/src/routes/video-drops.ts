import { Hono } from 'hono';
import type { Env, AdminUser, VideoDropRow } from "../types";
import { getSupabase } from "../lib/supabase";
import { notFound, validationError, unauthorized } from "../lib/errors";
import { getAdminInfo } from "../lib/auth";
import { logActivity } from "../lib/activity";
import {
  CreateVideoDropSchema,
  UpdateVideoDropSchema,
  ReorderVideoDropsSchema,
} from "../lib/validate";
import { purgeCache } from "../middleware/cache";

// ── Public ──

export async function listPublicVideoDrops(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("video_drops")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return { data: data as VideoDropRow[] };
}

export async function incrementClick(env: Env, id: string) {
  const supabase = getSupabase(env);

  const { data: existing } = await supabase
    .from("video_drops")
    .select("clicks")
    .eq("id", id)
    .single();

  if (!existing) throw notFound("VideoDrop");

  const currentClicks = existing.clicks || 0;

  const { error } = await supabase
    .from("video_drops")
    .update({ clicks: currentClicks + 1 })
    .eq("id", id);

  if (error) throw error;

  return { data: { ok: true } };
}

// ── Admin: List all ──

export async function listVideoDrops(env: Env) {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("video_drops")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return { data: data as VideoDropRow[] };
}

// ── Admin: Create (multipart) ──

export async function createVideoDrop(
  env: Env,
  request: Request,
  adminInfo?: { id: string } | null
) {
  const formData = await request.formData();
  const title = formData.get("title") as string | null;
  const youtubeUrl = formData.get("youtube_url") as string | null;
  const isNew = formData.get("is_new") === "true";
  const isActive = formData.get("is_active") !== "false";
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;

  if (!title?.trim()) throw validationError("Title is required");

  const supabase = getSupabase(env);

  // Create the DB record first to get an ID
  const { data: record, error: insertError } = await supabase
    .from("video_drops")
    .insert({
      title: title.trim(),
      youtube_url: youtubeUrl || null,
      is_new: isNew,
      is_active: isActive,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Upload files if provided
  let thumbnailUrl: string | null = null;
  let videoUrl: string | null = null;
  let originalUrl: string | null = null;

  const thumbnailFile = formData.get("thumbnail") as File | null;
  const videoFile = formData.get("video") as File | null;
  const originalFile = formData.get("original") as File | null;

  // Validar tamaños antes de subir
  if (thumbnailFile && thumbnailFile.size > 10 * 1024 * 1024) {
    throw validationError("La miniatura no puede superar los 10MB");
  }
  if (videoFile && videoFile.size > 50 * 1024 * 1024) {
    throw validationError("El video no puede superar los 50MB (límite de Supabase Storage)");
  }
  if (originalFile && originalFile.size > 100 * 1024 * 1024) {
    throw validationError("El archivo original no puede superar los 100MB");
  }

  const uploadPromises: Promise<void>[] = [];

  if (thumbnailFile) {
    uploadPromises.push(
      uploadFile(env, record.id, "thumbnail", thumbnailFile).then((url) => {
        thumbnailUrl = url;
      })
    );
  }

  if (videoFile) {
    uploadPromises.push(
      uploadFile(env, record.id, "preview", videoFile).then((url) => {
        videoUrl = url;
      })
    );
  }

  if (originalFile) {
    uploadPromises.push(
      uploadFile(env, record.id, "original", originalFile).then((url) => {
        originalUrl = url;
      })
    );
  }

  await Promise.all(uploadPromises);

  // Update record with file URLs
  if (thumbnailUrl || videoUrl || originalUrl) {
    const updateData: Record<string, string> = {};
    if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl;
    if (videoUrl) updateData.video_url = videoUrl;
    if (originalUrl) updateData.original_url = originalUrl;

    const { error: updateError } = await supabase
      .from("video_drops")
      .update(updateData)
      .eq("id", record.id);

    if (updateError) throw updateError;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "created",
      entity: "video_drop",
      entityId: record.id,
      entityName: record.title,
    });
  }

  const { data: final } = await supabase
    .from("video_drops")
    .select("*")
    .eq("id", record.id)
    .single();

  return { data: final as VideoDropRow };
}

// ── Admin: Update metadata ──

export async function updateVideoDrop(
  env: Env,
  id: string,
  body: unknown,
  adminInfo?: { id: string } | null
) {
  const parsed = UpdateVideoDropSchema.parse(body);
  const supabase = getSupabase(env);

  const { data: existing } = await supabase
    .from("video_drops")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw notFound("VideoDrop");

  const updateData: Record<string, unknown> = {};
  if (parsed.title !== undefined) updateData.title = parsed.title;
  if (parsed.youtube_url !== undefined) updateData.youtube_url = parsed.youtube_url || null;
  if (parsed.is_new !== undefined) updateData.is_new = parsed.is_new;
  if (parsed.is_active !== undefined) updateData.is_active = parsed.is_active;
  if (parsed.sort_order !== undefined) updateData.sort_order = parsed.sort_order;

  if (Object.keys(updateData).length === 0) {
    return { data: existing as VideoDropRow };
  }

  const { data, error } = await supabase
    .from("video_drops")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "video_drop",
      entityId: id,
      entityName: data.title,
      details: { fields: Object.keys(updateData) },
    });
  }

  return { data: data as VideoDropRow };
}

// ── Admin: Replace media (multipart) ──

export async function updateVideoDropMedia(
  env: Env,
  id: string,
  request: Request,
  adminInfo?: { id: string } | null
) {
  const supabase = getSupabase(env);

  const { data: existing } = await supabase
    .from("video_drops")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw notFound("VideoDrop");

  const formData = await request.formData();
  const updateData: Record<string, string | null> = {};
  const uploadPromises: Promise<void>[] = [];

  const thumbnailFile = formData.get("thumbnail") as File | null;
  const videoFile = formData.get("video") as File | null;
  const originalFile = formData.get("original") as File | null;

  // Validar tamaños
  if (thumbnailFile && thumbnailFile.size > 10 * 1024 * 1024) {
    throw validationError("La miniatura no puede superar los 10MB");
  }
  if (videoFile && videoFile.size > 50 * 1024 * 1024) {
    throw validationError("El video no puede superar los 50MB (límite de Supabase Storage)");
  }
  if (originalFile && originalFile.size > 100 * 1024 * 1024) {
    throw validationError("El archivo original no puede superar los 100MB");
  }

  if (thumbnailFile) {
    uploadPromises.push(
      uploadFile(env, id, "thumbnail", thumbnailFile).then((url) => {
        updateData.thumbnail_url = url;
      })
    );
  }

  if (videoFile) {
    uploadPromises.push(
      uploadFile(env, id, "preview", videoFile).then((url) => {
        updateData.video_url = url;
      })
    );
  }

  if (originalFile) {
    uploadPromises.push(
      uploadFile(env, id, "original", originalFile).then((url) => {
        updateData.original_url = url;
      })
    );
  }

  if (uploadPromises.length === 0) {
    return { data: existing as VideoDropRow };
  }

  await Promise.all(uploadPromises);

  const { data, error } = await supabase
    .from("video_drops")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "video_drop",
      entityId: id,
      entityName: data.title,
      details: { media_fields: Object.keys(updateData) },
    });
  }

  return { data: data as VideoDropRow };
}

// ── Admin: Reorder ──

export async function reorderVideoDrops(
  env: Env,
  body: unknown,
  adminInfo?: { id: string } | null
) {
  const parsed = ReorderVideoDropsSchema.parse(body);
  const supabase = getSupabase(env);

  const promises = parsed.items.map((item) =>
    supabase
      .from("video_drops")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
  );

  const results = await Promise.all(promises);

  for (const result of results) {
    if (result.error) throw result.error;
  }

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "reordered",
      entity: "video_drop",
      entityId: "batch",
      details: { count: parsed.items.length },
    });
  }

  return { data: { message: "Reordered" } };
}

// ── Admin: Clear media (keep record, remove files + URLs) ──

export async function clearVideoDropMedia(
  env: Env,
  id: string,
  adminInfo?: { id: string } | null
) {
  const supabase = getSupabase(env);

  const { data: record } = await supabase
    .from("video_drops")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) throw notFound("VideoDrop");

  // Borrar solo archivos de video de Storage — miniatura se conserva
  try {
    const filesToDelete: string[] = [];
    for (const url of [record.video_url, record.original_url]) {
      if (url) {
        const path = extractStoragePath(url);
        if (path) filesToDelete.push(path);
      }
    }
    if (filesToDelete.length > 0) {
      await supabase.storage.from("video-drops").remove(filesToDelete);
    }
  } catch {
    // best-effort
  }

  // Limpiar solo URLs de video — la miniatura se reemplaza aparte
  const { data, error } = await supabase
    .from("video_drops")
    .update({ video_url: null, original_url: null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "updated",
      entity: "video_drop",
      entityId: id,
      entityName: record.title,
      details: { media_cleared: true },
    });
  }

  return { data: data as VideoDropRow };
}

// ── Admin: Delete ──

export async function deleteVideoDrop(
  env: Env,
  id: string,
  adminInfo?: { id: string } | null
) {
  const supabase = getSupabase(env);

  const { data: record } = await supabase
    .from("video_drops")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) throw notFound("VideoDrop");

  // Clean up storage files
  try {
    const filesToDelete: string[] = [];
    if (record.thumbnail_url) {
      const thumbPath = extractStoragePath(record.thumbnail_url);
      if (thumbPath) filesToDelete.push(thumbPath);
    }
    if (record.video_url) {
      const videoPath = extractStoragePath(record.video_url);
      if (videoPath) filesToDelete.push(videoPath);
    }
    if (record.original_url) {
      const origPath = extractStoragePath(record.original_url);
      if (origPath) filesToDelete.push(origPath);
    }

    if (filesToDelete.length > 0) {
      await supabase.storage.from("video-drops").remove(filesToDelete);
    }
  } catch {
    // Storage cleanup is best-effort
  }

  const { error } = await supabase
    .from("video_drops")
    .delete()
    .eq("id", id);

  if (error) throw error;

  if (adminInfo) {
    await logActivity(env, {
      adminId: adminInfo.id,
      action: "deleted",
      entity: "video_drop",
      entityId: id,
      entityName: record.title,
    });
  }

  return { data: { message: "VideoDrop deleted" } };
}

// ── Helpers ──

async function uploadFile(
  env: Env,
  recordId: string,
  type: "thumbnail" | "preview" | "original",
  file: File
): Promise<string> {
  // Detect extension from MIME type
  const extMap: Record<string, string> = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  const ext = extMap[file.type] || file.name.split(".").pop() || "bin";
  const fileName = `${type}.${ext}`;
  const filePath = `${recordId}/${fileName}`;

  const supabase = getSupabase(env);

  const { error } = await supabase.storage
    .from("video-drops")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("video-drops")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

function extractStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    const idx = pathParts.indexOf("video-drops");
    if (idx !== -1) {
      return pathParts.slice(idx + 1).join("/");
    }
  } catch {
    // ignore
  }
  return null;
}

const videoDropsRouter = new Hono<{ Bindings: Env; Variables: { adminUser?: AdminUser } }>();

// Public + Admin: GET / returns public list or admin list based on auth
videoDropsRouter.get('/', async (c) => {
  const adminUser = c.get('adminUser');
  if (adminUser) {
    return c.json(await listVideoDrops(c.env));
  }
  return c.json(await listPublicVideoDrops(c.env));
});

// Public: POST /:id/click
videoDropsRouter.post('/:id/click', async (c) => {
  const id = c.req.param('id');
  const result = await incrementClick(c.env, id);
  return c.json(result);
});

// Admin: POST / (create with multipart)
videoDropsRouter.post('/', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const result = await createVideoDrop(c.env, c.req.raw, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result, 201);
});

// Admin: PUT /reorder
videoDropsRouter.put('/reorder', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const body = await c.req.json();
  const result = await reorderVideoDrops(c.env, body, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result);
});

// Admin: PUT /:id/media (multipart)
videoDropsRouter.put('/:id/media', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const id = c.req.param('id');
  const result = await updateVideoDropMedia(c.env, id, c.req.raw, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result);
});

// Admin: PUT /:id/clear-media
videoDropsRouter.put('/:id/clear-media', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const id = c.req.param('id');
  const result = await clearVideoDropMedia(c.env, id, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result);
});

// Admin: PUT /:id (metadata)
videoDropsRouter.put('/:id', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await updateVideoDrop(c.env, id, body, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result);
});

// Admin: DELETE /:id
videoDropsRouter.delete('/:id', async (c) => {
  const adminUser = await getAdminInfo(c.env, c.req.raw);
  if (!adminUser) throw unauthorized();
  const id = c.req.param('id');
  const result = await deleteVideoDrop(c.env, id, { id: adminUser.id });
  await purgeCache(c, ['/api/video-drops']);
  return c.json(result);
});

export default videoDropsRouter;
