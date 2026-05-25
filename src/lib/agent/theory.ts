import Anthropic from "@anthropic-ai/sdk";
import { mockTheory } from "./mock";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateTheory(
  topicTitle: string,
  level: string,
  exerciseSamples: string,
  existingTheory?: string | null
): Promise<{ summary: string; theory: string }> {
  if (process.env.MOCK_AI === "true") return mockTheory;

  const updateInstruction = existingTheory
    ? `There is existing theory content. Update or expand it with any new nuances from the exercises, but preserve what is already good:\n\n${existingTheory.slice(0, 2000)}`
    : "There is no existing theory. Write it from scratch.";

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    system: `You are writing a chapter in a personal German grammar textbook for a ${level} learner.
Write clearly and concisely with rules, tables where helpful, and example sentences.
Always respond with valid JSON only, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Write or update the theory section for the chapter: "${topicTitle}"

${updateInstruction}

Here are sample exercises to help you understand what the chapter covers:
${exerciseSamples.slice(0, 2000)}

Respond with this JSON:
{
  "summary": "One sentence describing the topic",
  "theory": "Full theory content in markdown format. Include: explanation of the rule, formation tables if relevant, example sentences, common mistakes to avoid."
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
