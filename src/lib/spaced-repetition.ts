// SM-2 algorithm adapted for exercises with self-assessment

export interface SM2Input {
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

export interface SM2Output {
  interval_days: number;
  ease_factor: number;
  review_count: number;
  next_review_at: Date;
}

/**
 * Convert score + self-assessment into an SM-2 quality rating (0–5).
 * Quality < 3 means the item needs to be reset and shown again soon.
 */
export function toQuality(
  score: number,
  selfAssessment: "solid" | "shaky" | "forgotten" | null
): number {
  if (selfAssessment === "forgotten") return 1;
  if (selfAssessment === "shaky") return score >= 0.7 ? 3 : 2;
  if (selfAssessment === "solid") return score >= 0.9 ? 5 : score >= 0.7 ? 4 : 3;

  // No self-assessment — derive from score alone
  if (score >= 0.9) return 5;
  if (score >= 0.75) return 4;
  if (score >= 0.6) return 3;
  if (score >= 0.4) return 2;
  return 1;
}

export function sm2(current: SM2Input, quality: number): SM2Output {
  const q = Math.max(0, Math.min(5, quality));

  let { interval_days, ease_factor, review_count } = current;

  if (q < 3) {
    // Failed — reset to beginning
    interval_days = 1;
    review_count = 0;
  } else {
    // Passed
    if (review_count === 0) {
      interval_days = 1;
    } else if (review_count === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }

    ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ease_factor = Math.max(1.3, ease_factor);
    review_count += 1;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval_days);

  return { interval_days, ease_factor, review_count, next_review_at: next };
}

/** Initial schedule for a brand-new item — due for first review tomorrow. */
export function initialSchedule(): SM2Output {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return { interval_days: 1, ease_factor: 2.5, review_count: 0, next_review_at: next };
}
