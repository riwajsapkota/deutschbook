import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { attempts, exercises } from "@/lib/db";
import { AttemptAnswer } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { exercise_id, score, answers, self_assessment } = body as {
    exercise_id: string;
    score: number;
    answers: AttemptAnswer[];
    self_assessment?: string;
  };

  if (!exercise_id || score === undefined || !answers) {
    return NextResponse.json({ error: "exercise_id, score, and answers are required" }, { status: 400 });
  }

  const exercise = exercises.getById(exercise_id);
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const id = randomUUID();
  attempts.create({
    id,
    exercise_id,
    score,
    answers,
    self_assessment: self_assessment ?? null,
  });

  return NextResponse.json({ id, score, self_assessment }, { status: 201 });
}
