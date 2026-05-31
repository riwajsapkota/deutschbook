import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { sessions, materials } from "@/lib/db";
import { detectFileType } from "@/lib/file-processing";

// Use Vercel Blob when configured, otherwise fall back to local disk (dev only)
async function storeFile(
  buffer: Buffer,
  sessionId: string,
  originalName: string
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const ext = path.extname(originalName);
    const blobPath = `uploads/${sessionId}/${randomUUID()}${ext}`;
    const blob = await put(blobPath, buffer, { access: "public" });
    return blob.url;
  }

  // Local dev fallback: save to disk
  const { writeFileSync, mkdirSync } = await import("fs");
  const uploadDir = path.join(process.cwd(), "data", "uploads", sessionId);
  mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(originalName);
  const savedName = `${randomUUID()}${ext}`;
  const filePath = path.join(uploadDir, savedName);
  writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const created = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await storeFile(buffer, id, file.name);

    const matId = randomUUID();
    const fileType = detectFileType(file.name);

    await materials.create({
      id: matId,
      session_id: id,
      file_path: filePath,
      file_type: fileType,
      original_filename: file.name,
    });

    const allMats = await materials.getBySession(id);
    created.push(allMats.find((m) => m.id === matId));
  }

  return NextResponse.json({ uploaded: created }, { status: 201 });
}
