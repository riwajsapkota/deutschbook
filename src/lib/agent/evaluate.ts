import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  corrected: string | null;
}

export async function evaluateAnswer(
  exerciseType: "translate" | "free_response",
  prompt: string,
  correctAnswer: string,
  userAnswer: string,
  chapterTitle: string
): Promise<EvaluationResult> {
  if (process.env.MOCK_AI === "true") {
    const close = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return {
      correct: close,
      feedback: close
        ? "Great job! Your answer is correct."
        : `Not quite. The expected answer is: "${correctAnswer}". Check your grammar and word order.`,
      corrected: close ? null : correctAnswer,
    };
  }
  const systemPrompt =
    exerciseType === "translate"
      ? `You are a German language teacher evaluating a translation for a B1/B2 learner. Be encouraging but precise. Check grammar, vocabulary, and word order. Minor stylistic differences are fine; grammatical errors are not.`
      : `You are a German language teacher evaluating a free-response answer about "${chapterTitle}". Check that the student correctly applied the grammar rule. Be specific about what is right or wrong.`;

  const userPrompt =
    exerciseType === "translate"
      ? `Evaluate this translation.

Prompt: "${prompt}"
Expected answer: "${correctAnswer}"
Student's answer: "${userAnswer}"

Respond with JSON:
{
  "correct": true | false,
  "feedback": "one or two sentences of specific feedback",
  "corrected": "corrected version if there are errors, or null if correct"
}`
      : `Evaluate this free-response answer about ${chapterTitle}.

Prompt: "${prompt}"
Model answer: "${correctAnswer}"
Student's answer: "${userAnswer}"

Respond with JSON:
{
  "correct": true | false,
  "feedback": "one or two sentences of specific feedback",
  "corrected": "corrected version if there are errors, or null if correct"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { correct: false, feedback: "Could not evaluate answer.", corrected: null };

  return JSON.parse(jsonMatch[0]) as EvaluationResult;
}

export async function askTeacher(
  chapterTitle: string,
  currentSection: string,
  question: string
): Promise<string> {
  if (process.env.MOCK_AI === "true") {
    return `(Mock mode) Great question about ${chapterTitle}! In a real session, I would answer: "${question}" in detail using the theory from the current section. Enable the Anthropic API key to get real answers.`;
  }
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: `You are a patient German language teacher helping a B1/B2 learner understand "${chapterTitle}". Answer concisely and clearly. Use examples in German with English translations. If the question is unrelated to German grammar or vocabulary, politely redirect.`,
    messages: [
      {
        role: "user",
        content: `Current topic section:\n${currentSection.slice(0, 1000)}\n\nStudent question: ${question}`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "I couldn't generate a response.";
}
