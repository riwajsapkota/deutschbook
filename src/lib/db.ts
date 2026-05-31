import { createClient, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";

function buildUrl(): string {
  if (process.env.TURSO_URL) return process.env.TURSO_URL;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "deutschbook.db")}`;
}

const db = createClient({
  url: buildUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initSchema();
  return schemaReady;
}

// Cast Row[] to unknown[] so callers can use their existing `as T` casts safely
function toRows(rows: unknown[]): unknown[] { return rows; }
function toRow(rows: unknown[]): unknown { return rows[0] ?? null; }

async function initSchema(): Promise<void> {
  await db.batch(
    [
      {
        sql: `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          lecture_number INTEGER,
          raw_notes TEXT,
          status TEXT NOT NULL DEFAULT 'inbox',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS chapters (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'mixed',
          category TEXT NOT NULL DEFAULT 'grammar',
          summary TEXT,
          theory TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          source_file TEXT,
          type TEXT NOT NULL DEFAULT 'fill_in_blank',
          instruction TEXT NOT NULL,
          items TEXT NOT NULL DEFAULT '[]',
          difficulty TEXT NOT NULL DEFAULT 'medium',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (chapter_id) REFERENCES chapters(id),
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS vocabulary (
          id TEXT PRIMARY KEY,
          chapter_id TEXT,
          word TEXT NOT NULL,
          article TEXT,
          plural TEXT,
          translation TEXT NOT NULL,
          example_sentence TEXT NOT NULL DEFAULT '',
          part_of_speech TEXT NOT NULL DEFAULT 'noun',
          tags TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (chapter_id) REFERENCES chapters(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS attempts (
          id TEXT PRIMARY KEY,
          exercise_id TEXT,
          vocabulary_item_id TEXT,
          score REAL NOT NULL DEFAULT 0,
          answers TEXT NOT NULL DEFAULT '[]',
          self_assessment TEXT,
          attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (exercise_id) REFERENCES exercises(id),
          FOREIGN KEY (vocabulary_item_id) REFERENCES vocabulary(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS materials (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_type TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          processing_status TEXT NOT NULL DEFAULT 'pending',
          uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS review_schedules (
          id TEXT PRIMARY KEY,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          next_review_at TEXT NOT NULL,
          interval_days INTEGER NOT NULL DEFAULT 1,
          ease_factor REAL NOT NULL DEFAULT 2.5,
          review_count INTEGER NOT NULL DEFAULT 0,
          UNIQUE(target_type, target_id)
        )`,
        args: [],
      },
      {
        sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_chapter_word ON vocabulary(chapter_id, word)`,
        args: [],
      },
    ],
    "write"
  );

  // One-time deduplication: keep earliest exercise per (chapter_id, source_file, instruction)
  await db.batch(
    [
      {
        sql: `DELETE FROM attempts WHERE exercise_id IN (
          SELECT id FROM exercises
          WHERE rowid NOT IN (SELECT MIN(rowid) FROM exercises GROUP BY chapter_id, source_file, instruction)
        )`,
        args: [],
      },
      {
        sql: `DELETE FROM review_schedules WHERE target_type = 'exercise' AND target_id IN (
          SELECT id FROM exercises
          WHERE rowid NOT IN (SELECT MIN(rowid) FROM exercises GROUP BY chapter_id, source_file, instruction)
        )`,
        args: [],
      },
      {
        sql: `DELETE FROM exercises WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM exercises GROUP BY chapter_id, source_file, instruction
        )`,
        args: [],
      },
    ],
    "write"
  );
}

// Sessions
export const sessions = {
  getAll: async (): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute("SELECT * FROM sessions ORDER BY date DESC");
    return toRows(r.rows);
  },
  getById: async (id: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({ sql: "SELECT * FROM sessions WHERE id = ?", args: [id] });
    return toRow(r.rows);
  },
  findByDateAndLecture: async (date: string, lectureNumber: number | null): Promise<unknown> => {
    await ensureSchema();
    const r =
      lectureNumber != null
        ? await db.execute({
            sql: "SELECT * FROM sessions WHERE date = ? AND lecture_number = ?",
            args: [date, lectureNumber],
          })
        : await db.execute({
            sql: "SELECT * FROM sessions WHERE date = ? AND lecture_number IS NULL",
            args: [date],
          });
    return toRow(r.rows);
  },
  create: async (data: {
    id: string;
    date: string;
    lecture_number?: number | null;
    raw_notes?: string | null;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT INTO sessions (id, date, lecture_number, raw_notes) VALUES (?, ?, ?, ?)",
      args: [data.id, data.date, data.lecture_number ?? null, data.raw_notes ?? null],
    });
  },
  updateStatus: async (id: string, status: string) => {
    await ensureSchema();
    await db.execute({ sql: "UPDATE sessions SET status = ? WHERE id = ?", args: [status, id] });
  },
  updateNotes: async (id: string, notes: string | null) => {
    await ensureSchema();
    await db.execute({ sql: "UPDATE sessions SET raw_notes = ? WHERE id = ?", args: [notes, id] });
  },
  delete: async (id: string) => {
    await ensureSchema();
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [id] });
  },
};

