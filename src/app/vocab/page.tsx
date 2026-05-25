import { vocabulary as vocabDb } from "@/lib/db";
import { VocabularyItem } from "@/types";

export const dynamic = "force-dynamic";

export default function VocabPage() {
  const raw = vocabDb.getAll() as (Omit<VocabularyItem, "tags"> & { tags: string })[];
  const all: VocabularyItem[] = raw.map((v) => ({
    ...v,
    tags: typeof v.tags === "string" ? JSON.parse(v.tags) : v.tags,
  }));

  const byPos = all.reduce<Record<string, VocabularyItem[]>>((acc, v) => {
    const key = v.part_of_speech || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Vocabulary</h1>
      <p className="text-gray-500 mb-8">{all.length} words across all chapters</p>

      {all.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg px-6 py-16 text-center text-gray-500">
          <p>No vocabulary yet. Process a session to extract words automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byPos).map(([pos, words]) => (
            <section key={pos}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 capitalize">
                {pos}s ({words.length})
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Word</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Translation</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 hidden lg:table-cell">Example</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 hidden md:table-cell">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((v, i) => (
                      <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3 font-medium">
                          {v.article && (
                            <span className="text-gray-400 text-xs mr-1">{v.article}</span>
                          )}
                          {v.word}
                          {v.plural && (
                            <span className="text-gray-400 text-xs ml-1">({v.plural})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{v.translation}</td>
                        <td className="px-4 py-3 text-gray-500 italic hidden lg:table-cell">
                          {v.example_sentence}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {v.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-block text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1"
                            >
                              {t}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
