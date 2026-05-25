import { NextResponse } from "next/server";
import { chapters, exercises, vocabulary } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapter = chapters.getById(id);
  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exs = exercises.getByChapter(id);
  const vocab = vocabulary.getByChapter(id);

  return NextResponse.json({ ...chapter, exercises: exs, vocabulary: vocab });
}
