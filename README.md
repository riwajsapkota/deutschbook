# Deutschbook

A personal German grammar workbook app. Upload your lesson materials (PDF, Word, etc.) and the app automatically extracts theory, generates exercises, and builds a vocabulary list using Claude AI. Review your content, practice with exercises, and track your progress.

## Features

- **Sessions** — upload lecture materials; AI extracts theory, exercises, and vocabulary automatically
- **Book** — browse grammar chapters with theory, exercises, and vocabulary per chapter
- **Teach me** — interactive step-by-step walkthrough of any chapter's theory
- **Exercises** — fill-in-blank and multiple-choice exercises with scoring and spaced repetition
- **Quiz** — review due exercises based on a spaced-repetition schedule
- **Vocabulary** — full vocabulary list across all chapters; add, edit, or delete words manually; re-extract from theory and exercises with one click
- **Search** — global search across chapters, vocabulary, and exercises (⌘K)

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via `better-sqlite3` |
| AI | Anthropic Claude (Sonnet 4.6) |
| Styling | Tailwind CSS |
| File parsing | `pdf-parse`, `mammoth` (Word), native text |

## Getting started

### Prerequisites
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd deutschbook

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.local.example .env.local
# Then edit .env.local and add your ANTHROPIC_API_KEY

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically at `data/deutschbook.db` on first run. Uploaded files are stored under `data/uploads/`.

### Running in the background (so the terminal stays free)

```bash
nohup npm run dev > dev.log 2>&1 &

# Check logs
tail -f dev.log

# Stop the server
lsof -ti:3000 | xargs kill
```

## Project structure

```
src/
  app/                  # Next.js pages and API routes
    api/
      sessions/         # Upload and process materials
      chapters/         # Chapter CRUD
      vocab/            # Vocabulary CRUD + AI re-extraction
      search/           # Global search endpoint
      quiz/             # Spaced-repetition quiz
      evaluate/         # Exercise scoring
    book/               # Chapter detail, exercises, teach mode
    sessions/           # Session list and upload flow
    vocab/              # Vocabulary page
    quiz/               # Quiz page
  lib/
    db.ts               # All database queries (single source of truth)
    process-session.ts  # Main AI processing pipeline
    agent/
      classify.ts       # Classify uploaded content
      theory.ts         # Generate/update chapter theory
      vocabulary.ts     # Extract vocabulary
      convert.ts        # Convert raw text to exercises
  components/
    SearchBar.tsx       # Global search bar
  types/
    index.ts            # Shared TypeScript types
data/                   # Local data (gitignored)
  deutschbook.db        # SQLite database
  uploads/              # Uploaded source files
```

## AI processing pipeline

When you upload a file to a session and click **Process**:

1. **Extract** — raw text extracted from PDF/Word/etc.
2. **Classify** — Claude identifies topics, whether there's vocabulary, exercises, etc.
3. **Theory** — Claude generates or updates the chapter theory as Markdown
4. **Vocabulary** — Claude extracts B1/B2 vocabulary with articles, translations, examples
5. **Exercises** — Claude converts source material into fill-in-blank and multiple-choice exercises

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `MOCK_AI` | No | Set to `true` to skip AI calls (uses mock data) |

## Data privacy

Everything runs locally. Your uploaded files, database, and API key never leave your machine (unless you deploy to a cloud host). The only external service called is the Anthropic API to process content.
