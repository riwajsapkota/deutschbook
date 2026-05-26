import Link from "next/link";
import { notFound } from "next/navigation";
import { chapters as chaptersDb, exercises as exercisesDb, vocabulary as vocabDb, attempts as attemptsDb } from "@/lib/db";
import { Chapter, Exercise, VocabularyItem } from "@/types";
import ChapterClient from "./ChapterClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = chaptersDb.getById(id) as Chapter | undefined;
  if (!chapter) notFound();

  const exs = exercisesDb.getByChapter(id) as (Omit<Exercise, "items"> & { items: string })[];
  const vocab = vocabDb.getByChapter(id) as (Omit<VocabularyItem, "tags"> & { tags: string })[];

  const exercises: Exercise[] = exs.map((e) => ({
    ...e,
    items: typeof e.items === "string" ? JSON.parse(e.items) : e.items,
  }));

  const vocabulary: VocabularyItem[] = vocab.map((v) => ({
    ...v,
    tags: typeof v.tags === "string" ? JSON.parse(v.tags) : v.tags,
  }));

  // Fetch latest attempt per exercise for completion status
  const latestAttempts = Object.fromEntries(
    exercises.map((ex) => {
      const latest = attemptsDb.getLatestByExercise(ex.id) as {
        score: number;
        self_assessment: string | null;
      } | undefined;
      return [ex.id, latest ?? null];
    })
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/book" className="hover:underline">Book</Link>
        <span>/</span>
        <span>{chapter.title}</span>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">{chapter.title}</h1>
        <div className="flex gap-2 shrink-0 ml-4">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
            {chapter.category}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {chapter.level}
          </span>
        </div>
      </div>

      {chapter.summary && (
        <p className="text-gray-600 mb-8">{chapter.summary}</p>
      )}

      <ChapterClient
        chapterId={id}
        theory={chapter.theory}
        exercises={exercises}
        vocabulary={vocabulary}
        latestAttempts={latestAttempts}
      />
    </div>
  );
}
