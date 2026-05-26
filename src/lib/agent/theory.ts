import Anthropic from "@anthropic-ai/sdk";
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
    system: `You are formatting a chapter in a personal German grammar workbook for a ${level} learner.
Your source is the teacher's original lesson material. Extract and organize the teacher's actual explanations, rules, and examples — do NOT add or invent content not present in the source text.
Format it clearly with markdown: headers, tables where the source has table-like content, bullet points for rules.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Extract and format the teacher's explanations for the chapter: "${topicTitle}"

${updateInstruction}

Teacher's source material:
---
${sourceText.slice(0, 6000)}
---

Respond with this JSON:
{
  "summary": "One sentence describing the topic based on the source material",
  "theory": "The teacher's explanations formatted as clean markdown. Preserve the teacher's wording, examples, and rules. Use headers, tables, and bullet points to improve readability, but do not add content that isn't in the source."
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
  return JSON.parse(jsonMatch[0]) as { summary: string; theory: string };
}
