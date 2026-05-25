import Link from "next/link";
import { chapters as chaptersDb, reviewSchedules } from "@/lib/db";
import { Chapter } from "@/types";

export const dynamic = "force-dynamic";

interface ChapterHealth {
  id: string;
  total_exercises: number;
  overdue: number;
  due_soon: number;
}

export default function BookPage() {
  const all = chaptersDb.getAll() as Chapter[];
  const healthRows = reviewSchedules.getChapterHealth() as ChapterHealth[];
  const healthMap = Object.fromEntries(healthRows.map((r) => [r.id, r]));

  const grammar = all.filter((c) => c.category === "grammar");
  const vocabChapters = all.filter((c) => c.category === "vocabulary");
  const other = all.filter((c) => c.category === "other");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">The Book</h1>
      <p className="text-gray-500 mb-3">Your personal German grammar workbook</p>

      {/* Health legend */}
      {all.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-8">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> All caught up</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Due soon</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Overdue</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Not started</span>
        </div>
      )}

      {all.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-16 text-center text-gray-500">
          <p className="mb-2 font-medium">No chapters yet</p>
          <p className="text-sm mb-4">
            Create a session, upload your lesson materials, and hit &ldquo;Process&rdquo; to build your first chapter.
          </p>
          <Link href="/sessions/new" className="text-blue-600 hover:underline text-sm">Add a session</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grammar.length > 0 && <ChapterSection title="Grammar" chapters={grammar} healthMap={healthMap} />}
          {vocabChapters.length > 0 && <ChapterSection title="Vocabulary" chapters={vocabChapters} healthMap={healthMap} />}
          {other.length > 0 && <ChapterSection title="Other" chapters={other} healthMap={healthMap} />}
        </div>
      )}
    </div>
  );
}

function ChapterSection({ title, chapters, healthMap }: {
  title: string;
  chapters: Chapter[];
  healthMap: Record<string, ChapterHealth>;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <ul className="space-y-2">
        {chapters.map((c) => {
          const h = healthMap[c.id];
          return (
            <li key={c.id}>
              <Link
                href={`/book/${c.id}`}
                className="flex items-start justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <HealthDot health={h} />
                  <div className="min-w-0">
                    <div className="font-medium">{c.title}</div>
                    {c.summary && (
                      <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">{c.summary}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {h && h.overdue > 0 && (
                    <span className="text-xs text-red-600 font-medium">{h.overdue} overdue</span>
                  )}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{c.level}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HealthDot({ health }: { health: ChapterHealth | undefined }) {
  if (!health || health.total_exercises === 0) {
    return <span className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />;
  }
  if (health.overdue > 0) {
    return <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />;
  }
  if (health.due_soon > 0) {
    return <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />;
  }
  return <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />;
}
