/**
 * One-time script: upload existing local files to Vercel Blob and update the DB.
 *
 * Run AFTER setting TURSO_URL, TURSO_AUTH_TOKEN, and BLOB_READ_WRITE_TOKEN in .env.local:
 *   npx tsx scripts/migrate-uploads.ts
 */

import * as fs from "fs";
import * as path from "path";
// Load env vars before imports that need them
const envPath = path.join(process.cwd(), ".env.local");
if (require("fs").existsSync(envPath)) {
  for (const line of require("fs").readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  const { createClient } = await import("@libsql/client");
  const { put } = await import("@vercel/blob");

  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const result = await db.execute("SELECT id, file_path, original_filename FROM materials");
  const rows = result.rows as unknown as { id: string; file_path: string; original_filename: string }[];

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fp = row.file_path as string;

    // Already a URL — skip
    if (fp.startsWith("http://") || fp.startsWith("https://")) {
      skipped++;
      continue;
    }

    if (!fs.existsSync(fp)) {
      console.warn(`File not found, skipping: ${fp}`);
      skipped++;
      continue;
    }

    const buffer = fs.readFileSync(fp);
    const ext = path.extname(fp);
    const blobPath = `uploads/migrated/${row.id}${ext}`;

    console.log(`Uploading ${path.basename(fp)} → ${blobPath}`);
    const blob = await put(blobPath, buffer, { access: "public" });

    await db.execute({
      sql: "UPDATE materials SET file_path = ? WHERE id = ?",
      args: [blob.url, row.id],
    });

    migrated++;
  }

  console.log(`Done. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main().catch(console.error);
