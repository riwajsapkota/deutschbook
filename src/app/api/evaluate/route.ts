import { NextResponse } from "next/server";
import { exercises } from "@/lib/db";
import { evaluateAnswer } from "@/lib/agent/evaluate";
import { Exercise, ExerciseItem } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { exercise_id, item_id, user_answer } = body as {
    exercise_id: string;
    item_id: string;
    user_answer: string;
  };

  if (!exercise_id || !item_id || !user_answer) {
    return NextResponse.json({ error: "exercise_id, item_id, and user_answer are required" }, { status: 400 });
  }

  const raw = (await exercises.getById(exercise_id)) as (Omit<Exercise, "items"> & { items: string }) | undefined;
  if (!raw) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const exercise: Exercise = { ...raw, items: typeof raw.items === "string" ? JSON.parse(raw.items) : raw.items };
  const item = exercise.items.find((i: ExerciseItem) => i.id === item_id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const result = await evaluateAnswer(
    exercise.type === "translate" ? "translate" : "free_response",
    item.prompt,
    item.correct_answer,
    user_answer,
    exercise.instruction
  );

  return NextResponse.json(result);
}
