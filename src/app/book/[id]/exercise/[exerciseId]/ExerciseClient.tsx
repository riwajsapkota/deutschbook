"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Exercise, ExerciseItem, SelfAssessment } from "@/types";

interface Props {
  exercise: Exercise;
  chapterId: string;
}

type AnswerMap = Record<string, string>;
type ResultMap = Record<string, boolean>;
type AiFeedbackMap = Record<string, { feedback: string; corrected: string | null } | null>;

const SELF_ASSESSMENTS: { value: SelfAssessment; label: string; color: string }[] = [
  { value: "solid", label: "Solid", color: "bg-green-600 hover:bg-green-700 text-white" },
  { value: "shaky", label: "Shaky", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "forgotten", label: "Forgotten", color: "bg-red-500 hover:bg-red-600 text-white" },
];

const needsAiEval = (type: string) => type === "translate" || type === "free_response";

export default function ExerciseClient({ exercise, chapterId }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ResultMap>({});
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackMap>({});
  const [score, setScore] = useState(0);
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const handleAnswer = (itemId: string, value: string) => {
    if (!submitted) setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = useCallback(async () => {
    const newResults: ResultMap = {};
    let correct = 0;

    for (const item of exercise.items) {
      if (needsAiEval(exercise.type)) {
        // Will be evaluated by AI — optimistically mark pending
        newResults[item.id] = false;
      } else if (exercise.type === "reorder") {
        const given = (answers[item.id] ?? "").trim().toLowerCase();
        const expected = item.correct_answer.trim().toLowerCase();
        const isCorrect = given === expected;
        newResults[item.id] = isCorrect;
        if (isCorrect) correct++;
      } else {
        const given = (answers[item.id] ?? "").trim().toLowerCase();
        const expected = item.correct_answer.trim().toLowerCase();
        const alternatives = item.blanks?.flatMap((b) => b.alternatives.map((a) => a.toLowerCase())) ?? [];
        const isCorrect = given === expected || alternatives.includes(given);
        newResults[item.id] = isCorrect;
        if (isCorrect) correct++;
      }
    }

    setResults(newResults);
    setSubmitted(true);

    // AI evaluation for translate/free_response
    if (needsAiEval(exercise.type)) {
      setEvaluating(true);
      let aiCorrect = 0;
      const feedbackMap: AiFeedbackMap = {};

      await Promise.all(
        exercise.items.map(async (item) => {
          const userAnswer = answers[item.id] ?? "";
          if (!userAnswer.trim()) {
            feedbackMap[item.id] = { feedback: "No answer provided.", corrected: null };
            return;
          }
          const res = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exercise_id: exercise.id, item_id: item.id, user_answer: userAnswer }),
          });
          const data = await res.json();
          feedbackMap[item.id] = { feedback: data.feedback, corrected: data.corrected };
          if (data.correct) {
            newResults[item.id] = true;
            aiCorrect++;
          }
        })
      );

      setResults({ ...newResults });
      setAiFeedback(feedbackMap);
      setScore(aiCorrect / Math.max(exercise.items.length, 1));
      setEvaluating(false);
    } else {
      setScore(correct / Math.max(exercise.items.length, 1));
    }
  }, [answers, exercise]);

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
      body: JSON.stringify({ exercise_id: exercise.id, score, answers: answerList, self_assessment: assessment }),
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
    setAiFeedback({});
    setSelfAssessment(null);
    setSaved(false);
  };

  const scorePercent = Math.round(score * 100);
  const correctCount = Math.round(score * exercise.items.length);
  const wrongCount = exercise.items.length - correctCount;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/book" className="hover:underline">Book</Link>
        <span>/</span>
        <Link href={`/book/${chapterId}`} className="hover:underline">Chapter</Link>
        <span>/</span>
        <span>Exercise</span>
      </div>

      <h1 className="text-xl font-bold mb-1">{exercise.instruction}</h1>
      <p className="text-sm text-gray-600 mb-6 capitalize">
        {exercise.type.replace(/_/g, " ")} · {exercise.difficulty}
        {exercise.source_file && <span> · {exercise.source_file}</span>}
      </p>

      {submitted && !evaluating && (
        <div className={`mb-6 p-4 rounded-lg border ${scorePercent >= 70 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className={`text-lg font-bold ${scorePercent >= 70 ? "text-green-700" : "text-amber-700"}`}>
            {scorePercent}% — {correctCount}/{exercise.items.length} correct
          </div>
          {wrongCount > 0 && <p className="text-sm text-gray-600 mt-1">{wrongCount} wrong</p>}
        </div>
      )}

      {evaluating && (
        <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-700">
          Evaluating your answers with AI...
        </div>
      )}

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
            aiFeedback={aiFeedback[item.id] ?? null}
          />
        ))}
      </div>

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
            {!saved && !evaluating && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">How did that feel?</p>
                <div className="flex gap-2">
                  {SELF_ASSESSMENTS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => handleSelfAssess(a.value)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${a.color}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {saved && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                Saved as <strong>{selfAssessment}</strong>.
              </p>
            )}
            <div className="flex gap-3">
              {wrongCount > 0 && !needsAiEval(exercise.type) && (
                <button onClick={handleRetry} className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                  Retry wrong ({wrongCount})
                </button>
              )}
              <Link href={`/book/${chapterId}`} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
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
  item, index, type, answer, onChange, submitted, correct, aiFeedback,
}: {
  item: ExerciseItem;
  index: number;
  type: string;
  answer: string;
  onChange: (v: string) => void;
  submitted: boolean;
  correct: boolean | undefined;
  aiFeedback: { feedback: string; corrected: string | null } | null;
}) {
  const borderColor = submitted
    ? correct ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
    : "border-gray-200 bg-white";

  return (
    <div className={`border rounded-lg px-5 py-4 transition-colors ${borderColor}`}>
      <div className="flex gap-3 items-start mb-3">
        <span className="text-xs font-semibold text-gray-600 mt-0.5 shrink-0">{index}.</span>
        <p className="text-sm text-blue-900 font-medium">{item.prompt}</p>
      </div>

      {type === "multiple_choice" && item.options.length > 0 ? (
        <MultipleChoiceInput item={item} answer={answer} onChange={onChange} submitted={submitted} />
      ) : type === "reorder" ? (
        <ReorderInput item={item} answer={answer} onChange={onChange} submitted={submitted} />
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitted}
          placeholder={type === "translate" ? "Your translation..." : type === "free_response" ? "Write your answer in German..." : "Your answer..."}
          className={`ml-5 w-[calc(100%-1.25rem)] border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitted ? "bg-gray-50 cursor-not-allowed border-gray-200" : "bg-white border-gray-300"}`}
        />
      )}

      {submitted && !correct && !aiFeedback && type !== "translate" && type !== "free_response" && (
        <div className="mt-3 ml-5 text-sm space-y-1">
          <p><span className="text-red-600">Correct: </span><span className="font-medium">{item.correct_answer}</span></p>
          {item.explanation && <p className="text-gray-700 text-xs">{item.explanation}</p>}
        </div>
      )}

      {aiFeedback && (
        <div className={`mt-3 ml-5 text-sm p-3 rounded-lg ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <p className={`font-medium mb-1 ${correct ? "text-green-700" : "text-red-700"}`}>
            {correct ? "Correct!" : "Needs work"}
          </p>
          <p className="text-gray-700">{aiFeedback.feedback}</p>
          {aiFeedback.corrected && (
            <p className="mt-1 text-gray-600"><span className="font-medium">Corrected: </span>{aiFeedback.corrected}</p>
          )}
        </div>
      )}

      {submitted && correct && !aiFeedback && (
        <p className="mt-2 ml-5 text-xs text-green-600 font-medium">Correct!</p>
      )}
    </div>
  );
}

