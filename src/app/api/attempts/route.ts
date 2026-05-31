import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { attempts, exercises, reviewSchedules } from "@/lib/db";
import { sm2, toQuality } from "@/lib/spaced-repetition";
import { AttemptAnswer, SelfAssessment } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { exercise_id, score, answers, self_assessment } = body as {
    exercise_id: string;
    score: number;
    answers: AttemptAnswer[];
    self_assessment?: SelfAssessment;
  };

  if (!exercise_id || score === undefined || !answers) {
    return NextResponse.json({ error: "exercise_id, score, and answers are required" }, { status: 400 });
  }

  const exercise = await exercises.getById(exercise_id);
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const id = randomUUID();
  await attempts.create({ id, exercise_id, score, answers, self_assessment: self_assessment ?? null });

  // Update spaced repetition schedule
  const existing = (await reviewSchedules.getByTarget("exercise", exercise_id)) as {
    interval_days: number;
    ease_factor: number;
    review_count: number;
  } | undefined;

  const current = existing ?? { interval_days: 1, ease_factor: 2.5, review_count: 0 };
  const quality = toQuality(score, self_assessment ?? null);
  const next = sm2(current, quality);

  await reviewSchedules.upsert({
    id: randomUUID(),
    target_type: "exercise",
    target_id: exercise_id,
    next_review_at: next.next_review_at.toISOString(),
    interval_days: next.interval_days,
    ease_factor: next.ease_factor,
    review_count: next.review_count,
  });

  return NextResponse.json({
    id,
    score,
    self_assessment,
    next_review_at: next.next_review_at.toISOString(),
    interval_days: next.interval_days,
  }, { status: 201 });
}
