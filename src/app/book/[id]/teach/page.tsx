import { notFound } from "next/navigation";
import { chapters as chaptersDb, exercises as exercisesDb } from "@/lib/db";
import { Chapter, Exercise } from "@/types";
import TeachClient from "./TeachClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeachPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = chaptersDb.getById(id) as Chapter | undefined;
  if (!chapter) notFound();

  const exs = exercisesDb.getByChapter(id) as (Omit<Exercise, "items"> & { items: string })[];
  const exerciseCount = exs.length;

  return (
    <TeachClient
      chapterId={id}
      chapterTitle={chapter.title}
      theory={chapter.theory ?? ""}
      exerciseCount={exerciseCount}
    />
  );
}
