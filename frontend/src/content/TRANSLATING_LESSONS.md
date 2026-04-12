# Translating Lessons

Lesson translations should live in locale folders next to the English source.

Examples:

- `frontend/src/content/lessons/pythagoras.md`
- `frontend/src/content/lessons/de/pythagoras.md`
- `frontend/src/content/lessons/fr/pythagoras.md`

Rules:

- Keep every `## step-id` heading exactly the same as the English source.
- Keep every `### instruction`, `### hint`, and `### insight` heading in English.
- Translate only the body text under those headings.
- Preserve inline LaTeX, variable names, and placeholder values exactly.
- If a translation file exists, it must contain the same step ids as the English lesson.

English remains the fallback when a locale file is missing.
