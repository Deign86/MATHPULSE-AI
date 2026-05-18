# Subject Labels — Display Name Mapping

## Where the metadata lives

`src/config/subjects.ts` — single source of truth for converting internal subject IDs to human-readable display names.

## How it works

Internal IDs (`gen-math`, `stats-prob`, `pre-calc`, `basic-calc`) are used everywhere in Firestore, service logic, and AI prompts. The `subjects.ts` module provides:

- **`SUBJECT_DISPLAY`** — Record mapping IDs to full names, short labels, and colors
- **`getSubjectDisplayName(code)`** — Resolves any ID or alias to a full name (e.g., `"General Mathematics"`)
- **`getSubjectShortLabel(code)`** — Resolves to a readable abbreviation (e.g., `"Gen Math"`)
- **`normalizeTopicDisplay(topic)`** — Converts AI-generated strings like `"Gm Q1 - Fundamentals"` into `"General Mathematics – Q1 – Fundamentals"`

## Adding a new subject

1. Add an entry to `SUBJECT_DISPLAY` in `src/config/subjects.ts`
2. Add any aliases (abbreviations the AI might generate) to the `ALIASES` map
3. The regex in `normalizeTopicDisplay` auto-handles common patterns; add new subject prefixes to the regex if needed

## Rules

- **Never display raw IDs or codes** (`gen-math`, `GEN MATH`, `Gm Q1`) in student/teacher-facing UI
- Use `normalizeTopicDisplay()` for any AI-generated topic strings (intervention plans, learning paths)
- Use `getSubjectDisplayName()` for subject ID → label conversion
- Internal logic (Firestore keys, API params, enums) should continue using the canonical IDs
