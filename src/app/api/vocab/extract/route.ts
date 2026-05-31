import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { chapters, exercises, vocabulary } from "@/lib/db";
import { extractVocabulary } from "@/lib/agent/vocabulary";

interface RawExercise {
  instruction: string;
  items: string;
}

interface ExerciseItem {
  prompt?: string;
  correct_answer?: string;
  explanation?: string;
}

function buildExerciseText(exs: RawExercise[]): string {
  return exs
    .map((ex) => {
      const items: ExerciseItem[] = (() => {
        try { return JSON.parse(ex.items); } catch { return []; }
      })();
      const lines = [ex.instruction];
      for (const item of items) {
        if (item.prompt) lines.push(item.prompt);
        if (item.correct_answer) lines.push(item.correct_answer);
        if (item.explanation) lines.push(item.explanation);
      }
      return lines.join(" ");
    })
    .join("\n");
}

export async function POST(request: Request) {
  const { chapterId } = await request.json();
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  }

  const chapter = (await chapters.getById(chapterId)) as { id: string; title: string; theory: string | null } | undefined;
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const exs = (await exercises.getByChapter(chapterId)) as RawExercise[];

  if (!chapter.theory && exs.length === 0) {
    return NextResponse.json({ error: "Chapter has no theory or exercises to extract from" }, { status: 400 });
  }

  // Run extractions in parallel — theory and exercises as separate passes to avoid the 4000-char slice cutting one off
  const [fromTheory, fromExercises] = await Promise.all([
    chapter.theory ? extractVocabulary(chapter.theory, chapter.title) : Promise.resolve([]),
    exs.length > 0 ? extractVocabulary(buildExerciseText(exs), chapter.title) : Promise.resolve([]),
  ]);

  // Merge, deduplicating by lowercase word
  const seen = new Set<string>();
  const merged = [...fromTheory, ...fromExercises].filter((item) => {
    const key = item.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await vocabulary.deleteByChapter(chapterId);

  for (const item of merged) {
    await vocabulary.create({
      id: randomUUID(),
      chapter_id: chapterId,
      word: item.word,
      article: item.article ?? null,
      plural: item.plural ?? null,
      translation: item.translation,
      example_sentence: item.example_sentence ?? "",
      part_of_speech: item.part_of_speech ?? "noun",
      tags: item.tags ?? [],
    });
  }

  return NextResponse.json({ count: merged.length, fromTheory: fromTheory.length, fromExercises: fromExercises.length });
}
