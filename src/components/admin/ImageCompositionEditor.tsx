import { useState, useCallback, useRef, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImageCompositionStyle } from "@/lib/image-composition";
import { updateImageComposition } from "./api";

interface ImageCompositionEditorProps {
  imageUrl: string;
  imageId: string;
  productId: string;
  composition: {
    image_mode: string;
    image_scale: number;
    image_offset_x: number;
    image_offset_y: number;
    image_padding: number;
  };
  onChange: (state: {
    image_mode: string;
    image_scale: number;
    image_offset_x: number;
    image_offset_y: number;
    image_padding: number;
  }) => void;
}

export function ImageCompositionEditor({
  imageUrl,
  imageId,
  productId,
  composition,
  onChange,
}: ImageCompositionEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>("");

  const { image_mode, image_scale, image_offset_x, image_offset_y, image_padding } = composition;
  const autoAdjust = image_mode === "fit";

  const debouncedSave = useCallback(
    (newComposition: typeof composition) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const key = JSON.stringify(newComposition);
      if (key === lastSavedRef.current) return;
      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          await updateImageComposition("", productId, imageId, newComposition);
          lastSavedRef.current = key;
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (e: unknown) {
          console.error("Error saving composition:", e);
          setSaveStatus("error");
        }
      }, 500);
    },
    [productId, imageId]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const updateAndSave = useCallback(
    (newState: Partial<typeof composition>) => {
      const newComposition = { ...composition, ...newState };
      onChange(newComposition);
      debouncedSave(newComposition);
    },
    [composition, onChange, debouncedSave]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (autoAdjust) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - image_offset_x, y: e.clientY - image_offset_y });
    },
    [autoAdjust, image_offset_x, image_offset_y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(-500, Math.min(500, e.clientX - dragStart.x));
      const newY = Math.max(-500, Math.min(500, e.clientY - dragStart.y));
      updateAndSave({ image_offset_x: newX, image_offset_y: newY });
    },
    [isDragging, dragStart, updateAndSave]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && !autoAdjust) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX - image_offset_x, y: touch.clientY - image_offset_y, dist: 0 };
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartRef.current = { x: 0, y: 0, dist: Math.sqrt(dx * dx + dy * dy) };
      }
    },
    [autoAdjust, image_offset_x, image_offset_y]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const newX = Math.max(-500, Math.min(500, touch.clientX - touchStartRef.current.x));
        const newY = Math.max(-500, Math.min(500, touch.clientY - touchStartRef.current.y));
        updateAndSave({ image_offset_x: newX, image_offset_y: newY });
      } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        const scaleDelta = (newDist - touchStartRef.current.dist) * 0.005;
        const newScale = Math.max(0.5, Math.min(3.0, image_scale + scaleDelta));
        updateAndSave({ image_scale: Math.round(newScale * 100) / 100 });
        touchStartRef.current.dist = newDist;
      }
    },
    [isDragging, image_scale, updateAndSave]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchStartRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (autoAdjust) return;
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.max(0.5, Math.min(3.0, image_scale + delta));
      updateAndSave({ image_scale: Math.round(newScale * 100) / 100 });
    },
    [autoAdjust, image_scale, updateAndSave]
  );

  const isManual = !autoAdjust;

  const imgStyle = getImageCompositionStyle({
    scale: image_scale,
    offsetX: image_offset_x,
    offsetY: image_offset_y,
    mode: autoAdjust ? 'fit' : 'cover',
    image_padding,
  });
  const isImgAbsolute = imgStyle.position === 'absolute';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoAdjust}
              onChange={(e) => {
                if (e.target.checked) {
                  updateAndSave({ image_mode: "fit", image_scale: 1, image_offset_x: 0, image_offset_y: 0 });
                } else {
                  updateAndSave({ image_mode: "cover" });
                }
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-1 rounded-full peer-checked:bg-hype peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all border border-border" />
          </div>
          <span className="font-1 text-[12px] sm:text-[13px] tracking-[0.1em] text-foreground">Ajuste automático</span>
        </label>
      </div>

      {isManual && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            ref={previewRef}
            className="relative shrink-0 w-full sm:w-[clamp(220px,40vw,420px)] aspect-square rounded-lg overflow-hidden bg-black/20 border border-border select-none"
            style={{ cursor: isManual ? (isDragging ? "grabbing" : "grab") : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
          <img
            src={imageUrl}
            alt="Preview"
            className={cn("pointer-events-none", !isImgAbsolute && "size-full")}
            style={imgStyle as React.CSSProperties}
            draggable={false}
          />
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-1 text-[11px] sm:text-[12px] tracking-[0.15em] uppercase text-muted-foreground/50">Zoom</span>
                <span className="font-1 text-[12px] sm:text-[13px] text-muted-foreground font-mono">{Math.round(image_scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={image_scale}
                onChange={(e) => updateAndSave({ image_scale: parseFloat(e.target.value) })}
                className="w-full accent-hype"
              />
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => updateAndSave({ image_offset_x: 0, image_offset_y: 0 })}
                className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] tracking-[0.1em] font-1 font-bold uppercase bg-surface-1 border border-border text-muted-foreground hover:text-foreground transition-all min-h-[44px] inline-flex items-center"
              >
                Centrar
              </button>
              <button
                type="button"
                onClick={() =>
                  updateAndSave({
                    image_scale: 1.0,
                    image_offset_x: 0,
                    image_offset_y: 0,
                    image_padding: 0,
                    image_mode: "fit",
                  })
                }
                className="px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] tracking-[0.1em] font-1 font-bold uppercase bg-surface-1 border border-border text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 min-h-[44px]"
              >
                <RotateCcw size={10} /> Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {!autoAdjust && (
        <div className="h-4 flex items-center">
          {saveStatus === "saving" && (
            <span className="font-1 text-[10px] sm:text-[11px] tracking-[0.1em] text-muted-foreground/50">Guardando...</span>
          )}
          {saveStatus === "saved" && (
            <span className="font-1 text-[8px] tracking-[0.1em] text-green-400">Guardado ✓</span>
          )}
          {saveStatus === "error" && (
            <span className="font-1 text-[8px] tracking-[0.1em] text-destructive">Error al guardar</span>
          )}
        </div>
      )}
    </div>
  );
}
