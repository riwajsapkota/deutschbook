export type SessionStatus = "inbox" | "processed" | "partially_processed";
export type ChapterLevel = "B1" | "B2" | "mixed";
export type ChapterCategory = "grammar" | "vocabulary" | "other";
export type ExerciseType =
  | "fill_in_blank"
  | "multiple_choice"
  | "reorder"
  | "translate"
  | "free_response";
export type Difficulty = "easy" | "medium" | "hard";
export type FileType = "pdf" | "audio" | "excel" | "word" | "image" | "text";
export type ProcessingStatus = "pending" | "processed" | "failed";
export type ReviewTargetType = "chapter" | "exercise" | "vocabulary";
export type SelfAssessment = "solid" | "shaky" | "forgotten";

export interface Session {
  id: string;
  date: string;
  lecture_number: number | null;
  raw_notes: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface Chapter {
  id: string;
  title: string;
  level: ChapterLevel;
  category: ChapterCategory;
  summary: string | null;
  theory: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlankAnswer {
  position: number;
  correct_answer: string;
  alternatives: string[];
}

export interface ExerciseItem {
  id: string;
  prompt: string;
  blanks: BlankAnswer[];
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface Exercise {
  id: string;
  chapter_id: string;
  session_id: string;
  source_file: string | null;
  type: ExerciseType;
  instruction: string;
  items: ExerciseItem[];
  difficulty: Difficulty;
  created_at: string;
}

export interface VocabularyItem {
  id: string;
  chapter_id: string | null;
  word: string;
  article: string | null;
  plural: string | null;
  translation: string;
  example_sentence: string;
  part_of_speech: string;
  tags: string[];
  created_at: string;
}

export interface AttemptAnswer {
  item_id: string;
  given_answer: string;
  correct: boolean;
}

export interface Attempt {
  id: string;
  exercise_id: string | null;
  vocabulary_item_id: string | null;
  score: number;
  answers: AttemptAnswer[];
  self_assessment: SelfAssessment | null;
  attempted_at: string;
}

export interface Material {
  id: string;
  session_id: string;
  file_path: string;
  file_type: FileType;
  original_filename: string;
  processing_status: ProcessingStatus;
  uploaded_at: string;
}

export interface ReviewSchedule {
  id: string;
  target_type: ReviewTargetType;
  target_id: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}
