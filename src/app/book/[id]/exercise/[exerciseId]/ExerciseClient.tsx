"use client";

import { useState } from "react";
import Link from "next/link";
import { Exercise, ExerciseItem, SelfAssessment } from "@/types";

interface Props {
  exercise: Exercise;
  chapterId: string;
}

type AnswerMap = Record<string, string>;
type ResultMap = Record<string, boolean>;

const SELF_ASSESSMENTS: { value: SelfAssessment; label: string; color: string }[] = [
  { value: "solid", label: "Solid", color: "bg-green-600 hover:bg-green-700 text-white" },
  { value: "shaky", label: "Shaky", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "forgotten", label: "Forgotten", color: "bg-red-500 hover:bg-red-600 text-white" },
];

export default function ExerciseClient({ exercise, chapterId }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ResultMap>({});
  const [score, setScore] = useState(0);
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = (itemId: string, value: string) => {
    if (!submitted) setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = () => {
    const newResults: ResultMap = {};
    let correct = 0;

    for (const item of exercise.items) {
      const given = (answers[item.id] ?? "").trim().toLowerCase();
      const expected = item.correct_answer.trim().toLowerCase();
      const alternatives = item.blanks?.flatMap((b) => b.alternatives.map((a) => a.toLowerCase())) ?? [];
      const isCorrect = given === expected || alternatives.includes(given);
      newResults[item.id] = isCorrect;
      if (isCorrect) correct++;
    }

    setResults(newResults);
    setScore(correct / Math.max(exercise.items.length, 1));
    setSubmitted(true);
  };

  const handleSelfAssess = async (assessment: SelfAssessment) => {
    setSelfAssessment(assessment);
    setSaving(true);

    const answerList = exercise.items.map((item) => ({
      item_id: item.id,
      given_answer: answers[item.id] ?? "",
      correct: results[item.id] ?? false,
    }));

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exercise.id,
        score,
        answers: answerList,
        self_assessment: assessment,
      }),
    });

    setSaving(false);
    setSaved(true);
  };

  const handleRetry = () => {
    const wrongIds = exercise.items.filter((item) => !results[item.id]).map((item) => item.id);
    setAnswers((prev) => {
      const next = { ...prev };
      wrongIds.forEach((id) => delete next[id]);
      return next;
    });
    setSubmitted(false);
    setResults({});
    setSelfAssessment(null);
    setSaved(false);
  };

  const scorePercent = Math.round(score * 100);
  const correctCount = Math.round(score * exercise.items.length);
  const wrongCount = exercise.items.length - correctCount;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/book" className="hover:underline">Book</Link>
        <span>/</span>
        <Link href={`/book/${chapterId}`} className="hover:underline">Chapter</Link>
        <span>/</span>
        <span>Exercise</span>
      </div>

      <h1 className="text-xl font-bold mb-1">{exercise.instruction}</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">
        {exercise.type.replace(/_/g, " ")} · {exercise.difficulty}
        {exercise.source_file && <span> · {exercise.source_file}</span>}
      </p>

      {/* Score banner */}
      {submitted && (
        <div className={`mb-6 p-4 rounded-lg border ${scorePercent >= 70 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className={`text-lg font-bold ${scorePercent >= 70 ? "text-green-700" : "text-amber-700"}`}>
            {scorePercent}% — {correctCount}/{exercise.items.length} correct
          </div>
          {wrongCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">{wrongCount} wrong answer{wrongCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}

      {/* Exercise items */}
      <div className="space-y-5">
        {exercise.items.map((item, idx) => (
          <ExerciseItemView
            key={item.id}
            item={item}
            index={idx + 1}
            type={exercise.type}
            answer={answers[item.id] ?? ""}
            onChange={(v) => handleAnswer(item.id, v)}
            submitted={submitted}
            correct={results[item.id]}
          />
        ))}
      </div>

      {/* Action row */}
      <div className="mt-8 space-y-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={exercise.items.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Submit
          </button>
        ) : (
          <>
            {/* Self-assessment */}
            {!saved && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">How did that feel?</p>
                <div className="flex gap-2">
                  {SELF_ASSESSMENTS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => handleSelfAssess(a.value)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        selfAssessment === a.value ? a.color + " ring-2 ring-offset-1 ring-gray-400" : a.color
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {saved && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                Result saved as <strong>{selfAssessment}</strong>.
              </p>
            )}

            <div className="flex gap-3">
              {wrongCount > 0 && (
                <button
                  onClick={handleRetry}
                  className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  Retry wrong ({wrongCount})
                </button>
              )}
              <Link
                href={`/book/${chapterId}`}
                className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Back to chapter
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ExerciseItemView({
  item,
  index,
  type,
  answer,
  onChange,
  submitted,
  correct,
}: {
  item: ExerciseItem;
  index: number;
  type: string;
  answer: string;
  onChange: (v: string) => void;
  submitted: boolean;
  correct: boolean | undefined;
}) {
  const borderColor = submitted
    ? correct
      ? "border-green-300 bg-green-50"
      : "border-red-300 bg-red-50"
    : "border-gray-200 bg-white";

  return (
    <div className={`border rounded-lg px-5 py-4 transition-colors ${borderColor}`}>
      <div className="flex gap-3 items-start mb-3">
        <span className="text-xs font-semibold text-gray-400 mt-0.5 shrink-0">{index}.</span>
        <p className="text-sm text-gray-800">{item.prompt}</p>
      </div>

      {type === "multiple_choice" && item.options.length > 0 ? (
        <div className="space-y-2 ml-5">
          {item.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={item.id}
                value={opt}
                checked={answer === opt}
                onChange={() => onChange(opt)}
                disabled={submitted}
                className="accent-blue-600"
              />
              <span className={`text-sm ${submitted && opt === item.correct_answer ? "font-semibold text-green-700" : ""}`}>
                {opt}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !submitted && onChange(e.currentTarget.value)}
          disabled={submitted}
          placeholder="Your answer..."
          className={`ml-5 w-[calc(100%-1.25rem)] border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            submitted ? "bg-gray-50 cursor-not-allowed border-gray-200" : "bg-white border-gray-300"
          }`}
        />
      )}

      {submitted && !correct && (
        <div className="mt-3 ml-5 text-sm space-y-1">
          <p>
            <span className="text-red-600">Correct: </span>
            <span className="font-medium">{item.correct_answer}</span>
          </p>
          {item.explanation && (
            <p className="text-gray-500 text-xs">{item.explanation}</p>
          )}
        </div>
      )}

      {submitted && correct && (
        <p className="mt-2 ml-5 text-xs text-green-600 font-medium">Correct!</p>
      )}
    </div>
  );
}
