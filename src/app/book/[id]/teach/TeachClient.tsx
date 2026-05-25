"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  chapterId: string;
  chapterTitle: string;
  theory: string;
  exerciseCount: number;
}

interface QAMessage {
  role: "user" | "teacher";
  text: string;
}

function splitIntoSections(theory: string): { heading: string; content: string }[] {
  if (!theory.trim()) return [{ heading: "Introduction", content: "No theory content yet." }];

  const lines = theory.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "Introduction";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (currentLines.some((l) => l.trim())) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
      }
      currentHeading = line.replace(/^#{1,2} /, "");
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.some((l) => l.trim())) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
  }

  return sections.length > 0 ? sections : [{ heading: "Theory", content: theory }];
}

export default function TeachClient({ chapterId, chapterTitle, theory, exerciseCount }: Props) {
  const sections = useMemo(() => splitIntoSections(theory), [theory]);
  const [step, setStep] = useState(0); // 0..sections.length-1, then sections.length = done
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [asking, setAsking] = useState(false);

  const isDone = step >= sections.length;
  const current = sections[step];
  const progress = Math.round((step / sections.length) * 100);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setAsking(true);

    const res = await fetch(`/api/chapters/${chapterId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, context: current?.content ?? "" }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: "teacher", text: data.answer }]);
    setAsking(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/book" className="hover:underline">Book</Link>
        <span>/</span>
        <Link href={`/book/${chapterId}`} className="hover:underline">{chapterTitle}</Link>
        <span>/</span>
        <span>Teach</span>
      </div>

      <h1 className="text-xl font-bold mb-1">{chapterTitle}</h1>
      <p className="text-sm text-gray-500 mb-5">Step-by-step teaching mode</p>

      {/* Progress bar */}
      {!isDone && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{current.heading}</span>
            <span>{step + 1} / {sections.length}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Content or Done screen */}
      {isDone ? (
        <div className="bg-white border border-green-200 rounded-lg px-6 py-10 text-center">
          <div className="text-3xl mb-3">✓</div>
          <h2 className="text-lg font-bold mb-2">You&apos;ve covered all sections of {chapterTitle}</h2>
          <p className="text-sm text-gray-500 mb-6">Ready to put it into practice?</p>
          <div className="flex justify-center gap-3">
            {exerciseCount > 0 ? (
              <Link
                href={`/book/${chapterId}?tab=exercises`}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Practice ({exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""})
              </Link>
            ) : (
              <Link
                href={`/book/${chapterId}`}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Back to chapter
              </Link>
            )}
            <button
              onClick={() => setStep(0)}
              className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Review again
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-6 mb-6">
          <h2 className="text-base font-semibold mb-4 text-blue-700">{current.heading}</h2>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-sm text-gray-800 leading-relaxed mb-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1 text-sm text-gray-800">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1 text-sm text-gray-800">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
              code: ({ children }) => <code className="bg-gray-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse border border-gray-200">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">{children}</th>,
              td: ({ children }) => <td className="border border-gray-200 px-3 py-2 text-gray-700">{children}</td>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-3">{children}</blockquote>,
            }}
          >
            {current.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Navigation */}
      {!isDone && (
        <div className="flex gap-3 mb-8">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => setStep((s) => s + 1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {step === sections.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      )}

      {/* Inline Q&A */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ask a question</h3>

        {messages.length > 0 && (
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 italic">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !asking && handleAsk()}
            placeholder="Ask your teacher a question..."
            disabled={asking}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleAsk}
            disabled={asking || !question.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
