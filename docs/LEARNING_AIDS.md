# Learning aids — the "Learn more" panel

The data-driven subject scenes (equation ids 18–81, rendered by
`ConfigurableEquationScene`) show a tabbed **"Learn more" panel**
(`components/scenes/LearnMorePanel.tsx`) beneath the response curve. Each tab is
backed by a small, pure data module and appears **only when that equation has
curated content** — so a panel can have one tab or four.

## The four aids

| Tab | Data module | Shape | Coverage |
|-----|-------------|-------|----------|
| **Did you know?** | `data/equationFacts.ts` | `Record<id, string>` | 64/64 |
| **Worked example** | `data/workedExamples.ts` | `{ given, steps[] }` | substitution arithmetic |
| **Quick check** | `data/conceptChecks.ts` | `{ question, options[], correctIndex, explanation }` | 64/64 |
| **Builds on** | `data/prerequisites.ts` | `{ id, title }[]` | links to foundational equations |

Each module exports a `getX(equationId)` accessor returning the entry or `null`.
The panel calls all four and builds its tab list from whichever return content.

## Adding an aid for an equation

1. Open the relevant `data/*.ts` and add an entry keyed by the equation's
   numeric id (its `sort_order`, 18–81).
2. Match the **result direction** of `data/subjectResults.ts` for worked
   examples — the final step should equal what the live readout computes.
3. The integrity tests (`*.test.ts`) enforce well-formedness; `equationFacts`
   and `conceptChecks` additionally assert **full 18–81 coverage**, so a new
   subject equation needs at least those two.
4. `tsc` rejects duplicate keys — let the build catch accidental repeats (the
   runtime tests can't, since JS silently keeps the last duplicate).

No component changes are needed — the panel and its tabs are entirely data-driven.

## Behaviour notes

- **State reset on navigation:** the scene subtree is keyed by equation id, so
  the active tab and any answered concept check reset automatically.
- **Accessibility:** the tabs follow the WAI-ARIA tabs pattern — roving
  `tabIndex`, `aria-controls`/`aria-labelledby`, and Arrow/Home/End keyboard
  navigation.
- **Analytics:** answering a check emits `concept_check_answered`
  `{ equationId, correct }` and switching a tab emits `learn_more_tab`
  `{ equationId, tab }` via `lib/analytics.ts`'s `track()`. Subscribe a sink with
  `onTrack` to consume them.
- **Containment:** the whole subject scene is wrapped in a per-scene
  `ErrorBoundary` (`EquationVisualization`), so a bad aid can't blank the app.

## Clickable terminology popups (docs)

When these docs are served as HTML (MkDocs, a static preview, or any page that
loads the assets below), glossary terms in prose are **dotted-underlined**.
Click one to open a plain-English popup: lead sentence, simple analogy,
breakdown sections, and links to related terms — the same pattern as the 101
courses.

Assets live in `docs/assets/`:

- `terms-popup.js` / `terms-popup.css` — auto-link + modal UI
- `terms.json` — built registry (`python3 scripts/build_terms_registry.py …`)
- `terms-rich.json` — rich overlay source (`python3 scripts/generate_terms_rich.py …`)

Minimal include when rendering HTML:

```html
<link rel="stylesheet" href="assets/terms-popup.css">
<script src="assets/terms-popup.js" defer></script>
```

Regenerate after editing docs:

```bash
python3 scripts/generate_terms_rich.py --project sciencebouk \
  --glossary docs/ARCHITECTURE.md --glossary docs/LEARNING_AIDS.md \
  --lessons docs --frontend-data frontend/src/data \
  --out docs/assets/terms-rich.json
python3 scripts/build_terms_registry.py \
  --glossary docs/ARCHITECTURE.md --glossary docs/LEARNING_AIDS.md \
  --lessons docs --frontend-data frontend/src/data \
  --rich docs/assets/terms-rich.json --out docs/assets/terms.json
```

## Not covered, by design

Worked examples and prerequisites are curated only where they genuinely fit.
Equations like Big-O, DNA base pairing, supply & demand, Nash equilibrium, and
Markov chains have no clean numeric walkthrough or single foundational
prerequisite — forcing one would lower quality, so those tabs are intentionally
absent there.
