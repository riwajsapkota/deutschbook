"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Exercise, VocabularyItem } from "@/types";

interface LatestAttempt {
  score: number;
  self_assessment: string | null;
}

interface Props {
  chapterId: string;
  theory: string | null;
  exercises: Exercise[];
  vocabulary: VocabularyItem[];
  latestAttempts: Record<string, LatestAttempt | null>;
}

export default function ChapterClient({ chapterId, theory, exercises, vocabulary, latestAttempts }: Props) {
  const [tab, setTab] = useState<"theory" | "exercises" | "vocabulary">("theory");

  const handlePrint = () => window.print();

  return (
    <div>
      {/* Action buttons */}
      <div className="flex gap-2 mb-4 print:hidden">
        <Link
          href={`/book/${chapterId}/teach`}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Teach me this
        </Link>
        <button
          onClick={handlePrint}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 print:hidden">
        {(["theory", "exercises", "vocabulary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
            {t === "exercises" && exercises.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {exercises.length}
              </span>
            )}
            {t === "vocabulary" && vocabulary.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {vocabulary.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Theory tab */}
      {tab === "theory" && (
        <div>
          {theory ? (
            <div className="bg-white border border-gray-200 rounded-lg px-6 py-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-2 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-gray-800 leading-relaxed mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1 text-sm text-gray-800">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1 text-sm text-gray-800">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs mb-4">{children}</pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse border border-gray-200">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-200 px-3 py-2 text-gray-700">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-3">{children}</blockquote>
                  ),
                  hr: () => <hr className="my-4 border-gray-200" />,
                }}
              >
                {theory}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-10 text-center text-gray-500 text-sm">
              No theory yet. Process a session with materials for this topic to generate it.
            </div>
          )}
        </div>
      )}

      {/* Exercises tab */}
      {tab === "exercises" && (
        <div>
          {exercises.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-10 text-center text-gray-500 text-sm">
              No exercises yet for this chapter.
            </div>
          ) : (
            <ul className="space-y-3">
              {exercises.map((ex) => {
                const attempt = latestAttempts[ex.id];
                return (
                  <li key={ex.id}>
                    <Link
                      href={`/book/${chapterId}/exercise/${ex.id}`}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{ex.instruction}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {ex.items.length} item{ex.items.length !== 1 ? "s" : ""} · {ex.type.replace(/_/g, " ")}
                          {ex.source_file ? ` · ${ex.source_file}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {attempt && <AttemptBadge attempt={attempt} />}
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${difficultyColor(ex.difficulty)}`}>
                          {ex.difficulty}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Vocabulary tab */}
      {tab === "vocabulary" && (
        <div>
          {vocabulary.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-10 text-center text-gray-500 text-sm">
              No vocabulary for this chapter yet.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Word</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Translation</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabulary.map((v, i) => (
                    <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 font-medium">
                        {v.article && <span className="text-gray-400 text-xs mr-1">{v.article}</span>}
                        {v.word}
                        {v.plural && <span className="text-gray-400 text-xs ml-1">({v.plural})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.translation}</td>
                      <td className="px-4 py-3 text-gray-500 italic hidden md:table-cell">{v.example_sentence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttemptBadge({ attempt }: { attempt: { score: number; self_assessment: string | null } }) {
  const pct = Math.round(attempt.score * 100);
  const sa = attempt.self_assessment;
  const color = sa === "solid"
    ? "bg-green-100 text-green-700"
    : sa === "shaky"
    ? "bg-amber-100 text-amber-700"
    : sa === "forgotten"
    ? "bg-red-100 text-red-700"
    : pct >= 70
    ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600";

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      {sa ?? `${pct}%`}
    </span>
  );
}

function difficultyColor(d: string) {
  return d === "easy"
    ? "bg-green-100 text-green-700"
    : d === "hard"
    ? "bg-red-100 text-red-700"
    : "bg-yellow-100 text-yellow-700";
}