// Chapters
export const chapters = {
  getAll: async (): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute("SELECT * FROM chapters ORDER BY title ASC");
    return toRows(r.rows);
  },
  getById: async (id: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({ sql: "SELECT * FROM chapters WHERE id = ?", args: [id] });
    return toRow(r.rows);
  },
  findByTitle: async (title: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM chapters WHERE lower(title) = lower(?)",
      args: [title],
    });
    return toRow(r.rows);
  },
  deleteOrphaned: async () => {
    await ensureSchema();
    await db.batch(
      [
        {
          sql: `DELETE FROM vocabulary WHERE chapter_id IN (
            SELECT id FROM chapters WHERE id NOT IN (SELECT DISTINCT chapter_id FROM exercises)
          )`,
          args: [],
        },
        {
          sql: `DELETE FROM chapters WHERE id NOT IN (SELECT DISTINCT chapter_id FROM exercises)`,
          args: [],
        },
      ],
      "write"
    );
  },
  deleteById: async (id: string) => {
    await ensureSchema();
    await db.batch(
      [
        { sql: "DELETE FROM vocabulary WHERE chapter_id = ?", args: [id] },
        { sql: "DELETE FROM chapters WHERE id = ?", args: [id] },
      ],
      "write"
    );
  },
  create: async (data: {
    id: string;
    title: string;
    level?: string;
    category?: string;
    summary?: string | null;
    theory?: string | null;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT INTO chapters (id, title, level, category, summary, theory) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        data.id,
        data.title,
        data.level ?? "mixed",
        data.category ?? "grammar",
        data.summary ?? null,
        data.theory ?? null,
      ],
    });
  },
  update: async (
    id: string,
    data: { summary?: string; theory?: string; level?: string; category?: string }
  ) => {
    await ensureSchema();
    const fields: string[] = [];
    const values: InValue[] = [];
    if (data.summary !== undefined) { fields.push("summary = ?"); values.push(data.summary); }
    if (data.theory !== undefined) { fields.push("theory = ?"); values.push(data.theory); }
    if (data.level !== undefined) { fields.push("level = ?"); values.push(data.level); }
    if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category); }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute({ sql: `UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`, args: values });
  },
};

