"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Exercise, ExerciseItem, SelfAssessment } from "@/types";

interface QuizExercise extends Exercise {
  chapter_title: string;
  level: string;
  next_review_at: string | null;
}

type AnswerMap = Record<string, string>;
type ResultMap = Record<string, boolean>;

type QuizPhase = "loading" | "ready" | "answering" | "reviewing" | "assessing" | "done";

const SELF_ASSESSMENTS: { value: SelfAssessment; label: string; color: string }[] = [
  { value: "solid", label: "Solid", color: "bg-green-600 hover:bg-green-700 text-white" },
  { value: "shaky", label: "Shaky", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "forgotten", label: "Forgotten", color: "bg-red-500 hover:bg-red-600 text-white" },
];

interface SessionResult {
  exercise: QuizExercise;
  score: number;
  selfAssessment: SelfAssessment;
  correctCount: number;
}

export default function QuizClient() {
  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [exercises, setExercises] = useState<QuizExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [results, setResults] = useState<ResultMap>({});
  const [score, setScore] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    const res = await fetch("/api/quiz");
    const data = await res.json();
    setExercises(data.exercises);
    setPhase(data.exercises.length === 0 ? "done" : "ready");
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = exercises[index] as QuizExercise | undefined;

  const handleAnswer = (itemId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = () => {
    if (!current) return;
    const newResults: ResultMap = {};
    let correct = 0;
    for (const item of current.items) {
      const given = (answers[item.id] ?? "").trim().toLowerCase();
      const expected = item.correct_answer.trim().toLowerCase();
      const alts = item.blanks?.flatMap((b) => b.alternatives.map((a) => a.toLowerCase())) ?? [];
      const ok = given === expected || alts.includes(given);
      newResults[item.id] = ok;
      if (ok) correct++;
    }
    setResults(newResults);
    setScore(correct / Math.max(current.items.length, 1));
    setPhase("reviewing");
  };

  const handleAssess = async (assessment: SelfAssessment) => {
    if (!current) return;
    setSaving(true);

    const answerList = current.items.map((item) => ({
      item_id: item.id,
      given_answer: answers[item.id] ?? "",
      correct: results[item.id] ?? false,
    }));

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: current.id,
        score,
        answers: answerList,
        self_assessment: assessment,
      }),
    });

    setSessionResults((prev) => [
      ...prev,
      {
        exercise: current,
        score,
        selfAssessment: assessment,
        correctCount: Math.round(score * current.items.length),
      },
    ]);

    setSaving(false);

    // Advance or finish
    if (index + 1 >= exercises.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setAnswers({});
      setResults({});
      setScore(0);
      setPhase("answering");
    }
  };

  // ── Loading ──
  if (phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center text-gray-600">
        Loading due items...
      </div>
    );
  }

  // ── Ready screen ──
  if (phase === "ready") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Quiz</h1>
        <p className="text-gray-600 mb-8">
          {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} due for review
        </p>
        <div className="mb-8 space-y-2">
          {exercises.slice(0, 5).map((ex) => (
            <div key={ex.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-left">
              <div>
                <span className="font-medium">{ex.chapter_title}</span>
                <span className="text-gray-600 ml-2 text-xs">{ex.instruction.slice(0, 50)}{ex.instruction.length > 50 ? "…" : ""}</span>
              </div>
              <span className="text-xs text-gray-600 shrink-0 ml-2">{ex.items.length} items</span>
            </div>
          ))}
          {exercises.length > 5 && (
            <p className="text-xs text-gray-600">and {exercises.length - 5} more...</p>
          )}
        </div>
        <button
          onClick={() => setPhase("answering")}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  // ── Done / Summary ──
  if (phase === "done") {
    if (sessionResults.length === 0) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Nothing due</h1>
          <p className="text-gray-600 mb-6">All caught up. Come back later when items are due for review.</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">Back to dashboard</Link>
        </div>
      );
    }

    const totalItems = sessionResults.reduce((s, r) => s + r.exercise.items.length, 0);
    const totalCorrect = sessionResults.reduce((s, r) => s + r.correctCount, 0);
    const overallPct = Math.round((totalCorrect / Math.max(totalItems, 1)) * 100);

    const byChapter: Record<string, { title: string; correct: number; total: number }> = {};
    for (const r of sessionResults) {
      const key = r.exercise.chapter_id;
      if (!byChapter[key]) byChapter[key] = { title: r.exercise.chapter_title, correct: 0, total: 0 };
      byChapter[key].correct += r.correctCount;
      byChapter[key].total += r.exercise.items.length;
    }

    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">Quiz complete</h1>
        <p className="text-gray-600 mb-6">You reviewed {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}.</p>

        <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 mb-6">
          <div className={`text-3xl font-bold mb-1 ${overallPct >= 70 ? "text-green-600" : "text-amber-600"}`}>
            {overallPct}%
          </div>
          <p className="text-sm text-gray-700">{totalCorrect} of {totalItems} correct</p>
        </div>

        <h2 className="font-semibold mb-3">By chapter</h2>
        <div className="space-y-2 mb-8">
          {Object.entries(byChapter).map(([, v]) => {
            const pct = Math.round((v.correct / Math.max(v.total, 1)) * 100);
            return (
              <div key={v.title} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm">
                <span className="font-medium">{v.title}</span>
                <span className={`font-semibold ${pct >= 70 ? "text-green-600" : "text-amber-600"}`}>{pct}%</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={load} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Quiz again
          </button>
          <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Answering / Reviewing ──
  if (!current) return null;
  const scorePercent = Math.round(score * 100);
  const wrongCount = current.items.length - Math.round(score * current.items.length);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((index) / exercises.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 shrink-0">{index + 1} / {exercises.length}</span>
      </div>

      {/* Chapter label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{current.chapter_title}</span>
        <span className="text-xs text-gray-600">{current.level}</span>
      </div>

      <h2 className="text-lg font-bold mb-1">{current.instruction}</h2>
      <p className="text-xs text-gray-600 mb-6 capitalize">{current.type.replace(/_/g, " ")} · {current.difficulty}</p>

      {/* Score banner */}
      {phase === "reviewing" && (
        <div className={`mb-5 p-4 rounded-lg border ${scorePercent >= 70 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <span className={`font-bold ${scorePercent >= 70 ? "text-green-700" : "text-amber-700"}`}>
            {scorePercent}% — {Math.round(score * current.items.length)}/{current.items.length} correct
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4 mb-6">
        {current.items.map((item, idx) => (
          <QuizItem
            key={item.id}
            item={item}
            index={idx + 1}
            type={current.type}
            answer={answers[item.id] ?? ""}
            onChange={(v) => handleAnswer(item.id, v)}
            submitted={phase === "reviewing" || phase === "assessing"}
            correct={results[item.id]}
          />
        ))}
      </div>

      {/* Actions */}
      {phase === "answering" && (
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Submit
        </button>
      )}

      {phase === "reviewing" && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">How did that feel?</p>
          <div className="flex gap-2">
            {SELF_ASSESSMENTS.map((a) => (
              <button
                key={a.value}
                onClick={() => handleAssess(a.value)}
                disabled={saving}
                className={`flex-1 md:flex-none px-4 py-3 md:py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${a.color}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {wrongCount > 0 && (
            <p className="text-xs text-gray-600 mt-2">{wrongCount} wrong answer{wrongCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}

function QuizItem({
  item, index, type, answer, onChange, submitted, correct,
}: {
  item: ExerciseItem;
  index: number;
  type: string;
  answer: string;
  onChange: (v: string) => void;
  submitted: boolean;
  correct: boolean | undefined;
}) {
  const border = submitted
    ? correct ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
    : "border-gray-200 bg-white";

  return (
    <div className={`border rounded-lg px-4 py-3 transition-colors ${border}`}>
      <div className="flex gap-2 items-start mb-2">
        <span className="text-xs font-semibold text-gray-600 shrink-0 mt-0.5">{index}.</span>
        <p className="text-sm text-gray-800">{item.prompt}</p>
      </div>

      {type === "multiple_choice" && item.options.length > 0 ? (
        <div className="space-y-1.5 ml-4">
          {item.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={item.id} value={opt} checked={answer === opt} onChange={() => onChange(opt)} disabled={submitted} className="accent-blue-600" />
              <span className={`text-sm ${submitted && opt === item.correct_answer ? "font-semibold text-green-700" : ""}`}>{opt}</span>
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
          className={`ml-4 w-[calc(100%-1rem)] border rounded px-3 py-3 text-base md:text-sm md:py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted ? "bg-gray-50 cursor-not-allowed border-gray-200" : "bg-white border-gray-300"}`}
        />
      )}

      {submitted && !correct && (
        <div className="mt-2 ml-4 text-sm">
          <span className="text-red-600">Correct: </span>
          <span className="font-medium">{item.correct_answer}</span>
          {item.explanation && <p className="text-xs text-gray-700 mt-0.5">{item.explanation}</p>}
        </div>
      )}
    </div>
  );
}
