import Anthropic from "@anthropic-ai/sdk";
import { mockClassification } from "./mock";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ClassifiedTopic {
  title: string;
  category: "grammar" | "vocabulary" | "other";
  level: "B1" | "B2" | "mixed";
  relevantText: string;
}

export interface ClassificationResult {
  topics: ClassifiedTopic[];
  hasExercises: boolean;
  hasVocabulary: boolean;
  summary: string;
}

export async function classifyContent(
  extractedText: string,
  existingChapterTitles: string[]
): Promise<ClassificationResult> {
  if (process.env.MOCK_AI === "true") return mockClassification;

  const existingList =
    existingChapterTitles.length > 0
      ? `Existing chapters: ${existingChapterTitles.join(", ")}`
      : "No existing chapters yet.";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: `You are analyzing German language learning materials for a B1/B2 learner.
Your job is to identify grammar topics, vocabulary themes, and exercise types present in the text.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Analyze this text from a German lesson material and identify what grammar topics or vocabulary themes it covers.

${existingList}

IMPORTANT: Identify the PRIMARY grammar topic being practiced, not secondary grammar that appears incidentally.
For example, if a text has fill-in-the-blank exercises for prepositions (mit, nach, von, zu...), the topic is "Präpositionen" — not "Konjunktiv II" just because some sentences happen to use modal verbs.
Focus on what the student is being asked to practice.

Only reuse an existing chapter title if the content is genuinely about that same topic — do not force-fit.
If it's a new topic, create a clear German grammar title (e.g., "Präpositionen mit Dativ", "Konjunktiv II", "Relativsätze").

Text to analyze:
---
${extractedText.slice(0, 6000)}
---

Respond with this JSON structure:
{
  "topics": [
    {
      "title": "string (the primary grammar concept or vocabulary theme being practiced)",
      "category": "grammar" | "vocabulary" | "other",
      "level": "B1" | "B2" | "mixed",
      "relevantText": "copy the relevant paragraphs and sentences verbatim from the source text that explain this topic — if the material is exercise-only with no explanation, copy a representative set of exercises that show the grammar pattern being practiced"
    }
  ],
  "hasExercises": boolean,
  "hasVocabulary": boolean,
  "summary": "one sentence describing the overall content of this material"
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { topics: [], hasExercises: false, hasVocabulary: false, summary: "Could not classify content." };
  }
  return JSON.parse(jsonMatch[0]) as ClassificationResult;
}
