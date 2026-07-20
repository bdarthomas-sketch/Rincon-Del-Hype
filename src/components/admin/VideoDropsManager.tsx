import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  listVideoDrops, createVideoDrop, updateVideoDrop,
  updateVideoDropMedia, deleteVideoDrop, clearVideoDropMedia,
  reorderVideoDrops, type VideoDrop,
} from "./api";
import { generateThumbnail, generatePreview } from "@/lib/process-media";
import { StatusBadge } from "./StatusBadge";
import {
  Plus, Pencil, Trash2, X, AlertCircle, Film,
  Play, Upload, Image as ImageIcon,
} from "lucide-react";

export function VideoDropsManager() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<VideoDrop[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [existingMedia, setExistingMedia] = useState(false);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalVideos = videos.length;
  const activeVideos = videos.filter((v) => v.is_active).length;
  const totalClicks = videos.reduce((sum, v) => sum + v.clicks, 0);

  function load() {
    if (!token) return;
    setLoading(true);
    listVideoDrops(token)
      .then((res) => setVideos(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load() }, [token]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setYoutubeUrl("");
    setIsActive(true);
    setIsNew(false);
    setThumbnailFile(null);
    setVideoFile(null);
    setThumbnailPreview(null);
    setVideoPreview(null);
    setExistingMedia(false);
    setFormOpen(false);
  }

  function startEdit(v: VideoDrop) {
    setEditingId(v.id);
    setTitle(v.title);
    setYoutubeUrl(v.youtube_url || "");
    setIsActive(v.is_active);
    setIsNew(v.is_new);
    setThumbnailFile(null);
    setVideoFile(null);
    setThumbnailPreview(v.thumbnail_url ? getProxyUrl(v.thumbnail_url) : null);
    setVideoPreview(v.video_url ? getProxyUrl(v.video_url) : null);
    setExistingMedia(!!(v.thumbnail_url || v.video_url));
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getProxyUrl(url: string): string {
    if (url.startsWith("http")) return url;
    // Relative URLs like /gallery/gallery-1.webp
    return url;
  }

  // Handle thumbnail file selection
  const handleThumbnailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }, []);

  // Handle video file selection — auto-generate thumbnail + compressed preview
  const handleVideoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);

    try {
      // Generar preview comprimido (MediaRecorder, ~500kbps, 5s)
      const previewBlob = await generatePreview(file);
      if (previewBlob) {
        const previewFile = new File([previewBlob], "preview.webm", { type: previewBlob.type });
        setVideoFile(previewFile);
        setVideoPreview(URL.createObjectURL(previewBlob));
      } else {
        // Fallback: usar el original si no se pudo comprimir
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      }

      // Auto-generate thumbnail from video (only for new videos, no custom thumbnail)
      if (!editingId && !thumbnailFile) {
        const thumbBlob = await generateThumbnail(file);
        const thumbFile = new File([thumbBlob], "thumbnail.webp", { type: "image/webp" });
        setThumbnailFile(thumbFile);
        setThumbnailPreview(URL.createObjectURL(thumbBlob));
      }
    } catch (err) {
      console.error("Failed to process video:", err);
    } finally {
      setProcessing(false);
    }
  }, [thumbnailFile, editingId]);

  async function handleClearMedia() {
    if (!token || !editingId) return;
    if (!confirm("¿Quitar el video actual? La miniatura se conserva.")) return;
    setSaving(true);
    try {
      await clearVideoDropMedia(token, editingId);
      setExistingMedia(false);
      setThumbnailFile(null);
      setVideoFile(null);
      setThumbnailPreview(null);
      setVideoPreview(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al quitar media");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!token || !title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        // Update metadata
        const data: Record<string, unknown> = {
          title: title.trim(),
          youtube_url: youtubeUrl || "",
          is_active: isActive,
          is_new: isNew,
        };
        await updateVideoDrop(token, editingId, data);

        // Update media if new files
        const mediaFiles: { thumbnail?: File; video?: File; original?: File } = {};
        if (thumbnailFile && thumbnailPreview && !thumbnailPreview.startsWith("/gallery/")) {
          mediaFiles.thumbnail = thumbnailFile;
        }
        if (videoFile) {
          mediaFiles.video = videoFile;
        }

        if (Object.keys(mediaFiles).length > 0) {
          await updateVideoDropMedia(token, editingId, mediaFiles);
        }
      } else {
        // Create with files
        const data: {
          title: string;
          youtube_url?: string;
          is_new: boolean;
          is_active: boolean;
          thumbnail?: File | null;
          video?: File | null;
        } = {
          title: title.trim(),
          youtube_url: youtubeUrl || undefined,
          is_new: isNew,
          is_active: isActive,
        };

        if (thumbnailFile) data.thumbnail = thumbnailFile;
        if (videoFile) data.video = videoFile;

        await createVideoDrop(token, data);
      }

      resetForm();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error saving video");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: VideoDrop) {
    if (!confirm(`¿Eliminar "${v.title}"?`)) return;
    if (!token) return;
    try {
      await deleteVideoDrop(token, v.id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-[9px]">
        <div>
          <div className="font-1 font-black text-[15px] tracking-wide text-foreground leading-none">VIDEOS</div>
          <div className="font-2 text-[10px] text-muted-foreground/50 mt-[3px]">Administrar galería de videos</div>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="flex items-center gap-[5px] bg-hype text-white border-none px-[13px] py-[8px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:bg-hype/90"
        >
          {editingId ? <X size={12} /> : <Plus size={12} />}
          {editingId ? "CANCELAR" : "NUEVO VIDEO"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-[11px] py-[7px] mb-[7px]">
          <AlertCircle size={12} className="text-destructive shrink-0" />
          <span className="font-1 text-[10px] text-destructive flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-destructive/60 hover:text-destructive text-[11px] leading-none">&times;</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-[7px] mb-[7px]">
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[11px]">
          <div className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground mb-[4px]">Total videos</div>
          <div className="font-1 font-black text-[18px] text-foreground">{totalVideos}</div>
        </div>
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[11px]">
          <div className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground mb-[4px]">Activos</div>
          <div className="font-1 font-black text-[18px] text-hype">{activeVideos}</div>
        </div>
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[11px]">
          <div className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground mb-[4px]">Clicks totales</div>
          <div className="font-1 font-black text-[18px] text-foreground">{totalClicks.toLocaleString()}</div>
        </div>
      </div>

      {/* Form Card */}
      {(formOpen || editingId || title || videoFile || thumbnailFile) && (
        <div className="bg-card border border-white/8 rounded-xl px-[14px] py-[14px] mb-[7px]">
          <div className="flex items-center gap-[6px] mb-[12px] pb-[10px] border-b border-white/8">
            <Film size={12} className="text-hype" />
            <span className="font-1 font-bold text-[8px] tracking-widest text-hype uppercase">
              {editingId ? "EDITAR VIDEO" : "AGREGAR VIDEO"}
            </span>
          </div>

          <div className="grid grid-cols-[128px_1fr] gap-[14px] items-start">
            {/* Upload zones */}
            <div className="flex flex-col gap-[7px]">
              {/* Thumbnail dropzone */}
              <div>
                <div className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground mb-[4px]">MINIATURA</div>
                <div
                  onClick={() => thumbInputRef.current?.click()}
                  className="relative bg-surface-1 border border-dashed border-white/8 rounded-lg w-[128px] h-[72px] flex flex-col items-center justify-center gap-[3px] cursor-pointer hover:border-hype/60 transition-colors overflow-hidden"
                >
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon size={18} className="text-muted-foreground/40" />
                      <span className="text-[7px] text-muted-foreground/40 text-center leading-tight">
                        1280×720 px<br />JPG · PNG · WEBP
                      </span>
                    </>
                  )}
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/webp,image/png,image/jpeg"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                  {thumbnailPreview && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] font-1 font-bold text-white">CAMBIAR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Video upload */}
              <div>
                <div className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground mb-[4px]">VIDEO</div>
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="relative bg-surface-1 border border-dashed border-white/8 rounded-lg w-[128px] h-[72px] flex flex-col items-center justify-center gap-[3px] cursor-pointer hover:border-hype/60 transition-colors overflow-hidden"
                >
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      className="absolute inset-0 size-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <>
                      <Upload size={18} className="text-muted-foreground/40" />
                      <span className="text-[7px] text-muted-foreground/40 text-center leading-tight">
                        MP4 · WebM<br />Auto-genera preview
                      </span>
                    </>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleVideoChange}
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="size-[18px] border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-[9px]">
              <div>
                <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">
                  TÍTULO DEL VIDEO
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Air Jordan 1 Retro High OG — Review completa"
                  className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[7px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") resetForm(); }}
                  autoFocus
                />
              </div>
              <div>
                <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">
                  LINK YOUTUBE
                </label>
                <div className="flex items-center gap-[7px] rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[7px]">
                  <Play size={14} className="text-hype shrink-0" />
                  <input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-transparent border-none text-[11px] text-foreground outline-none w-full font-1 min-w-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-[16px] flex-wrap">
                <div className="flex items-center gap-[7px]">
                  <span className="font-1 font-bold text-[8px] tracking-wider text-muted-foreground uppercase">Activo</span>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`w-[32px] h-[17px] rounded-[9px] relative transition-colors shrink-0 ${isActive ? 'bg-hype' : 'bg-surface-2 border border-white/8'}`}
                  >
                    <div
                      className={`w-[13px] h-[13px] rounded-full bg-white absolute top-[2px] transition-all ${isActive ? 'right-[2px]' : 'left-[2px]'}`}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-[7px]">
                  <span className="font-1 font-bold text-[8px] tracking-wider text-muted-foreground uppercase">Nuevo</span>
                  <button
                    onClick={() => setIsNew(!isNew)}
                    className={`w-[32px] h-[17px] rounded-[9px] relative transition-colors shrink-0 ${isNew ? 'bg-hype' : 'bg-surface-2 border border-white/8'}`}
                  >
                    <div
                      className={`w-[13px] h-[13px] rounded-full bg-white absolute top-[2px] transition-all ${isNew ? 'right-[2px]' : 'left-[2px]'}`}
                    />
                  </button>
                </div>
                {editingId && existingMedia && (
                  <button
                    onClick={handleClearMedia}
                    disabled={saving}
                    className="flex items-center gap-[5px] rounded-xl border border-white/8 bg-surface-2 text-muted-foreground hover:text-foreground font-1 font-bold text-[9px] tracking-wider px-[11px] py-[8px] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    QUITAR VIDEO
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="bg-hype text-white border-none px-[14px] py-[7px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="flex items-center gap-[5px]">
                      <div className="size-[12px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      GUARDANDO
                    </div>
                  ) : (
                    "GUARDAR VIDEO"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px] text-center">
          <Film size={24} className="text-muted-foreground/30 mx-auto mb-[7px]" />
          <p className="font-1 font-bold text-[10px] tracking-wider text-muted-foreground/70">No hay videos</p>
          <p className="font-2 text-[9px] text-muted-foreground/40 mt-[3px]">Agregá tu primer video para verlo en la galería</p>
        </div>
      ) : (
        <div className="bg-card border border-white/8 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="px-[14px] py-[9px] border-b border-white/8 bg-surface-1/50 flex items-center justify-between">
            <span className="font-1 font-bold text-[8px] tracking-widest text-hype uppercase flex items-center gap-[5px]">
              <Film size={11} />
              Videos publicados
            </span>
            <span className="font-1 text-[9px] text-muted-foreground/50">{videos.length} registros</span>
          </div>

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[58px_minmax(0,2fr)_minmax(0,1fr)_80px_44px_72px] gap-x-4 px-[14px] py-[6px] border-b border-white/8 bg-surface-1/30">
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase">Thumb</span>
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase">Título</span>
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase truncate">Link</span>
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase text-center">Clicks</span>
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase text-center">Estado</span>
            <span className="font-1 text-[8px] tracking-widest text-muted-foreground/50 uppercase text-center">Acción</span>
          </div>

          {/* Rows */}
          {videos.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[58px_1fr_auto] sm:grid-cols-[58px_minmax(0,2fr)_minmax(0,1fr)_80px_44px_72px] gap-x-4 px-[14px] py-[9px] border-b border-white/8 last:border-b-0 items-center hover:bg-white/[0.02] transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-[50px] h-[28px] rounded-md bg-surface-1 border border-white/8 overflow-hidden shrink-0 flex items-center justify-center">
                {v.thumbnail_url ? (
                  <img
                    src={getProxyUrl(v.thumbnail_url)}
                    alt={v.title}
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-muted-foreground/40 text-[9px] font-1">N/A</div>';
                    }}
                  />
                ) : (
                  <Film size={12} className="text-muted-foreground/40" />
                )}
              </div>

              {/* Title */}
              <div className="min-w-0">
                <div className="flex items-center gap-[5px]">
                  <span className="sm:hidden"><StatusBadge isActive={v.is_active} /></span>
                  <span className="font-1 text-[11px] text-foreground font-medium truncate">{v.title}</span>
                </div>
                <div className="font-2 text-[8px] text-muted-foreground/50 sm:hidden">{relativeTime(v.created_at)}</div>
              </div>

              {/* Link (hidden on mobile) */}
              <div className="hidden sm:block text-[9px] text-muted-foreground/60 truncate">
                {v.youtube_url ? (
                  <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:text-hype transition-colors truncate block">
                    {v.youtube_url.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </div>

              {/* Clicks */}
              <div className="hidden sm:flex items-center justify-center">
                <div className="font-1 text-[11px] text-foreground font-medium">{v.clicks}</div>
              </div>

              {/* Status */}
              <div className="hidden sm:flex items-center justify-center">
                <StatusBadge isActive={v.is_active} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-[0px] justify-center">
                <button
                  onClick={() => startEdit(v)}
                  className="size-[28px] sm:size-[32px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                  title="Editar"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(v)}
                  className="size-[28px] sm:size-[32px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