// Exercises
export const exercises = {
  getByChapter: async (chapterId: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM exercises WHERE chapter_id = ? ORDER BY created_at ASC",
      args: [chapterId],
    });
    return toRows(r.rows);
  },
  getBySession: async (sessionId: string): Promise<{ id: string; chapter_id: string }[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT id, chapter_id FROM exercises WHERE session_id = ?",
      args: [sessionId],
    });
    return r.rows as unknown as { id: string; chapter_id: string }[];
  },
  getChapterIdsBySession: async (sessionId: string): Promise<string[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT DISTINCT chapter_id FROM exercises WHERE session_id = ?",
      args: [sessionId],
    });
    return (r.rows as unknown as { chapter_id: string }[]).map((row) => row.chapter_id);
  },
  deleteBySession: async (sessionId: string) => {
    await ensureSchema();
    await db.execute({ sql: "DELETE FROM exercises WHERE session_id = ?", args: [sessionId] });
  },
  getById: async (id: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({ sql: "SELECT * FROM exercises WHERE id = ?", args: [id] });
    return toRow(r.rows);
  },
  create: async (data: {
    id: string;
    chapter_id: string;
    session_id: string;
    source_file?: string | null;
    type: string;
    instruction: string;
    items: unknown[];
    difficulty?: string;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT INTO exercises (id, chapter_id, session_id, source_file, type, instruction, items, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        data.id,
        data.chapter_id,
        data.session_id,
        data.source_file ?? null,
        data.type,
        data.instruction,
        JSON.stringify(data.items),
        data.difficulty ?? "medium",
      ],
    });
  },
  deleteByChapterAndFile: async (chapterId: string, sourceFile: string) => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT id FROM exercises WHERE chapter_id = ? AND source_file = ?",
      args: [chapterId, sourceFile],
    });
    const ids = (r.rows as unknown as { id: string }[]).map((row) => row.id);
    if (ids.length === 0) return;
    const ph = ids.map(() => "?").join(",");
    await db.batch(
      [
        { sql: `DELETE FROM attempts WHERE exercise_id IN (${ph})`, args: ids },
        { sql: `DELETE FROM review_schedules WHERE target_type = 'exercise' AND target_id IN (${ph})`, args: ids },
        { sql: "DELETE FROM exercises WHERE chapter_id = ? AND source_file = ?", args: [chapterId, sourceFile] },
      ],
      "write"
    );
  },
};

// Vocabulary
export const vocabulary = {
  getAll: async (): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute("SELECT * FROM vocabulary ORDER BY word ASC");
    return toRows(r.rows);
  },
  getByChapter: async (chapterId: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM vocabulary WHERE chapter_id = ? ORDER BY word ASC",
      args: [chapterId],
    });
    return toRows(r.rows);
  },
  create: async (data: {
    id: string;
    chapter_id?: string | null;
    word: string;
    article?: string | null;
    plural?: string | null;
    translation: string;
    example_sentence?: string;
    part_of_speech?: string;
    tags?: string[];
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT OR IGNORE INTO vocabulary (id, chapter_id, word, article, plural, translation, example_sentence, part_of_speech, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        data.id,
        data.chapter_id ?? null,
        data.word,
        data.article ?? null,
        data.plural ?? null,
        data.translation,
        data.example_sentence ?? "",
        data.part_of_speech ?? "noun",
        JSON.stringify(data.tags ?? []),
      ],
    });
  },
  update: async (
    id: string,
    data: {
      word?: string;
      article?: string | null;
      plural?: string | null;
      translation?: string;
      example_sentence?: string;
      part_of_speech?: string;
      tags?: string[];
    }
  ) => {
    await ensureSchema();
    const fields: string[] = [];
    const values: InValue[] = [];
    if (data.word !== undefined) { fields.push("word = ?"); values.push(data.word); }
    if ("article" in data) { fields.push("article = ?"); values.push(data.article ?? null); }
    if ("plural" in data) { fields.push("plural = ?"); values.push(data.plural ?? null); }
    if (data.translation !== undefined) { fields.push("translation = ?"); values.push(data.translation); }
    if (data.example_sentence !== undefined) { fields.push("example_sentence = ?"); values.push(data.example_sentence); }
    if (data.part_of_speech !== undefined) { fields.push("part_of_speech = ?"); values.push(data.part_of_speech); }
    if (data.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(data.tags)); }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute({ sql: `UPDATE vocabulary SET ${fields.join(", ")} WHERE id = ?`, args: values });
  },
  delete: async (id: string) => {
    await ensureSchema();
    await db.execute({ sql: "DELETE FROM vocabulary WHERE id = ?", args: [id] });
  },
  deleteByChapter: async (chapterId: string) => {
    await ensureSchema();
    await db.execute({ sql: "DELETE FROM vocabulary WHERE chapter_id = ?", args: [chapterId] });
  },
};

