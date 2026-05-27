import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { vocabulary } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { word, article, plural, translation, example_sentence, part_of_speech, tags, chapter_id } = body;

  if (!word?.trim() || !translation?.trim()) {
    return NextResponse.json({ error: "word and translation are required" }, { status: 400 });
  }

  const id = randomUUID();
  vocabulary.create({
    id,
    chapter_id: chapter_id ?? null,
    word: word.trim(),
    article: article?.trim() || null,
    plural: plural?.trim() || null,
    translation: translation.trim(),
    example_sentence: example_sentence?.trim() ?? "",
    part_of_speech: part_of_speech ?? "noun",
    tags: Array.isArray(tags) ? tags : [],
  });

  return NextResponse.json({ id });
}
