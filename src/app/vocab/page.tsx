import { vocabulary as vocabDb } from "@/lib/db";
import { VocabularyItem } from "@/types";
import VocabClient from "./VocabClient";

export const dynamic = "force-dynamic";

export default async function VocabPage() {
  const raw = (await vocabDb.getAll()) as (Omit<VocabularyItem, "tags"> & { tags: string })[];
  const all: VocabularyItem[] = raw.map((v) => ({
    ...v,
    tags: typeof v.tags === "string" ? JSON.parse(v.tags) : v.tags,
  }));

  return <VocabClient initialVocab={all} />;
}
