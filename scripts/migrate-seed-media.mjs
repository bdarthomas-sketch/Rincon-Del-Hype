// Migrate seed media files from public/gallery/ to Supabase Storage
// Uses the REST API directly — no dependencies needed (Node 18+ fetch)
//
// Usage: node scripts/migrate-seed-media.mjs
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from worker/.dev.vars

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

// --- Config ---
const GALLERY_DIR = join(ROOT, "public", "gallery");
const ENV_FILE = join(ROOT, "worker", ".dev.vars");
const SUPABASE_PROJECT = "cyfkggbxvxbxpqijgtlm";
const BUCKET = "video-drops";

// --- Load env vars from .dev.vars ---
function loadEnv(path) {
  const text = readFileSync(path, "utf-8");
  const vars = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    let val = trimmed.slice(sep + 1).trim();
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[trimmed.slice(0, sep).trim()] = val;
  }
  return vars;
}

const env = loadEnv(ENV_FILE);
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in worker/.dev.vars");
  process.exit(1);
}

// --- Helpers ---
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function supabaseFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res;
}

async function uploadFile(storagePath, buffer, mimeType) {
  console.log(`  Uploading → ${storagePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });
  if (!res.ok) {
    const body = await res.text();
    // If it already exists (upsert not supported via REST, try PUT)
    if (res.status === 409) {
      console.log(`  Already exists, overwriting via PUT...`);
      const putRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: buffer,
      });
      if (!putRes.ok) {
        const putBody = await putRes.text();
        throw new Error(`PUT ${putRes.status}: ${putBody}`);
      }
      return;
    }
    throw new Error(`POST ${res.status}: ${body}`);
  }
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

// --- Main ---
async function main() {
  console.log("=== Migrate seed media to Supabase Storage ===\n");

  // 1. Find seed video_drops records
  console.log("1. Fetching seed video_drops records...");
  const dbRes = await supabaseFetch(
    `/rest/v1/video_drops?select=id,title,sort_order&order=sort_order.asc`
  );
  const records = await dbRes.json();
  console.log(`   Found ${records.length} records`);

  // Map by sort_order
  const seedRecords = records.filter((r) => r.title?.toLowerCase().includes("video drop"));
  if (seedRecords.length !== 3) {
    console.warn(`   Expected 3 records matching "Video Drop", got ${seedRecords.length}. Using sort_order 0,1,2 instead.`);
  }
  const bySort = Object.fromEntries(records.map((r) => [r.sort_order, r]));
  console.log(`   Records:`, bySort);

  // 2. Read gallery files
  console.log("\n2. Reading gallery files...");
  const files = readdirSync(GALLERY_DIR).filter((f) => f.endsWith(".webp") || f.endsWith(".mp4"));
  console.log(`   Found ${files.length} files`);
  const mimeMap = { webp: "image/webp", mp4: "video/mp4" };

  // 3. Migrate each record
  console.log("\n3. Uploading to Supabase Storage...");
  for (let sort = 0; sort < 3; sort++) {
    const record = bySort[sort];
    if (!record) {
      console.warn(`   ⚠ No record found for sort_order=${sort}, skipping`);
      continue;
    }
    const num = sort + 1;
    const thumbFile = `gallery-${num}.webp`;
    const videoFile = `gallery-${num}-preview.mp4`;

    console.log(`\n  [${num}/3] Record ${record.id} (sort_order=${sort})`);

    // Upload thumbnail
    const thumbPath = join(GALLERY_DIR, thumbFile);
    const thumbBuf = readFileSync(thumbPath);
    await uploadFile(
      `${record.id}/thumbnail.webp`,
      thumbBuf,
      "image/webp"
    );
    const thumbUrl = getPublicUrl(`${record.id}/thumbnail.webp`);

    // Upload video
    const videoPath = join(GALLERY_DIR, videoFile);
    const videoBuf = readFileSync(videoPath);
    await uploadFile(
      `${record.id}/preview.mp4`,
      videoBuf,
      "video/mp4"
    );
    const videoUrl = getPublicUrl(`${record.id}/preview.mp4`);

    // Update DB record
    console.log(`  Updating DB record...`);
    await supabaseFetch(`/rest/v1/video_drops?id=eq.${record.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        thumbnail_url: thumbUrl,
        video_url: videoUrl,
      }),
    });
    console.log(`  ✅ ${thumbUrl}`);
    console.log(`  ✅ ${videoUrl}`);
  }

  console.log("\n=== Migration complete ===");
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
