import { useState, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { uploadImage, deleteImage, type ImageRecord } from "./api";
import { Upload, X, Star, AlertCircle } from "lucide-react";

interface DragDropUploadProps {
  productId: string | null;
  images: ImageRecord[];
  onImagesChange: (images: ImageRecord[]) => void;
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
}

export function DragDropUpload({ productId, images, onImagesChange, activeImageIndex, onSelectImage }: DragDropUploadProps) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = useCallback(async (file: File) => {
    if (!token || !productId) return;
    setError("");
    setUploading(true);
    try {
      const result = await uploadImage(token, productId, file, undefined, images.length === 0);
      onImagesChange([...images, result.data]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }, [token, productId, images, onImagesChange]);

  async function handleSetPrimary(imageId: string) {
    if (!token) return;
    const updated = images.map((img) => ({
      ...img,
      is_primary: img.id === imageId,
    }));
    onImagesChange(updated);

    await fetch(
      `https://rincondelhype-api.bdarthomas.workers.dev/api/images/${imageId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_primary: true }),
      }
    ).catch(() => {});
  }

  async function handleDelete(imageId: string) {
    if (!token || !confirm("¿Eliminar esta imagen?")) return;
    try {
      await deleteImage(token, imageId);
      const newImages = images.filter((i) => i.id !== imageId);
      onImagesChange(newImages);
      if (activeImageIndex >= newImages.length) {
        onSelectImage(Math.max(0, newImages.length - 1));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 mb-4">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <span className="font-1 text-[10px] text-destructive">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
        {images.map((img, index) => (
          <div
            key={img.id}
            onClick={() => onSelectImage(index)}
            className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
              index === activeImageIndex
                ? "border-hype ring-2 ring-hype/30"
                : "border-border hover:border-hype/40"
            }`}
          >
            <img
              src={img.url}
              alt={img.alt_text || ""}
              className="size-full object-cover"
            />
            {img.is_primary && (
              <span className="absolute top-1.5 left-1.5 bg-hype text-white text-[7px] font-1 tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-md font-bold shadow-lg">
                Principal
              </span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              {!img.is_primary && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSetPrimary(img.id); }}
                  className="p-2 rounded-lg bg-white/15 hover:bg-white/30 backdrop-blur-sm transition-colors"
                  title="Marcar como principal"
                >
                  <Star size={14} className="text-white" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                className="p-2 rounded-lg bg-white/15 hover:bg-destructive/70 backdrop-blur-sm transition-colors"
                title="Eliminar"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>
        ))}

        <label
          onDragOver={productId ? handleDragOver : undefined}
          onDragLeave={productId ? handleDragLeave : undefined}
          onDrop={productId ? handleDrop : undefined}
          className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200 bg-surface-1 ${
            productId
              ? dragging
                ? "border-hype bg-hype/10 scale-[1.02] cursor-pointer"
                : "border-border hover:border-hype/60 cursor-pointer"
              : "border-border/30 cursor-not-allowed opacity-50"
          }`}
        >
          {uploading ? (
            <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
          ) : productId ? (
            <>
              <Upload size={20} className="text-muted-foreground/60" />
              <span className="font-1 text-[8px] tracking-[0.1em] text-muted-foreground/50 text-center leading-tight px-2">
                Soltá o seleccioná
              </span>
            </>
          ) : (
            <span className="font-1 text-[7px] tracking-[0.1em] text-muted-foreground/40 text-center leading-tight px-2">
              Guardá el producto para subir imágenes
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/webp,image/png,image/jpeg,image/avif"
            onChange={handleFileSelect}
            disabled={!productId}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
