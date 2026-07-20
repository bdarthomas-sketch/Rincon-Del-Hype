import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  listBrands, createBrand, renameBrand, deleteBrand, mergeBrands,
  type BrandRow,
} from "./api";
import { Plus, Pencil, Trash2, Check, X, AlertCircle, Merge, Tags } from "lucide-react";

export function BrandsManager() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newForm, setNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [mergeBusy, setMergeBusy] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    listBrands(token)
      .then((res) => setBrands(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load() }, [token]);

  async function handleCreate() {
    if (!token || !newName.trim()) return;
    try {
      await createBrand(token, newName.trim());
      setNewName("");
      setNewForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear");
    }
  }

  async function handleRename(id: string) {
    if (!token || !editName.trim()) return;
    try {
      await renameBrand(token, id, editName.trim());
      setEditingId(null);
      setEditName("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al renombrar");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar marca "${name}"?`)) return;
    if (!token) return;
    try {
      await deleteBrand(token, id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function handleMerge() {
    if (!token || !mergeFrom || !mergeTo) return;
    if (mergeFrom === mergeTo) {
      setError("Seleccioná dos marcas diferentes");
      return;
    }
    const fromName = brands.find((b) => b.id === mergeFrom)?.name;
    const toName = brands.find((b) => b.id === mergeTo)?.name;
    if (!confirm(`¿Fusionar "${fromName}" → "${toName}"? Todos los productos se moverán a "${toName}".`)) return;
    setMergeBusy(true);
    try {
      await mergeBrands(token, mergeFrom, mergeTo);
      setMergeOpen(false);
      setMergeFrom("");
      setMergeTo("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al fusionar");
    } finally {
      setMergeBusy(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-[9px]">
        <div>
          <div className="font-1 font-black text-[15px] tracking-wide text-foreground leading-none">MARCAS</div>
          <div className="font-2 text-[10px] text-muted-foreground/50 mt-[3px]">Administrar marcas de productos</div>
        </div>
        <div className="flex gap-[7px]">
          <button
            onClick={() => setMergeOpen(true)}
            className="flex items-center gap-[5px] rounded-xl border border-white/8 bg-surface-2 text-muted-foreground hover:text-foreground font-1 font-bold text-[9px] tracking-wider px-[11px] py-[8px] cursor-pointer transition-all"
          >
            <Merge size={12} />
            FUSIONAR
          </button>
          <button
            onClick={() => { setNewForm(true); setNewName(""); }}
            className="flex items-center gap-[5px] bg-hype text-white border-none px-[13px] py-[8px] rounded-xl font-1 font-bold text-[9px] tracking-wider cursor-pointer hover:bg-hype/90"
          >
            <Plus size={12} />
            NUEVA
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-[11px] py-[7px] mb-[7px]">
          <AlertCircle size={12} className="text-destructive shrink-0" />
          <span className="font-1 text-[10px] text-destructive flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-destructive/60 hover:text-destructive text-[11px] leading-none">&times;</button>
        </div>
      )}

      {newForm && (
        <div className="bg-card border border-white/8 rounded-xl px-[11px] py-[11px] mb-[7px]">
          <div className="flex gap-[7px] items-end">
            <div className="flex-1">
              <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">NOMBRE</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Nike, Adidas, Supreme"
                className="w-full rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setNewForm(false); }}
                autoFocus
              />
            </div>
            <button onClick={handleCreate} className="rounded-xl bg-hype text-white px-[13px] py-[8px] font-1 font-bold text-[9px] tracking-wider hover:brightness-110 transition-all">
              <Check size={13} />
            </button>
            <button onClick={() => setNewForm(false)} className="rounded-xl bg-surface-1 border border-white/8 px-[11px] py-[8px] text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
        </div>
      ) : brands.length === 0 ? (
        <div className="bg-card border border-white/8 rounded-xl px-[13px] py-[13px] text-center">
          <Tags size={24} className="text-muted-foreground/30 mx-auto mb-[7px]" />
          <p className="font-1 font-bold text-[10px] tracking-wider text-muted-foreground/70">No hay marcas</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-white/8 rounded-xl px-2 sm:px-[13px] py-2 sm:py-[13px]">
          <table className="w-full sm:min-w-[320px] text-left">
            <thead>
              <tr className="font-1 text-[10px] sm:text-[11px] tracking-widest uppercase text-muted-foreground">
                <th className="px-0.5 sm:px-[10px] py-1 font-medium whitespace-nowrap">Nombre</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium hidden sm:table-cell text-left whitespace-nowrap">Slug</th>
                <th className="hidden sm:table-cell px-0.5 sm:px-[10px] py-1 font-medium text-center whitespace-nowrap">Prods.</th>
                <th className="px-0.5 sm:px-[10px] py-1 font-medium text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.03] transition-colors font-1 text-[12px] sm:text-[13px] group">
                  {editingId === b.id ? (
                    <td colSpan={4} className="px-0.5 sm:px-[10px] py-[8px]">
                      <div className="flex gap-[7px] items-center">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 rounded-lg bg-surface-1 border border-white/8 px-[9px] py-[5px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-1"
                          onKeyDown={(e) => { if (e.key === "Enter") handleRename(b.id); if (e.key === "Escape") { setEditingId(null); setEditName(""); } }}
                          autoFocus
                        />
                        <button onClick={() => handleRename(b.id)} className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-hype hover:bg-hype/10 transition-colors shrink-0">
                          <Check size={13} />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditName(""); }} className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-0.5 sm:px-[10px] py-[8px]">
                        <div className="flex items-center gap-2">
                          <span className="font-3 font-bold text-foreground truncate max-w-[78px] sm:max-w-[160px] block">{b.name}</span>
                          <span className="sm:hidden text-[10px] font-bold text-muted-foreground bg-white/[0.06] px-[6px] py-[1px] rounded-full whitespace-nowrap">{b.product_count ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-0.5 sm:px-[10px] py-[8px] text-muted-foreground hidden sm:table-cell">
                        <span className="font-mono text-[11px]">{b.slug}</span>
                      </td>
                      <td className="hidden sm:table-cell px-0.5 sm:px-[10px] py-[8px] text-center">
                        <span className="font-bold">{b.product_count ?? 0}</span>
                      </td>
                      <td className="px-0.5 sm:px-[10px] py-[8px] text-right">
                        <div className="flex items-center justify-end gap-0 sm:gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(b.id); setEditName(b.name); }}
                            className="min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors shrink-0"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.name)}
                            disabled={(b.product_count ?? 0) > 0}
                            className={`min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px] inline-flex items-center justify-center rounded-md transition-colors shrink-0 ${
                              (b.product_count ?? 0) > 0
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            }`}
                            title={(b.product_count ?? 0) > 0 ? "Tiene productos asociados. Fusioná primero." : "Eliminar"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Merge Modal */}
      {mergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMergeOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-surface-1 border border-border rounded-2xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
              <div className="font-1 font-bold text-[10px] tracking-wider text-muted-foreground">FUSIONAR MARCAS</div>
              <button
                onClick={() => setMergeOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="font-2 text-[10px] text-muted-foreground/70 mb-[9px]">
                Los productos de la marca origen pasarán a la marca destino. La marca origen se eliminará.
              </p>

              <div className="flex flex-col gap-[7px] mb-[9px]">
                <div>
                  <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">MARCA ORIGEN</label>
                  <select
                    value={mergeFrom}
                    onChange={(e) => setMergeFrom(e.target.value)}
                    className="w-full rounded-lg bg-surface-2 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-3"
                  >
                    <option value="">Seleccionar…</option>
                    {brands
                      .filter((b) => b.id !== mergeTo)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.product_count ?? 0} productos)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-1 font-bold text-[8px] tracking-widest text-muted-foreground block mb-[4px]">MARCA DESTINO</label>
                  <select
                    value={mergeTo}
                    onChange={(e) => setMergeTo(e.target.value)}
                    className="w-full rounded-lg bg-surface-2 border border-white/8 px-[9px] py-[6px] text-[11px] text-foreground outline-none focus:border-hype/60 transition-colors font-3"
                  >
                    <option value="">Seleccionar…</option>
                    {brands
                      .filter((b) => b.id !== mergeFrom)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.product_count ?? 0} productos)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-[7px] justify-end">
                <button
                  onClick={() => setMergeOpen(false)}
                  className="rounded-xl border border-white/8 bg-surface-2 text-muted-foreground font-1 font-bold text-[9px] tracking-wider px-[13px] py-[8px] hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMerge}
                  disabled={!mergeFrom || !mergeTo || mergeBusy}
                  className="flex items-center gap-[5px] rounded-xl bg-hype text-white font-1 font-bold text-[9px] tracking-wider px-[13px] py-[8px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mergeBusy ? (
                    <div className="size-[14px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Merge size={12} />
                  )}
                  Fusionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
