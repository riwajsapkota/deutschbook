import { NextResponse } from "next/server";
import fs from "fs";
import { sessions, materials, exercises, attempts, reviewSchedules, chapters } from "@/lib/db";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.getById(id) as { status: string } | undefined;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  // Notes update
  if ("raw_notes" in body) {
    sessions.updateNotes(id, body.raw_notes ?? null);
    const updated = sessions.getById(id) as Record<string, unknown>;
    const mats = materials.getBySession(id);
    return NextResponse.json({ ...updated, materials: mats });
  }

  // Reset a session back to inbox so it can be re-processed
  const sessionExercises = exercises.getBySession(id);
  const exerciseIds = sessionExercises.map((e) => e.id);
  const affectedChapterIds = [...new Set(sessionExercises.map((e) => e.chapter_id))];
  attempts.deleteByExerciseIds(exerciseIds);
  reviewSchedules.deleteByExerciseIds(exerciseIds);
  exercises.deleteBySession(id);
  // Only delete chapters that are now completely exercise-less due to this session being reset
  for (const chapterId of affectedChapterIds) {
    const remaining = exercises.getByChapter(chapterId) as { id: string }[];
    if (remaining.length === 0) chapters.deleteById(chapterId);
  }
  materials.resetBySession(id);
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
