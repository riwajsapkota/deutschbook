import { NextResponse } from "next/server";
import fs from "fs";
import { sessions, materials, exercises, attempts, reviewSchedules } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mats = materials.getBySession(id);
  return NextResponse.json({ ...session, materials: mats });
}

// Reset a session back to inbox so it can be re-processed
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id) as { status: string } | undefined;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete exercises (and their attempts + schedules) generated from this session
  const exerciseIds = exercises.getBySession(id).map((e) => e.id);
  attempts.deleteByExerciseIds(exerciseIds);
  reviewSchedules.deleteByExerciseIds(exerciseIds);
  exercises.deleteBySession(id);

  // Reset material statuses to pending
  materials.resetBySession(id);

  // Put session back to inbox
  sessions.updateStatus(id, "inbox");

  const updated = sessions.getById(id) as Record<string, unknown>;
  const mats = materials.getBySession(id);
  return NextResponse.json({ ...updated, materials: mats });
}

// Delete a session and all its associated data
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id) as { status: string } | undefined;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Cascade: review schedules → attempts → exercises → materials (files) → session
  const exerciseIds = exercises.getBySession(id).map((e) => e.id);
  attempts.deleteByExerciseIds(exerciseIds);
  reviewSchedules.deleteByExerciseIds(exerciseIds);
  exercises.deleteBySession(id);

  // Delete uploaded files from disk
  const mats = materials.getBySession(id);
  for (const mat of mats) {
    try {
      if (fs.existsSync(mat.file_path)) fs.unlinkSync(mat.file_path);
    } catch {
      // best-effort file cleanup
    }
  }
  materials.deleteBySession(id);
  sessions.delete(id);

  return new NextResponse(null, { status: 204 });
}
