import { NextResponse } from "next/server";
import { chapters } from "@/lib/db";
import { askTeacher } from "@/lib/agent/evaluate";
import { Chapter } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapter = chapters.getById(id) as Chapter | undefined;
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const body = await request.json();
  const { question, context } = body as { question: string; context: string };

  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const answer = await askTeacher(chapter.title, context ?? "", question);
  return NextResponse.json({ answer });
}
