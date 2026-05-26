import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { mockTheory } from "./mock";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateTheory(
  topicTitle: string,
  level: string,
  sourceText: string,
  existingTheory?: string | null
): Promise<{ summary: string; theory: string }> {
  if (process.env.MOCK_AI === "true") return mockTheory;

  const updateInstruction = existingTheory
    ? `There is existing content for this chapter. Merge in any new material from the source below, preserving what is already there:\n\n${existingTheory.slice(0, 2000)}`
    : "There is no existing content for this chapter yet.";

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    system: `You are writing a chapter in a personal German grammar workbook for a ${level} learner.
If the source material contains the teacher's explanations, rules, or notes: extract and preserve them faithfully — format into clean markdown but do not add content beyond what is in the source.
If the source material is exercises-only with no explanations: write a concise grammar reference (rules, formation table, key examples) for the topic based on what the exercises are practicing.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Write the theory section for the chapter: "${topicTitle}"

${updateInstruction}

Source material (may be teacher notes, exercises, or both):
---
${sourceText.slice(0, 6000)}
---

Respond with this JSON:
{
  "summary": "One sentence describing the topic",
  "theory": "Markdown content. If the source has teacher explanations, preserve them. If it is exercise-only, write a concise grammar reference covering the rule, formation, and 2-3 clear examples."
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { summary: topicTitle, theory: "Theory not generated." };
  }
  return JSON.parse(jsonrepair(jsonMatch[0])) as { summary: string; theory: string };
}
