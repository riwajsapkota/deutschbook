import { NextResponse } from "next/server";
import { sessions, materials, exercises, attempts, reviewSchedules, chapters } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await sessions.getById(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mats = await materials.getBySession(id);
  return NextResponse.json({ ...session, materials: mats });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = (await sessions.getById(id)) as { status: string } | undefined;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  // Notes update
  if ("raw_notes" in body) {
    await sessions.updateNotes(id, body.raw_notes ?? null);
    const updated = (await sessions.getById(id)) as Record<string, unknown>;
    const mats = await materials.getBySession(id);
    return NextResponse.json({ ...updated, materials: mats });
  }

  // Reset a session back to inbox so it can be re-processed
  const sessionExercises = await exercises.getBySession(id);
  const exerciseIds = sessionExercises.map((e) => e.id);
  const affectedChapterIds = [...new Set(sessionExercises.map((e) => e.chapter_id))];
  await attempts.deleteByExerciseIds(exerciseIds);
  await reviewSchedules.deleteByExerciseIds(exerciseIds);
  await exercises.deleteBySession(id);
  // Only delete chapters that are now completely exercise-less due to this session being reset
  for (const chapterId of affectedChapterIds) {
    const remaining = (await exercises.getByChapter(chapterId)) as { id: string }[];
    if (remaining.length === 0) await chapters.deleteById(chapterId);
  }
  await materials.resetBySession(id);
  await sessions.updateStatus(id, "inbox");

  const updated = (await sessions.getById(id)) as Record<string, unknown>;
  const mats = await materials.getBySession(id);
  return NextResponse.json({ ...updated, materials: mats });
}

// Delete a session and all its associated data
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = (await sessions.getById(id)) as { status: string } | undefined;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade: review schedules → attempts → exercises → materials (files) → session
  const sessionExercises = await exercises.getBySession(id);
  const exerciseIds = sessionExercises.map((e) => e.id);
  await attempts.deleteByExerciseIds(exerciseIds);
  await reviewSchedules.deleteByExerciseIds(exerciseIds);
  await exercises.deleteBySession(id);

  // Best-effort file cleanup (local disk or Vercel Blob)
  const mats = await materials.getBySession(id);
  for (const mat of mats) {
    try {
      if (mat.file_path.startsWith("http://") || mat.file_path.startsWith("https://")) {
        const { del } = await import("@vercel/blob");
        await del(mat.file_path);
      } else {
        const { existsSync, unlinkSync } = await import("fs");
        if (existsSync(mat.file_path)) unlinkSync(mat.file_path);
      }
    } catch {
      // best-effort
    }
  }
  await materials.deleteBySession(id);
  await sessions.delete(id);

  return new NextResponse(null, { status: 204 });
}
