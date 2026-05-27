"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [tab, setTab] = useState<"theory" | "exercises" | "vocabulary">("theory");
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  const handlePrint = () => window.print();

  async function handleExtract() {
    setExtracting(true);
    setExtractMsg(null);
    const res = await fetch("/api/vocab/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    const data = await res.json();
    if (res.ok) {
      setExtractMsg(`${data.count} word${data.count !== 1 ? "s" : ""} extracted`);
      router.refresh();
    } else {
      setExtractMsg(data.error ?? "Extraction failed");
    }
    setExtracting(false);
  }

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
          className="bg-white border border-slate-400 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-300 mb-6 print:hidden">
        {(["theory", "exercises", "vocabulary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t}
            {t === "exercises" && exercises.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {exercises.length}
              </span>
            )}
            {t === "vocabulary" && vocabulary.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
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
            <div className="bg-white border border-slate-200 rounded-lg px-6 py-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-2 first:mt-0 text-slate-900">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2 text-blue-900">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1 text-blue-800">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-slate-800 leading-relaxed mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1 text-sm text-slate-800">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1 text-sm text-slate-800">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-blue-700">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-200">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-100 border border-slate-300 rounded-lg p-4 overflow-x-auto text-xs mb-4">{children}</pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse border border-slate-300">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-blue-50 border border-blue-200 px-3 py-2 text-left font-semibold text-blue-900">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-slate-200 px-3 py-2 text-slate-800">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-400 pl-4 italic text-blue-700 mb-3">{children}</blockquote>
                  ),
                  hr: () => <hr className="my-4 border-slate-300" />,
                }}
              >
                {theory}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-400 rounded-lg px-6 py-10 text-center text-slate-600 text-sm">
              No theory yet. Process a session with materials for this topic to generate it.
            </div>
          )}
        </div>
      )}

      {/* Exercises tab */}
      {tab === "exercises" && (
        <div>
          {exercises.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-400 rounded-lg px-6 py-10 text-center text-slate-600 text-sm">
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
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate text-blue-900">{ex.instruction}</div>
                        <div className="text-xs text-slate-600 mt-0.5">
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
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500">
              {extractMsg && (
                <span className={extractMsg.includes("failed") || extractMsg.includes("error") ? "text-red-500" : "text-green-600"}>
                  {extractMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {extracting ? "Extracting…" : "Re-extract vocabulary"}
            </button>
          </div>
          {vocabulary.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-400 rounded-lg px-6 py-10 text-center text-slate-600 text-sm">
              No vocabulary for this chapter yet.
              <p className="mt-2 text-xs">Use the button above to extract from theory and exercises.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 border-b border-blue-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-blue-900">Word</th>
                    <th className="text-left px-4 py-2 font-semibold text-blue-900">Translation</th>
                    <th className="text-left px-4 py-2 font-semibold text-blue-900 hidden md:table-cell">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabulary.map((v, i) => (
                    <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-3 font-medium text-blue-900">
                        {v.article && <span className="text-indigo-500 text-xs mr-1">{v.article}</span>}
                        {v.word}
                        {v.plural && <span className="text-indigo-500 text-xs ml-1">({v.plural})</span>}
                      </td>
                      <td className="px-4 py-3 text-blue-900 font-medium">{v.translation}</td>
                      <td className="px-4 py-3 text-slate-600 italic hidden md:table-cell">{v.example_sentence}</td>
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
    : "bg-slate-100 text-slate-600";

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
