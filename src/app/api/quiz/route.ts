import { NextResponse } from "next/server";
import { reviewSchedules } from "@/lib/db";
import { Exercise } from "@/types";

interface DueExercise extends Omit<Exercise, "items"> {
  items: string;
  chapter_title: string;
  category: string;
  level: string;
  next_review_at: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapter_id");

  const now = new Date().toISOString();
  let due = reviewSchedules.getDueExercises(now) as DueExercise[];

  if (chapterId) {
    due = due.filter((e) => e.chapter_id === chapterId);
  }

  const exercises = due.map((e) => ({
    ...e,
    items: typeof e.items === "string" ? JSON.parse(e.items) : e.items,
  }));

  return NextResponse.json({ exercises, total: exercises.length });
}
