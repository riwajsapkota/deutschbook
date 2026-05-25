import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "deutschbook.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      lecture_number INTEGER,
      raw_notes TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'mixed',
      category TEXT NOT NULL DEFAULT 'grammar',
      summary TEXT,
      theory TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
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
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
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
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      exercise_id TEXT,
      vocabulary_item_id TEXT,
      score REAL NOT NULL DEFAULT 0,
      answers TEXT NOT NULL DEFAULT '[]',
      self_assessment TEXT,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id),
      FOREIGN KEY (vocabulary_item_id) REFERENCES vocabulary(id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      processing_status TEXT NOT NULL DEFAULT 'pending',
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS review_schedules (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      next_review_at TEXT NOT NULL,
      interval_days INTEGER NOT NULL DEFAULT 1,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      review_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(target_type, target_id)
    );
  `);
}

// Sessions
export const sessions = {
  getAll: () => getDb().prepare("SELECT * FROM sessions ORDER BY date DESC").all(),
  getById: (id: string) =>
    getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id),
  create: (data: {
    id: string;
    date: string;
    lecture_number?: number | null;
    raw_notes?: string | null;
  }) =>
    getDb()
      .prepare(
        "INSERT INTO sessions (id, date, lecture_number, raw_notes) VALUES (?, ?, ?, ?)"
      )
      .run(data.id, data.date, data.lecture_number ?? null, data.raw_notes ?? null),
  updateStatus: (id: string, status: string) =>
    getDb()
      .prepare("UPDATE sessions SET status = ? WHERE id = ?")
      .run(status, id),
};

// Chapters
export const chapters = {
  getAll: () => getDb().prepare("SELECT * FROM chapters ORDER BY title ASC").all(),
  getById: (id: string) =>
    getDb().prepare("SELECT * FROM chapters WHERE id = ?").get(id),
  findByTitle: (title: string) =>
    getDb().prepare("SELECT * FROM chapters WHERE lower(title) = lower(?)").get(title),
  create: (data: {
    id: string;
    title: string;
    level?: string;
    category?: string;
    summary?: string | null;
    theory?: string | null;
  }) =>
    getDb()
      .prepare(
        "INSERT INTO chapters (id, title, level, category, summary, theory) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        data.id,
        data.title,
        data.level ?? "mixed",
        data.category ?? "grammar",
        data.summary ?? null,
        data.theory ?? null
      ),
  update: (
    id: string,
    data: { summary?: string; theory?: string; level?: string; category?: string }
  ) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.summary !== undefined) { fields.push("summary = ?"); values.push(data.summary); }
    if (data.theory !== undefined) { fields.push("theory = ?"); values.push(data.theory); }
    if (data.level !== undefined) { fields.push("level = ?"); values.push(data.level); }
    if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category); }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    getDb().prepare(`UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  },
};

// Exercises
export const exercises = {
  getByChapter: (chapterId: string) =>
    getDb()
      .prepare("SELECT * FROM exercises WHERE chapter_id = ? ORDER BY created_at ASC")
      .all(chapterId),
  getById: (id: string) =>
    getDb().prepare("SELECT * FROM exercises WHERE id = ?").get(id),
  create: (data: {
    id: string;
    chapter_id: string;
    session_id: string;
    source_file?: string | null;
    type: string;
    instruction: string;
    items: unknown[];
    difficulty?: string;
  }) =>
    getDb()
      .prepare(
        "INSERT INTO exercises (id, chapter_id, session_id, source_file, type, instruction, items, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        data.id,
        data.chapter_id,
        data.session_id,
        data.source_file ?? null,
        data.type,
        data.instruction,
        JSON.stringify(data.items),
        data.difficulty ?? "medium"
      ),
};