// Attempts
export const attempts = {
  deleteByExerciseIds: async (ids: string[]) => {
    if (ids.length === 0) return;
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    await db.execute({
      sql: `DELETE FROM attempts WHERE exercise_id IN (${placeholders})`,
      args: ids,
    });
  },
  getByExercise: async (exerciseId: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM attempts WHERE exercise_id = ? ORDER BY attempted_at DESC",
      args: [exerciseId],
    });
    return toRows(r.rows);
  },
  getLatestByExercise: async (exerciseId: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM attempts WHERE exercise_id = ? ORDER BY attempted_at DESC LIMIT 1",
      args: [exerciseId],
    });
    return toRow(r.rows);
  },
  create: async (data: {
    id: string;
    exercise_id?: string | null;
    vocabulary_item_id?: string | null;
    score: number;
    answers: unknown[];
    self_assessment?: string | null;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT INTO attempts (id, exercise_id, vocabulary_item_id, score, answers, self_assessment) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        data.id,
        data.exercise_id ?? null,
        data.vocabulary_item_id ?? null,
        data.score,
        JSON.stringify(data.answers),
        data.self_assessment ?? null,
      ],
    });
  },
  getSummaryByChapter: async (chapterId: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: `SELECT e.id as exercise_id, a.score, a.self_assessment, a.attempted_at
            FROM exercises e
            LEFT JOIN attempts a ON a.exercise_id = e.id
            WHERE e.chapter_id = ?
            ORDER BY a.attempted_at DESC`,
      args: [chapterId],
    });
    return toRows(r.rows);
  },
};

// Materials
export const materials = {
  getBySession: async (sessionId: string): Promise<{
    id: string;
    file_path: string;
    original_filename: string;
    file_type: string;
    processing_status: string;
    uploaded_at: string;
  }[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM materials WHERE session_id = ? ORDER BY uploaded_at ASC",
      args: [sessionId],
    });
    return r.rows as unknown as {
      id: string;
      file_path: string;
      original_filename: string;
      file_type: string;
      processing_status: string;
      uploaded_at: string;
    }[];
  },
  resetBySession: async (sessionId: string) => {
    await ensureSchema();
    await db.execute({
      sql: "UPDATE materials SET processing_status = 'pending' WHERE session_id = ?",
      args: [sessionId],
    });
  },
  deleteBySession: async (sessionId: string) => {
    await ensureSchema();
    await db.execute({ sql: "DELETE FROM materials WHERE session_id = ?", args: [sessionId] });
  },
  create: async (data: {
    id: string;
    session_id: string;
    file_path: string;
    file_type: string;
    original_filename: string;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: "INSERT INTO materials (id, session_id, file_path, file_type, original_filename) VALUES (?, ?, ?, ?, ?)",
      args: [data.id, data.session_id, data.file_path, data.file_type, data.original_filename],
    });
  },
  getById: async (id: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({ sql: "SELECT * FROM materials WHERE id = ?", args: [id] });
    return toRow(r.rows);
  },
  updateStatus: async (id: string, status: string) => {
    await ensureSchema();
    await db.execute({
      sql: "UPDATE materials SET processing_status = ? WHERE id = ?",
      args: [status, id],
    });
  },
};

