// Mock responses for local testing without an API key (MOCK_AI=true)

import { ClassificationResult } from "./classify";
import { ConvertedExercise } from "./convert";

export const mockClassification: ClassificationResult = {
  topics: [
    {
      title: "Konjunktiv II",
      category: "grammar",
      level: "B1",
      relevantText: "Exercises using Konjunktiv II for wishes, hypotheticals, and polite requests.",
    },
    {
      title: "Modal Verbs",
      category: "grammar",
      level: "B1",
      relevantText: "Usage of können, müssen, dürfen, sollen, wollen, möchten in context.",
    },
  ],
  hasExercises: true,
  hasVocabulary: true,
  summary: "A session covering Konjunktiv II and modal verbs with fill-in-blank exercises.",
};

export const mockExercises: ConvertedExercise[] = [
  {
    type: "fill_in_blank",
    instruction: "Ergänzen Sie die Sätze mit dem Konjunktiv II.",
    difficulty: "medium",
    items: [
      {
        id: "1",
        prompt: "Wenn ich mehr Zeit ___ (haben), würde ich mehr lesen.",
        blanks: [{ position: 0, correct_answer: "hätte", alternatives: ["hatte"] }],
        options: [],
        correct_answer: "hätte",
        explanation: "Konjunktiv II von 'haben' → hätte",
      },
      {
        id: "2",
        prompt: "Er ___ (sein) gern Arzt, aber Medizin ist sehr schwer.",
        blanks: [{ position: 0, correct_answer: "wäre", alternatives: ["war"] }],
        options: [],
        correct_answer: "wäre",
        explanation: "Konjunktiv II von 'sein' → wäre",
      },
      {
        id: "3",
        prompt: "___ (können) Sie mir bitte helfen?",
        blanks: [{ position: 0, correct_answer: "Könnten", alternatives: ["Können"] }],
        options: [],
        correct_answer: "Könnten",
        explanation: "Höfliche Bitte im Konjunktiv II → könnten",
      },
    ],
  },
  {
    type: "multiple_choice",
    instruction: "Wählen Sie die richtige Form im Konjunktiv II.",
    difficulty: "easy",
    items: [
      {
        id: "1",
        prompt: "Wenn das Wetter besser ___, würden wir spazieren gehen.",
        blanks: [],
        options: ["wäre", "ist", "war", "sein"],
        correct_answer: "wäre",
        explanation: "In einem Konditionalsatz (wenn…) steht der Konjunktiv II.",
      },
      {
        id: "2",
        prompt: "Ich ___ gern eine Tasse Kaffee.",
        blanks: [],
        options: ["möchte", "mögen", "mag", "mochte"],
        correct_answer: "möchte",
        explanation: "'Möchte' ist der Konjunktiv II von 'mögen' und wird für höfliche Wünsche benutzt.",
      },
    ],
  },
];

export const mockTheory = {
  summary: "Konjunktiv II is used for hypothetical situations, wishes, and polite requests in German.",
  theory: `## What is Konjunktiv II?

Konjunktiv II (the subjunctive II) is used to express:
- **Hypothetical situations** — things that are unlikely or contrary to fact
- **Wishes and desires** — what you would like to be true
- **Polite requests** — a softer, more formal way to ask for something
- **Indirect speech** (in combination with other structures)

---

## Formation

There are two ways to form Konjunktiv II:

### 1. Simple form (for common verbs)

Directly from the past tense stem + subjunctive endings:

| Pronoun | haben → hätte | sein → wäre | werden → würde |
|---------|--------------|-------------|----------------|
| ich     | hätte        | wäre        | würde          |
| du      | hättest      | wärst       | würdest        |
| er/sie  | hätte        | wäre        | würde          |
| wir     | hätten       | wären       | würden         |
| ihr     | hättet       | wäret       | würdet         |
| sie/Sie | hätten       | wären       | würden         |

### 2. würde + Infinitive (for most other verbs)

For most regular verbs, use **würde + infinitive** instead of the simple form:

- Ich **würde** gern reisen. *(I would love to travel.)*
- Wir **würden** das gerne machen. *(We would gladly do that.)*

> **Note:** Avoid würde + haben/sein/werden and modal verbs — use their simple Konjunktiv II forms instead.

---

## Common Uses

### Hypothetical conditions (Konditionalsätze)

> **Wenn** ich Zeit **hätte**, **würde** ich mehr Sport treiben.
> *(If I had time, I would do more sport.)*

The structure is: **wenn + Konjunktiv II … würde + Infinitiv**

### Wishes

> Ich **wünschte**, es **wäre** Freitag.
> *(I wish it were Friday.)*

### Polite requests

> **Könnten** Sie mir bitte helfen?
> *(Could you please help me?)*

> **Hätten** Sie einen Moment Zeit?
> *(Would you have a moment?)*

---

## Common Mistakes

- ❌ *Wenn ich Zeit **habe**, würde ich…* — use Konjunktiv II, not Präsens, in the wenn-clause
- ❌ *Ich würde sein müde* — use **wäre** not würde sein
- ✅ Always use **wäre/hätte/würde** for sein/haben/werden, not their würde-forms`,
};

export const mockVocabulary = [
  {
    word: "wünschen",
    article: null,
    plural: null,
    translation: "to wish, to desire",
    example_sentence: "Ich wünschte, ich könnte fliegen.",
    part_of_speech: "verb",
    tags: ["Konjunktiv II", "common"],
  },
  {
    word: "der Wunsch",
    article: "der",
    plural: "Wünsche",
    translation: "wish, desire",
    example_sentence: "Ihr größter Wunsch ist eine Reise nach Japan.",
    part_of_speech: "noun",
    tags: ["common"],
  },
  {
    word: "hypothetisch",
    article: null,
    plural: null,
    translation: "hypothetical",
    example_sentence: "Das ist eine rein hypothetische Frage.",
    part_of_speech: "adjective",
    tags: [],
  },
  {
    word: "höflich",
    article: null,
    plural: null,
    translation: "polite, courteous",
    example_sentence: "Es ist höflicher, im Konjunktiv II zu fragen.",
    part_of_speech: "adjective",
    tags: ["manner"],
  },
  {
    word: "immerhin",
    article: null,
    plural: null,
    translation: "at least, after all",
    example_sentence: "Immerhin hätte er anrufen können.",
    part_of_speech: "adverb",
    tags: ["B1"],
  },
];