// Vocabulary
export const vocabulary = {
  getAll: () => getDb().prepare("SELECT * FROM vocabulary ORDER BY word ASC").all(),
  getByChapter: (chapterId: string) =>
    getDb()
      .prepare("SELECT * FROM vocabulary WHERE chapter_id = ? ORDER BY word ASC")
      .all(chapterId),
  create: (data: {
    id: string;
    chapter_id?: string | null;
    word: string;
    article?: string | null;
    plural?: string | null;
    translation: string;
    example_sentence?: string;
    part_of_speech?: string;
    tags?: string[];
  }) =>
    getDb()
      .prepare(
        "INSERT INTO vocabulary (id, chapter_id, word, article, plural, translation, example_sentence, part_of_speech, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        data.id,
        data.chapter_id ?? null,
        data.word,
        data.article ?? null,
        data.plural ?? null,
        data.translation,
        data.example_sentence ?? "",
        data.part_of_speech ?? "noun",
        JSON.stringify(data.tags ?? [])
      ),
};

// Attempts
export const attempts = {
  getByExercise: (exerciseId: string) =>
    getDb()
      .prepare("SELECT * FROM attempts WHERE exercise_id = ? ORDER BY attempted_at DESC")
      .all(exerciseId),
  getLatestByExercise: (exerciseId: string) =>
    getDb()
      .prepare("SELECT * FROM attempts WHERE exercise_id = ? ORDER BY attempted_at DESC LIMIT 1")
      .get(exerciseId),
  create: (data: {
    id: string;
    exercise_id?: string | null;
    vocabulary_item_id?: string | null;
    score: number;
    answers: unknown[];
    self_assessment?: string | null;
  }) =>
    getDb()
      .prepare(
        "INSERT INTO attempts (id, exercise_id, vocabulary_item_id, score, answers, self_assessment) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        data.id,
        data.exercise_id ?? null,
        data.vocabulary_item_id ?? null,
        data.score,
        JSON.stringify(data.answers),
        data.self_assessment ?? null
      ),
  getSummaryByChapter: (chapterId: string) =>
    getDb()
      .prepare(
        `SELECT e.id as exercise_id, a.score, a.self_assessment, a.attempted_at
         FROM exercises e
         LEFT JOIN attempts a ON a.exercise_id = e.id
         WHERE e.chapter_id = ?
         ORDER BY a.attempted_at DESC`
      )
      .all(chapterId),
};

// Materials
export const materials = {
  getBySession: (sessionId: string) =>
    getDb()
      .prepare("SELECT * FROM materials WHERE session_id = ? ORDER BY uploaded_at ASC")
      .all(sessionId),
  create: (data: {
    id: string;
    session_id: string;
    file_path: string;
    file_type: string;
    original_filename: string;
  }) =>
    getDb()
      .prepare(
        "INSERT INTO materials (id, session_id, file_path, file_type, original_filename) VALUES (?, ?, ?, ?, ?)"
      )
      .run(data.id, data.session_id, data.file_path, data.file_type, data.original_filename),
  updateStatus: (id: string, status: string) =>
    getDb()
      .prepare("UPDATE materials SET processing_status = ? WHERE id = ?")
      .run(status, id),
};

// Review schedules
export const reviewSchedules = {
  getDue: (now: string) =>
    getDb()
      .prepare(
        "SELECT * FROM review_schedules WHERE next_review_at <= ? ORDER BY next_review_at ASC"
      )
      .all(now),
  upsert: (data: {
    id: string;
    target_type: string;
    target_id: string;
    next_review_at: string;
    interval_days?: number;
    ease_factor?: number;
    review_count?: number;
  }) =>
    getDb()
      .prepare(
        `INSERT INTO review_schedules (id, target_type, target_id, next_review_at, interval_days, ease_factor, review_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(target_type, target_id) DO UPDATE SET
           next_review_at = excluded.next_review_at,
           interval_days = excluded.interval_days,
           ease_factor = excluded.ease_factor,
           review_count = excluded.review_count`
      )
      .run(
        data.id,
        data.target_type,
        data.target_id,
        data.next_review_at,
        data.interval_days ?? 1,
        data.ease_factor ?? 2.5,
        data.review_count ?? 0
      ),
};
