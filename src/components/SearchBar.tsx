"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChapterResult {
  id: string;
  title: string;
  summary: string | null;
  level: string;
  category: string;
}

interface VocabResult {
  id: string;
  word: string;
  article: string | null;
  translation: string;
  part_of_speech: string;
  chapter_id: string | null;
}

interface ExerciseResult {
  id: string;
  instruction: string;
  type: string;
  chapter_id: string;
  chapter_title: string;
}

interface SearchResults {
  chapters: ChapterResult[];
  vocab: VocabResult[];
  exercises: ExerciseResult[];
}

const empty: SearchResults = { chapters: [], vocab: [], exercises: [] };

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(empty);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const hasResults =
    results.chapters.length + results.vocab.length + results.exercises.length > 0;

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard: Escape closes, Cmd/Ctrl+K opens
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults(empty);
  }

  function navigate(href: string) {
    close();
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative ml-auto">
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition-colors"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-xs text-slate-500 border border-slate-600 rounded px-1">⌘K</kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <SearchIcon className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapters, vocabulary, exercises…"
              className="flex-1 text-sm outline-none text-slate-900 placeholder-slate-400"
            />
            {loading && <SpinnerIcon />}
            {query && (
              <button onClick={() => { setQuery(""); setResults(empty); }} className="text-slate-400 hover:text-slate-600">
                <XIcon />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[420px] overflow-y-auto">
            {query.length < 2 ? (
              <p className="text-xs text-slate-400 px-4 py-6 text-center">Type at least 2 characters to search</p>
            ) : !loading && !hasResults ? (
              <p className="text-xs text-slate-400 px-4 py-6 text-center">No results for &ldquo;{query}&rdquo;</p>
            ) : (
              <>
                {results.chapters.length > 0 && (
                  <Section label="Chapters">
                    {results.chapters.map((c) => (
                      <ResultRow
                        key={c.id}
                        onClick={() => navigate(`/book/${c.id}`)}
                        icon={<BookIcon />}
                        primary={c.title}
                        secondary={c.summary ?? `${c.level} · ${c.category}`}
                      />
                    ))}
                  </Section>
                )}
                {results.vocab.length > 0 && (
                  <Section label="Vocabulary">
                    {results.vocab.map((v) => (
                      <ResultRow
                        key={v.id}
                        onClick={() => navigate("/vocab")}
                        icon={<WordIcon />}
                        primary={
                          <>
                            {v.article && <span className="text-slate-400 text-xs mr-1">{v.article}</span>}
                            {v.word}
                          </>
                        }
                        secondary={v.translation}
                      />
                    ))}
                  </Section>
                )}
                {results.exercises.length > 0 && (
                  <Section label="Exercises">
                    {results.exercises.map((e) => (
                      <ResultRow
                        key={e.id}
                        onClick={() => navigate(`/book/${e.chapter_id}/exercise/${e.id}`)}
                        icon={<ExerciseIcon />}
                        primary={e.instruction.length > 60 ? e.instruction.slice(0, 60) + "…" : e.instruction}
                        secondary={e.chapter_title}
                      />
                    ))}
                  </Section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      {children}
    </div>
  );
}

function ResultRow({
  onClick,
  icon,
  primary,
  secondary,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  primary: React.ReactNode;
  secondary: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
    >
      <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{primary}</div>
        <div className="text-xs text-slate-500 truncate">{secondary}</div>
      </div>
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg className="animate-spin text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function WordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}
function ExerciseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
