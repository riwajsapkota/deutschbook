import Anthropic from "@anthropic-ai/sdk";

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
  const existingList =
    existingChapterTitles.length > 0
      ? `Existing chapters: ${existingChapterTitles.join(", ")}`
      : "No existing chapters yet.";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are analyzing German language learning materials for a B1/B2 learner.
Your job is to identify grammar topics, vocabulary themes, and exercise types present in the text.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Analyze this text from a German lesson material and identify what grammar topics or vocabulary themes it covers.

${existingList}

If a topic matches an existing chapter title (fuzzy match is fine), use that exact title.
If it's a new topic, create a clear title (e.g., "Konjunktiv II", "Relativsätze", "Präpositionen mit Dativ").

Text to analyze:
---
${extractedText.slice(0, 6000)}
---

Respond with this JSON structure:
{
  "topics": [
    {
      "title": "string (grammar concept or vocabulary theme)",
      "category": "grammar" | "vocabulary" | "other",
      "level": "B1" | "B2" | "mixed",
      "relevantText": "brief excerpt or description of what exercises/content covers this topic"
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
