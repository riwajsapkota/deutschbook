import Link from "next/link";
import { notFound } from "next/navigation";
import { chapters as chaptersDb, exercises as exercisesDb, vocabulary as vocabDb } from "@/lib/db";
import { Chapter, Exercise, VocabularyItem } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = chaptersDb.getById(id) as Chapter | undefined;
  if (!chapter) notFound();

  const exs = exercisesDb.getByChapter(id) as (Omit<Exercise, "items"> & { items: string })[];
  const vocab = vocabDb.getByChapter(id) as (Omit<VocabularyItem, "tags"> & { tags: string })[];

  const exercises: Exercise[] = exs.map((e) => ({
    ...e,
    items: typeof e.items === "string" ? JSON.parse(e.items) : e.items,
  }));

  const vocabulary: VocabularyItem[] = vocab.map((v) => ({
    ...v,
    tags: typeof v.tags === "string" ? JSON.parse(v.tags) : v.tags,
  }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/book" className="hover:underline">Book</Link>
        <span>/</span>
        <span>{chapter.title}</span>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">{chapter.title}</h1>
        <div className="flex gap-2 shrink-0 ml-4">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
            {chapter.category}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {chapter.level}
          </span>
        </div>
      </div>

      {chapter.summary && (
        <p className="text-gray-600 mb-8">{chapter.summary}</p>
      )}

      {/* Theory */}
      {chapter.theory && (
        <section className="mb-10">
          <h2 className="font-semibold text-lg mb-3">Theory</h2>
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 prose prose-sm max-w-none">
            <TheoryContent content={chapter.theory} />
          </div>
        </section>
      )}

      {/* Exercises */}
      <section className="mb-10">
        <h2 className="font-semibold text-lg mb-3">
          Exercises ({exercises.length})
        </h2>
        {exercises.length === 0 ? (
          <p className="text-sm text-gray-500">No exercises yet for this chapter.</p>
        ) : (
          <ul className="space-y-3">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <Link
                  href={`/book/${id}/exercise/${ex.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-blue-300 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{ex.instruction}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {ex.items.length} item{ex.items.length !== 1 ? "s" : ""} · {ex.type.replace(/_/g, " ")}
                      {ex.source_file ? ` · ${ex.source_file}` : ""}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize shrink-0 ml-4 ${difficultyColor(ex.difficulty)}`}>
                    {ex.difficulty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vocabulary */}
      {vocabulary.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">
            Vocabulary ({vocabulary.length})
          </h2>
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
                      {v.article ? <span className="text-gray-400 text-xs mr-1">{v.article}</span> : null}
                      {v.word}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.translation}</td>
                    <td className="px-4 py-3 text-gray-500 italic hidden md:table-cell">{v.example_sentence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function TheoryContent({ content }: { content: string }) {
  // Render markdown-like content with basic formatting
  const lines = content.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-3">{line.slice(4)}</h3>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

function difficultyColor(d: string) {
  return d === "easy"
    ? "bg-green-100 text-green-700"
    : d === "hard"
    ? "bg-red-100 text-red-700"
    : "bg-yellow-100 text-yellow-700";
}
