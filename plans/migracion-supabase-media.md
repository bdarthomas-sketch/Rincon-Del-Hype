# Migración: toda imagen/video a Supabase Storage ✅ COMPLETADA

## Propósito
Migrar todos los seed media de VideoDrops desde rutas locales a Supabase Storage.

---

## ✅ Paso 1: Script de migración — COMPLETADO

`scripts/migrate-seed-media.mjs` leyó los 6 archivos de `public/gallery/` y los subió a Storage:

| Archivo | Destino Storage | Tamaño |
|---------|----------------|--------|
| gallery-1.webp | `{uuid-0}/thumbnail.webp` | 127 KB |
| gallery-1-preview.mp4 | `{uuid-0}/preview.mp4` | 227 KB |
| gallery-2.webp | `{uuid-1}/thumbnail.webp` | 143 KB |
| gallery-2-preview.mp4 | `{uuid-1}/preview.mp4` | 408 KB |
| gallery-3.webp | `{uuid-2}/thumbnail.webp` | 66 KB |
| gallery-3-preview.mp4 | `{uuid-2}/preview.mp4` | 337 KB |

### UUIDs en DB:
| sort_order | id | título |
|-----------|-----|--------|
| 0 | `afdf9732-42d0-4a50-a5cd-b96047e47b4f` | Mistery Box a MIKE SOUTHSIDE |
| 1 | `9eb9e7b3-4523-4d6c-b7d7-d13b8ad4fabb` | Como es el SNEAKERCON de ARGENTINA |
| 2 | `82147438-9677-40ab-b648-bbae0e141231` | ¡¡ VISTIENDO A KAYDY CAIN para su SHOW !! |

---

## ✅ Paso 2: Frontend actualizado — COMPLETADO

`src/components/site/HypeGallery.tsx`:
- `FALLBACK_ITEMS` ahora usa URLs de Storage en vez de `/gallery/` local
- `mapToGalleryItem()` defaults también apuntan a Storage
- Las imágenes importadas (`g1, g2, g3`) se mantienen como fallback de build

---

## ✅ Paso 3: Migration SQL actualizada — COMPLETADO

`supabase/migrations/023_video_drops.sql`:
- Títulos actualizados a los reales (ya no placeholder "Video Drop N")
- Agregado `UPDATE` después del `INSERT` que construye las URLs de Storage usando los UUIDs auto-generados

---

## Archivos creados/modificados
- `scripts/migrate-seed-media.mjs` — script de migración (nuevo, mantenido para re-seed)
- `supabase/migrations/023_video_drops.sql` — seed data actualizada con Storage URLs
- `src/components/site/HypeGallery.tsx` — fallbacks apuntan a Storage

## Pendiente
- [ ] Decidir si eliminar `public/gallery/` y `src/assets/gallery/` (ahora redundantes)
