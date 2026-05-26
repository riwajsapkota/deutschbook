import { randomUUID } from "crypto";
import { chapters, exercises, materials, sessions, vocabulary, reviewSchedules } from "./db";
import { extractTextFromFile } from "./file-processing";
import { classifyContent } from "./agent/classify";
import { convertExercises } from "./agent/convert";
import { generateTheory } from "./agent/theory";
import { extractVocabulary } from "./agent/vocabulary";
import { initialSchedule } from "./spaced-repetition";
import { Chapter, Material } from "@/types";

async function processMaterial(
  mat: Material,
  sessionId: string,
  existingTitles: string[]
): Promise<boolean> {
  if (mat.file_type === "audio" || mat.file_type === "image") {
    materials.updateStatus(mat.id, "processed");
    return true;
  }

  try {
    materials.updateStatus(mat.id, "processing");

    const text = await extractTextFromFile(mat.file_path);
    if (!text.trim()) {
      materials.updateStatus(mat.id, "processed");
      return true;
    }

    const classification = await classifyContent(text, existingTitles);

    for (const topic of classification.topics) {
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
    return true;
  } catch (err) {
    console.error(`Failed to process material ${mat.id}:`, err);
    materials.updateStatus(mat.id, "failed");
    return false;
  }
}

function updateSessionStatus(sessionId: string): void {
  const allMats = materials.getBySession(sessionId);
  const anyFailed = allMats.some(
    (m) => m.processing_status === "failed" || m.processing_status === "pending"
  );
  sessions.updateStatus(sessionId, anyFailed ? "partially_processed" : "processed");
}

export async function processSession(sessionId: string): Promise<void> {
  const mats = materials.getBySession(sessionId) as Material[];
  const allChapters = chapters.getAll() as Chapter[];
  const existingTitles = allChapters.map((c) => c.title);

  for (const mat of mats) {
    await processMaterial(mat, sessionId, existingTitles);
  }

  updateSessionStatus(sessionId);
}

export async function retryMaterial(sessionId: string, materialId: string): Promise<void> {
  const mat = materials.getById(materialId) as Material | undefined;
  if (!mat) return;

  const allChapters = chapters.getAll() as Chapter[];
  const existingTitles = allChapters.map((c) => c.title);

  await processMaterial(mat, sessionId, existingTitles);
  updateSessionStatus(sessionId);
}
