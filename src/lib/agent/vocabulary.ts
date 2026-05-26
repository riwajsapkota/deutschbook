import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { VocabularyItem } from "@/types";
import { mockVocabulary } from "./mock";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type VocabResult = Omit<VocabularyItem, "id" | "chapter_id" | "created_at">;

export async function extractVocabulary(
  text: string,
  chapterTitle: string
): Promise<VocabResult[]> {
  if (process.env.MOCK_AI === "true") return mockVocabulary;
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are extracting vocabulary from German B1/B2 learning materials.
Focus on significant words: verbs with irregular forms, adjectives, important nouns with articles.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Extract notable vocabulary from this German lesson material about "${chapterTitle}".
Focus on B1/B2 level words that a learner should know.

Text:
---
${text.slice(0, 4000)}
---

Respond with this JSON:
{
  "vocabulary": [
    {
      "word": "bemerken",
      "article": null,
      "plural": null,
      "translation": "to notice, to realize",
      "example_sentence": "Ich habe bemerkt, dass er müde war.",
      "part_of_speech": "verb",
      "tags": ["irregular"]
    }
  ]
}

Only include 5-15 of the most important vocabulary items. For nouns always include the article (der/die/das).`,
      },
    ],
  });

  const text2 =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text2.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const result = JSON.parse(jsonrepair(jsonMatch[0])) as { vocabulary: VocabResult[] };
  return result.vocabulary ?? [];
}
