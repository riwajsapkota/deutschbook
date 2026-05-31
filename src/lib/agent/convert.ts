import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { ExerciseItem, ExerciseType } from "@/types";
import { mockExercises } from "./mock";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ConvertedExercise {
  type: ExerciseType;
  instruction: string;
  items: ExerciseItem[];
  difficulty: "easy" | "medium" | "hard";
}

export async function convertExercises(
  rawText: string,
  topicTitle: string
): Promise<ConvertedExercise[]> {
  if (process.env.MOCK_AI === "true") return mockExercises;
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    system: `You are converting raw German exercise text into structured interactive exercises for a B1/B2 learner.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Convert these German exercises about "${topicTitle}" into structured interactive format.

For fill_in_blank: each item has a "prompt" with ___ marking blanks, and "blanks" array with correct answers. Use ONLY for exercises where students fill in a single word or short phrase.
For free_response: use for exercises where students must construct or write complete sentences (instructions like "Formulieren Sie", "Schreiben Sie", "Bilden Sie Sätze", "Ergänzen Sie den Satz vollständig"). Each item has a "prompt" and a "correct_answer" with a model sentence.
For multiple_choice: each item has "prompt", "options" array, and "correct_answer".
For translate: use for exercises that ask the student to translate a sentence between German and English.
Use "explanation" to briefly explain why the answer is correct.

Raw exercise text:
---
${rawText.slice(0, 5000)}
---

Respond with this JSON:
{
  "exercises": [
    {
      "type": "fill_in_blank" | "multiple_choice" | "translate" | "free_response",
      "instruction": "The instruction text (e.g., 'Ergänzen Sie das Verb im Konjunktiv II')",
      "difficulty": "easy" | "medium" | "hard",
      "items": [
        {
          "id": "1",
          "prompt": "Wenn ich Zeit ___ (haben), würde ich mehr lesen.",
          "blanks": [
            { "position": 0, "correct_answer": "hätte", "alternatives": ["hatte"] }
          ],
          "options": [],
          "correct_answer": "hätte",
          "explanation": "Konjunktiv II of 'haben' is 'hätte'"
        }
      ]
    }
  ]
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const result = JSON.parse(jsonrepair(jsonMatch[0])) as { exercises: ConvertedExercise[] };
    return result.exercises ?? [];
  } catch {
    return [];
  }
}
