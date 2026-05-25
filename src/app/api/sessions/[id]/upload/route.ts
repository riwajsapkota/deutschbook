import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { sessions, materials } from "@/lib/db";
import { detectFileType } from "@/lib/file-processing";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "data", "uploads", id);
  mkdirSync(uploadDir, { recursive: true });

  const created = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const savedName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, savedName);
    writeFileSync(filePath, buffer);

    const matId = randomUUID();
    const fileType = detectFileType(file.name);

    materials.create({
      id: matId,
      session_id: id,
      file_path: filePath,
      file_type: fileType,
      original_filename: file.name,
    });

    created.push(materials.getBySession(id).find((m) => (m as { id: string }).id === matId));
  }

  return NextResponse.json({ uploaded: created }, { status: 201 });
}