function MultipleChoiceInput({ item, answer, onChange, submitted }: {
  item: ExerciseItem; answer: string; onChange: (v: string) => void; submitted: boolean;
}) {
  return (
    <div className="space-y-2 ml-5">
      {item.options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={item.id} value={opt} checked={answer === opt} onChange={() => onChange(opt)} disabled={submitted} className="accent-blue-600" />
          <span className={`text-sm ${submitted && opt === item.correct_answer ? "font-semibold text-green-700" : ""}`}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

function ReorderInput({ item, answer, onChange, submitted }: {
  item: ExerciseItem; answer: string; onChange: (v: string) => void; submitted: boolean;
}) {
  // Derive word bank from correct_answer, shuffled once via a stable sort
  const allWords = item.correct_answer.split(/\s+/).filter(Boolean);
  const shuffled = [...allWords].sort((a, b) => (a.charCodeAt(0) * 7 + b.charCodeAt(0)) % 3 - 1);

  const placed = answer ? answer.split(" ").filter(Boolean) : [];
  const bankWords = shuffled.filter((_, i) => {
    const usedCount = placed.filter((w) => w === shuffled[i]).length;
    const totalCount = shuffled.filter((w) => w === shuffled[i]).length;
    return i >= totalCount - (totalCount - usedCount);
  });

  const addWord = (word: string) => {
    if (submitted) return;
    onChange([...placed, word].join(" "));
  };
  const removeWord = (idx: number) => {
    if (submitted) return;
    const next = [...placed];
    next.splice(idx, 1);
    onChange(next.join(" "));
  };

  return (
    <div className="ml-5 space-y-3">
      {/* Sentence builder */}
      <div className="min-h-10 border border-gray-300 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 bg-white">
        {placed.length === 0 && <span className="text-sm text-gray-600">Click words below to build the sentence...</span>}
        {placed.map((word, i) => (
          <button
            key={i}
            onClick={() => removeWord(i)}
            disabled={submitted}
            className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm hover:bg-blue-200 disabled:cursor-default transition-colors"
          >
            {word}
          </button>
        ))}
      </div>
      {/* Word bank */}
      {!submitted && (
        <div className="flex flex-wrap gap-1.5">
          {bankWords.map((word, i) => (
            <button
              key={i}
              onClick={() => addWord(word)}
              className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
