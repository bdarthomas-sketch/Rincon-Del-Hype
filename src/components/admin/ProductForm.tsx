import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  getProduct, createProduct, updateProduct,
  listCategories, listSizes, listBrands,
  type Category, type Size, type ProductDetail, type ImageRecord, type BrandRow,
} from "./api";
import { DragDropUpload } from "./DragDropUpload";
import { ImageCompositionEditor } from "./ImageCompositionEditor";
import { ProductPreview } from "./ProductPreview";
import { ArrowLeft, Save, AlertCircle, Check, ChevronDown } from "lucide-react";

export function ProductForm() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [allSizes, setAllSizes] = useState<Size[]>([]);
  const [allBrands, setAllBrands] = useState<BrandRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", brand: "",
    price: "", category_id: "",
    is_active: true, is_new: false, is_featured: false, sort_order: "",
    auto_trim: true, image_margin: 50,
    out_of_stock_message: "",
    out_of_stock_message_enabled: false,
  });
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [sizeStock, setSizeStock] = useState<Record<string, number>>({});
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [productId, setProductId] = useState<string | null>(id || null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([listCategories(), listSizes(), listBrands()])
      .then(([c, s, b]) => {
        if (cancelled) return;
        setCategories(c.data);
        setAllSizes(s.data);
        setAllBrands(b.data);
        if (id) {
          getProduct(token, id).then((r) => {
            if (cancelled) return;
            const d = r.data;
            setForm({
              name: d.name, brand: d.brand,
              price: String(d.price),
              category_id: d.category_id,
              is_active: d.is_active, is_new: d.is_new, is_featured: d.is_featured,
              sort_order: String(d.sort_order ?? 0),
              auto_trim: d.auto_trim ?? true,
              image_margin: d.image_margin ?? 50,
              out_of_stock_message: d.out_of_stock_message || "",
              out_of_stock_message_enabled: !!d.out_of_stock_message,
            });
            setImages((d.images || []).map((img: any, idx: number) => ({
              id: img.id,
              product_id: id,
              url: img.url,
              alt_text: img.alt_text,
              is_primary: img.is_primary,
              sort_order: idx,
              image_mode: img.image_mode,
              image_scale: img.image_scale,
              image_offset_x: img.image_offset_x,
              image_offset_y: img.image_offset_y,
              image_padding: img.image_padding,
            })));
            if (d.sizes && s.data.length > 0) {
              const ids: string[] = [];
              const stockMap: Record<string, number> = {};
              d.sizes.forEach((sz: { label: string; stock: number }) => {
                const found = s.data.find((x: { label: string; id: string }) => x.label === sz.label);
                if (found) {
                  ids.push(found.id);
                  stockMap[found.id] = sz.stock;
                }
              });
              setSelectedSizeIds(ids);
              setSizeStock(stockMap);
            }
          }).catch((e) => { if (!cancelled) setError(e.message); });
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setFormLoading(false); });
    return () => { cancelled = true; };
  }, [token, id]);

  function handleChange(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSize(sizeId: string) {
    setSelectedSizeIds((prev) =>
      prev.includes(sizeId) ? prev.filter((s) => s !== sizeId) : [...prev, sizeId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSaving(true);
    setSaveSuccess(false);
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload: Record<string, unknown> = {
        name: form.name,
        slug,
        brand: form.brand,
        price: parseFloat(form.price),
        category_id: form.category_id,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
        is_new: form.is_new,
        is_featured: form.is_featured,
        auto_trim: form.auto_trim,
        image_margin: form.image_margin,
        sizes: selectedSizeIds.map((id) => ({ size_id: id, stock: sizeStock[id] ?? 0 })),
        out_of_stock_message: form.out_of_stock_message || null,
      };

      if (isEdit) {
        await updateProduct(token, id!, payload);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        const result = await createProduct(token, payload);
        setProductId(result.data.id);
        setCreated(true);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const activeImage = images[activeImageIndex];

  const previewData = useMemo(() => ({
    name: form.name,
    brand: form.brand,
    category: categories.find((c) => c.id === form.category_id)?.name || "",
    price: form.price || "0",
    sizes: selectedSizeIds.map((sid) => allSizes.find((s) => s.id === sid)?.label || "").filter(Boolean),
    image: activeImage?.url || images[0]?.url || undefined,
    auto_trim: form.auto_trim,
    image_margin: form.image_margin,
    image_scale: activeImage?.image_scale ?? 1.0,
    image_offset_x: activeImage?.image_offset_x ?? 0,
    image_offset_y: activeImage?.image_offset_y ?? 0,
    image_mode: activeImage?.image_mode ?? 'fit',
    image_padding: activeImage?.image_padding ?? 0,
  }), [form, categories, selectedSizeIds, allSizes, images, activeImage]);

  function handleCompositionChange(state: {
    image_mode: string;
    image_scale: number;
    image_offset_x: number;
    image_offset_y: number;
    image_padding: number;
  }) {
    setImages((prev) => prev.map((img, i) =>
      i === activeImageIndex ? { ...img, ...state } : img
    ));
  }

  return (
    <div>
      {/* ── Sticky toolbar ── */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 -mt-4 md:-mt-6 pt-4 md:pt-6 pb-3 bg-background/80 backdrop-blur-md border-b border-border mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/products")}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="font-1 text-base sm:text-lg tracking-[0.15em] uppercase truncate">
              {isEdit ? "Editar" : "Nuevo"}<span className="hidden sm:inline"> Producto</span>
            </h1>
            {saveSuccess && (
              <span className="flex items-center gap-1 font-1 text-[10px] tracking-[0.15em] text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full animate-fade-in hidden sm:flex">
                <Check size={12} />
                Guardado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {created && (
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="font-1 text-[12px] sm:text-[13px] tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 min-h-[44px] inline-flex items-center"
              >
                Volver
              </button>
            )}
            {(isEdit || !created) && (
              <button
                type="submit"
                form="product-form"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-hype text-white font-1 text-[12px] sm:text-[13px] tracking-[0.2em] uppercase px-4 py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {saving ? (
                  <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {isEdit ? "Guardar" : created ? "Guardar cambios" : "Crear"}
              </button>
            )}
          </div>
        </div>
      </div>

      {formLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
        </div>
      )}

      {!formLoading && error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 mb-6 animate-fade-in">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <span className="font-1 text-[11px] text-destructive">{error}</span>
        </div>
      )}

      {!formLoading && (
        <form id="product-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left: form ── */}
            <div className="lg:col-span-2 space-y-5">
              {/* Info section */}
              <Section>
                <SectionTitle>Información</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Nombre"
                    value={form.name}
                    onChange={(v) => handleChange("name", v)}
                    required
                    placeholder="Ej: Nike Air Max 90"
                  />
                  <SelectField
                    label="Marca"
                    value={form.brand}
                    onChange={(v) => handleChange("brand", v)}
                    options={allBrands.map((b) => ({ value: b.name, label: b.name }))}
                    required
                    placeholder="Seleccionar…"
                  />
                  <SelectField
                    label="Categoría"
                    value={form.category_id}
                    onChange={(v) => handleChange("category_id", v)}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    required
                    placeholder="Seleccionar…"
                  />
                  <Field
                    label="Precio"
                    type="number"
                    value={form.price}
                    onChange={(v) => handleChange("price", v)}
                    required
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-wrap gap-6 pt-2">
                  <Toggle label="Activo" checked={form.is_active} onChange={(v) => handleChange("is_active", v)} />
                  <Toggle label="Nuevo ingreso" checked={form.is_new} onChange={(v) => handleChange("is_new", v)} />
                  <Toggle label="Mensaje personalizado" checked={!!form.out_of_stock_message_enabled} onChange={(v) => {
                    handleChange("out_of_stock_message_enabled", v);
                    if (!v) handleChange("out_of_stock_message", "");
                  }} />
                </div>
              </Section>

              {form.out_of_stock_message_enabled && (
                <div className="rounded-xl border border-border bg-surface-2 p-5">
                  <label className="font-1 text-[12px] sm:text-[13px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
                    Mensaje personalizado
                  </label>
                  <p className="font-3 text-[11px] text-muted-foreground/50  mt-1 mb-3">
                    Personalizá el mensaje que se mostrará cuando un producto se quede sin stock. Si lo dejás vacío, se usará la etiqueta "Sin stock".
                  </p>
                  <input
                    type="text"
                    value={form.out_of_stock_message}
                    onChange={(e) => handleChange("out_of_stock_message", e.target.value)}
                    placeholder="Ej: Reingreso la proxima semana"
                    className="w-full rounded-xl bg-surface-1 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/25 outline-none focus:border-hype/60 transition-colors"
                  />
                </div>
              )}

              {/* Sizes section */}
              <Section>
                <SectionTitle>Talles</SectionTitle>
                {allSizes.length === 0 ? (
                  <p className="font-1 text-[12px] sm:text-[13px] text-muted-foreground">No hay talles disponibles</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allSizes.map((s) => {
                      const active = selectedSizeIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSize(s.id)}
                          className={`px-4 py-2 rounded-xl text-[12px] sm:text-[13px] tracking-[0.15em] font-1 font-bold uppercase transition-all min-h-[44px] ${active
                            ? "bg-hype text-white shadow-[0_0_12px_-4px_var(--hype)]"
                            : "bg-surface-1 border border-border text-muted-foreground hover:text-foreground hover:border-hype/40"
                            }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* Stock inputs per selected size */}
              {selectedSizeIds.length > 0 && (
                <Section>
                  <SectionTitle>Stock por talle</SectionTitle>
                  <div className="flex flex-wrap gap-3">
                    {selectedSizeIds.map((sid) => {
                      const sz = allSizes.find((s) => s.id === sid);
                      if (!sz) return null;
                      return (
                        <div key={sid} className="flex items-center gap-2">
                          <span className="font-1 text-[12px] sm:text-[13px] tracking-[0.1em] text-foreground min-w-[24px]">
                            {sz.label}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={sizeStock[sid] ?? 0}
                            onChange={(e) =>
                              setSizeStock((prev) => ({
                                ...prev,
                                [sid]: Math.max(0, parseInt(e.target.value) || 0),
                              }))
                            }
                            className="w-16 rounded-lg bg-surface-1 border border-border px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-hype/60 font-mono text-center"
                          />
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Images section */}
              <Section>
                <SectionTitle>Imágenes</SectionTitle>
                {created && (
                  <p className="font-1 text-[12px] sm:text-[13px] text-muted-foreground/60 -mt-1">
                    Producto creado. Ya podés subir imágenes.
                  </p>
                )}
                <DragDropUpload
                  productId={productId}
                  images={images}
                  onImagesChange={setImages}
                  activeImageIndex={activeImageIndex}
                  onSelectImage={setActiveImageIndex}
                />
                {activeImage && (
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="font-1 text-[11px] sm:text-[12px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-3">
                      Composición de imagen
                    </p>
                    <ImageCompositionEditor
                      imageUrl={activeImage.url}
                      imageId={activeImage.id}
                      productId={productId || ""}
                      composition={{
                        image_mode: activeImage.image_mode ?? 'fit',
                        image_scale: activeImage.image_scale ?? 1.0,
                        image_offset_x: activeImage.image_offset_x ?? 0,
                        image_offset_y: activeImage.image_offset_y ?? 0,
                        image_padding: activeImage.image_padding ?? 0,
                      }}
                      onChange={handleCompositionChange}
                    />
                  </div>
                )}
              </Section>
            </div>

            {/* ── Right: preview ── */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-[88px]">
                <div className="hidden lg:block">
                  <ProductPreview data={previewData} />
                </div>
                <div className="lg:hidden mt-6">
                  <details className="rounded-xl border border-border bg-surface-2">
                    <summary className="font-1 text-[11px] sm:text-[12px] tracking-[0.2em] uppercase text-muted-foreground/50 cursor-pointer px-4 sm:px-5 py-2.5 sm:py-3 select-none min-h-[44px] flex items-center">
                      Vista previa del producto
                    </summary>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                      <ProductPreview data={previewData} />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Internal components ──

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-5 space-y-4">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="font-1 text-[11px] sm:text-[12px] tracking-[0.2em] uppercase text-muted-foreground/50">
      {children}
    </h2>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="font-1 text-[12px] sm:text-[13px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
        {label}{required && <span className="text-hype ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl bg-surface-1 border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/25 outline-none focus:border-hype/60 transition-colors"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="font-1 text-[12px] sm:text-[13px] tracking-[0.2em] uppercase text-muted-foreground block mb-2">
        {label}{required && <span className="text-hype ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-xl bg-surface-1 border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-hype/60 transition-colors appearance-none cursor-pointer"
        >
          <option value="">{placeholder || "Seleccionar…"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50" />
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-surface-1 rounded-full peer-checked:bg-hype peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all border border-border" />
      </div>
      <span className="font-1 text-[12px] sm:text-[13px] tracking-[0.1em] text-foreground">{label}</span>
    </label>
  );
}



