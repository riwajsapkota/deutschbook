import { notFound } from "next/navigation";
import { exercises as exercisesDb } from "@/lib/db";
import { Exercise } from "@/types";
import ExerciseClient from "./ExerciseClient";

interface PageProps {
  params: Promise<{ id: string; exerciseId: string }>;
}

export const dynamic = "force-dynamic";

export default async function ExercisePage({ params }: PageProps) {
  const { id, exerciseId } = await params;
  const raw = exercisesDb.getById(exerciseId) as (Omit<Exercise, "items"> & { items: string }) | undefined;
  if (!raw) notFound();

  const exercise: Exercise = {
    ...raw,
    items: typeof raw.items === "string" ? JSON.parse(raw.items) : raw.items,
  };

  return <ExerciseClient exercise={exercise} chapterId={id} />;
}
