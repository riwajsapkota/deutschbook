import Link from "next/link";
import { chapters as chaptersDb } from "@/lib/db";
import { Chapter } from "@/types";

export const dynamic = "force-dynamic";

export default function BookPage() {
  const all = chaptersDb.getAll() as Chapter[];

  const grammar = all.filter((c) => c.category === "grammar");
  const vocabChapters = all.filter((c) => c.category === "vocabulary");
  const other = all.filter((c) => c.category === "other");

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">The Book</h1>
      <p className="text-gray-500 mb-8">Your personal German grammar workbook</p>

      {all.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-16 text-center text-gray-500">
          <p className="mb-2 font-medium">No chapters yet</p>
          <p className="text-sm mb-4">
            Create a session, upload your lesson materials, and hit &ldquo;Process&rdquo; to build your first chapter.
          </p>
          <Link href="/sessions/new" className="text-blue-600 hover:underline text-sm">
            Add a session
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grammar.length > 0 && (
            <ChapterSection title="Grammar" chapters={grammar} />
          )}
          {vocabChapters.length > 0 && (
            <ChapterSection title="Vocabulary" chapters={vocabChapters} />
          )}
          {other.length > 0 && (
            <ChapterSection title="Other" chapters={other} />
          )}
        </div>
      )}
    </div>
  );
}

function ChapterSection({ title, chapters }: { title: string; chapters: Chapter[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <ul className="space-y-2">
        {chapters.map((c) => (
          <li key={c.id}>
            <Link
              href={`/book/${c.id}`}
              className="flex items-start justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="font-medium">{c.title}</div>
                {c.summary && (
                  <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">{c.summary}</div>
                )}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded shrink-0 ml-4">
                {c.level}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
