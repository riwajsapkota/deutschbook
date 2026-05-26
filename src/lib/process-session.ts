import { randomUUID } from "crypto";
import { chapters, exercises, materials, sessions, vocabulary, reviewSchedules } from "./db";
import { extractTextFromFile } from "./file-processing";
import { classifyContent } from "./agent/classify";
import { convertExercises } from "./agent/convert";
import { generateTheory } from "./agent/theory";
import { extractVocabulary } from "./agent/vocabulary";
import { initialSchedule } from "./spaced-repetition";
import { Chapter, Material } from "@/types";

export async function processSession(sessionId: string): Promise<void> {
  const mats = materials.getBySession(sessionId) as Material[];
  const allChapters = chapters.getAll() as Chapter[];
  const existingTitles = allChapters.map((c) => c.title);

  let overallSuccess = true;

  for (const mat of mats) {
    if (mat.file_type === "audio" || mat.file_type === "image") {
      materials.updateStatus(mat.id, "processed");
      continue;
    }

    try {
      materials.updateStatus(mat.id, "processing");

      const text = await extractTextFromFile(mat.file_path);
      if (!text.trim()) {
        materials.updateStatus(mat.id, "processed");
        continue;
      }

      // Step 1: Classify
      const classification = await classifyContent(text, existingTitles);

      for (const topic of classification.topics) {
        // Find or create chapter
        let chapter = chapters.findByTitle(topic.title) as Chapter | undefined;
        if (!chapter) {
          const newId = randomUUID();
          chapters.create({
            id: newId,
            title: topic.title,
            level: topic.level,
            category: topic.category,
          });
          chapter = chapters.getById(newId) as Chapter;
          existingTitles.push(topic.title);
        }

        // Step 2: Convert exercises + schedule for review
        if (classification.hasExercises) {
          const converted = await convertExercises(topic.relevantText || text, topic.title);
          for (const ex of converted) {
            const exId = randomUUID();
            exercises.create({
              id: exId,
              chapter_id: chapter.id,
              session_id: sessionId,
              source_file: mat.original_filename,
              type: ex.type,
              instruction: ex.instruction,
              items: ex.items,
              difficulty: ex.difficulty,
            });

            // Schedule the new exercise for its first review
            const sched = initialSchedule();
            reviewSchedules.upsert({
              id: randomUUID(),
              target_type: "exercise",
              target_id: exId,
              next_review_at: sched.next_review_at.toISOString(),
              interval_days: sched.interval_days,
              ease_factor: sched.ease_factor,
              review_count: sched.review_count,
            });
          }
        }

        // Step 3: Extract / format theory from source material
        const sourceText = topic.relevantText || text.slice(0, 6000);
        const theoryResult = await generateTheory(
          topic.title,
          topic.level,
          sourceText,
          chapter.theory
        );
        chapters.update(chapter.id, {
          summary: theoryResult.summary,
          theory: theoryResult.theory,
        });

        // Step 4: Extract vocabulary
        if (classification.hasVocabulary) {
          const vocab = await extractVocabulary(text, topic.title);
          for (const v of vocab) {
            vocabulary.create({
              id: randomUUID(),
              chapter_id: chapter.id,
              word: v.word,
              article: v.article,
              plural: v.plural,
              translation: v.translation,
              example_sentence: v.example_sentence,
              part_of_speech: v.part_of_speech,
              tags: v.tags,
            });
          }
        }
      }

      materials.updateStatus(mat.id, "processed");
    } catch (err) {
      console.error(`Failed to process material ${mat.id}:`, err);
      materials.updateStatus(mat.id, "failed");
      overallSuccess = false;
    }
  }

  sessions.updateStatus(sessionId, overallSuccess ? "processed" : "partially_processed");
}