// Review schedules
export const reviewSchedules = {
  deleteByExerciseIds: async (ids: string[]) => {
    if (ids.length === 0) return;
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    await db.execute({
      sql: `DELETE FROM review_schedules WHERE target_type = 'exercise' AND target_id IN (${placeholders})`,
      args: ids,
    });
  },
  getDue: async (now: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM review_schedules WHERE next_review_at <= ? ORDER BY next_review_at ASC",
      args: [now],
    });
    return toRows(r.rows);
  },
  upsert: async (data: {
    id: string;
    target_type: string;
    target_id: string;
    next_review_at: string;
    interval_days?: number;
    ease_factor?: number;
    review_count?: number;
  }) => {
    await ensureSchema();
    await db.execute({
      sql: `INSERT INTO review_schedules (id, target_type, target_id, next_review_at, interval_days, ease_factor, review_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(target_type, target_id) DO UPDATE SET
              next_review_at = excluded.next_review_at,
              interval_days = excluded.interval_days,
              ease_factor = excluded.ease_factor,
              review_count = excluded.review_count`,
      args: [
        data.id,
        data.target_type,
        data.target_id,
        data.next_review_at,
        data.interval_days ?? 1,
        data.ease_factor ?? 2.5,
        data.review_count ?? 0,
      ],
    });
  },
  getByTarget: async (target_type: string, target_id: string): Promise<unknown> => {
    await ensureSchema();
    const r = await db.execute({
      sql: "SELECT * FROM review_schedules WHERE target_type = ? AND target_id = ?",
      args: [target_type, target_id],
    });
    return toRow(r.rows);
  },
  getDueExercises: async (now: string): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: `SELECT e.*, c.title as chapter_title, c.category, c.level,
                   rs.next_review_at, rs.interval_days, rs.ease_factor, rs.review_count
            FROM exercises e
            JOIN chapters c ON c.id = e.chapter_id
            LEFT JOIN review_schedules rs ON rs.target_id = e.id AND rs.target_type = 'exercise'
            WHERE rs.next_review_at <= ? OR rs.id IS NULL
            ORDER BY rs.next_review_at ASC`,
      args: [now],
    });
    return toRows(r.rows);
  },
  getChapterHealth: async (): Promise<unknown[]> => {
    await ensureSchema();
    const r = await db.execute({
      sql: `SELECT
              c.id,
              COUNT(e.id) as total_exercises,
              SUM(CASE WHEN rs.next_review_at < datetime('now') THEN 1 ELSE 0 END) as overdue,
              SUM(CASE WHEN rs.next_review_at BETWEEN datetime('now') AND datetime('now', '+3 days') THEN 1 ELSE 0 END) as due_soon,
              MIN(rs.next_review_at) as earliest_due
            FROM chapters c
            LEFT JOIN exercises e ON e.chapter_id = c.id
            LEFT JOIN review_schedules rs ON rs.target_id = e.id AND rs.target_type = 'exercise'
            GROUP BY c.id`,
      args: [],
    });
    return toRows(r.rows);
  },
  countDueNow: async (now: string): Promise<number> => {
    await ensureSchema();
    const r = await db.execute({
      sql: `SELECT COUNT(*) as count FROM review_schedules
            WHERE target_type = 'exercise' AND next_review_at <= ?`,
      args: [now],
    });
    return (r.rows[0] as unknown as { count: number }).count;
  },
};

export async function search(query: string) {
  await ensureSchema();
  const q = `%${query.toLowerCase()}%`;
  const [chaptersResult, vocabResult, exercisesResult] = await Promise.all([
    db.execute({
      sql: `SELECT id, title, summary, level, category
            FROM chapters
            WHERE lower(title) LIKE ? OR lower(summary) LIKE ?
            LIMIT 5`,
      args: [q, q],
    }),
    db.execute({
      sql: `SELECT id, word, article, translation, part_of_speech, chapter_id
            FROM vocabulary
            WHERE lower(word) LIKE ? OR lower(translation) LIKE ?
            LIMIT 8`,
      args: [q, q],
    }),
    db.execute({
      sql: `SELECT e.id, e.instruction, e.type, e.chapter_id, c.title AS chapter_title
            FROM exercises e
            JOIN chapters c ON c.id = e.chapter_id
            WHERE lower(e.instruction) LIKE ?
            LIMIT 5`,
      args: [q],
    }),
  ]);
  return {
    chapters: toRows(chaptersResult.rows),
    vocab: toRows(vocabResult.rows),
    exercises: toRows(exercisesResult.rows),
  };
}
