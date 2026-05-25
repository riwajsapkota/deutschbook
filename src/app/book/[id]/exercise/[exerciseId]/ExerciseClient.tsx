"use client";

import { useState } from "react";
import Link from "next/link";
import { Exercise, ExerciseItem } from "@/types";

interface Props {
  exercise: Exercise;
  chapterId: string;
}

type AnswerMap = Record<string, string>;
type ResultMap = Record<string, boolean>;

export default function ExerciseClient({ exercise, chapterId }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ResultMap>({});
  const [score, setScore] = useState(0);

  const handleAnswer = (itemId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = () => {
    const newResults: ResultMap = {};
    let correct = 0;

    for (const item of exercise.items) {
      const given = (answers[item.id] ?? "").trim().toLowerCase();
      const expected = item.correct_answer.trim().toLowerCase();
      const alternatives = item.blanks?.[0]?.alternatives?.map((a) => a.toLowerCase()) ?? [];
      const isCorrect = given === expected || alternatives.includes(given);
      newResults[item.id] = isCorrect;
      if (isCorrect) correct++;
    }

    setResults(newResults);
    setScore(correct / exercise.items.length);
    setSubmitted(true);
  };

  const handleRetry = () => {
    const wrongIds = exercise.items
      .filter((item) => !results[item.id])
      .map((item) => item.id);

    setAnswers((prev) => {
      const next = { ...prev };
      wrongIds.forEach((id) => delete next[id]);
      return next;
    });
    setSubmitted(false);
    setResults({});
  };

  const scorePercent = Math.round(score * 100);

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
      </p>

      {submitted && (
        <div className={`mb-6 p-4 rounded-lg border ${scorePercent >= 70 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className={`text-lg font-bold ${scorePercent >= 70 ? "text-green-700" : "text-amber-700"}`}>
            {scorePercent}% — {Math.round(score * exercise.items.length)}/{exercise.items.length} correct
          </div>
        </div>
      )}

      <div className="space-y-6">
        {exercise.items.map((item) => (
          <ExerciseItemView
            key={item.id}
            item={item}
            type={exercise.type}
            answer={answers[item.id] ?? ""}
            onChange={(v) => handleAnswer(item.id, v)}
            submitted={submitted}
            correct={results[item.id]}
          />
        ))}
      </div>

      <div className="mt-8 flex gap-3">
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
            <button
              onClick={handleRetry}
              className="bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Retry wrong
            </button>
            <Link
              href={`/book/${chapterId}`}
              className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to chapter
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ExerciseItemView({
  item,
  type,
  answer,
  onChange,
  submitted,
  correct,
}: {
  item: ExerciseItem;
  type: string;
  answer: string;
  onChange: (v: string) => void;
  submitted: boolean;
  correct: boolean | undefined;
}) {
  const borderColor = submitted
    ? correct
      ? "border-green-400 bg-green-50"
      : "border-red-400 bg-red-50"
    : "border-gray-200 bg-white";

  return (
    <div className={`border rounded-lg px-5 py-4 ${borderColor}`}>
      <p className="text-sm font-medium text-gray-800 mb-3">{item.prompt}</p>

      {type === "multiple_choice" && item.options.length > 0 ? (
        <div className="space-y-2">
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
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitted}
          placeholder="Your answer..."
          className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            submitted ? "bg-gray-50 cursor-not-allowed" : "bg-white border-gray-300"
          }`}
        />
      )}

      {submitted && !correct && (
        <div className="mt-3 text-sm">
          <span className="text-red-600">Correct answer: </span>
          <span className="font-medium text-gray-800">{item.correct_answer}</span>
          {item.explanation && (
            <p className="text-gray-600 mt-1 text-xs">{item.explanation}</p>
          )}
        </div>
      )}

      {submitted && correct && (
        <p className="mt-2 text-xs text-green-600">Correct!</p>
      )}
    </div>
  );
}
