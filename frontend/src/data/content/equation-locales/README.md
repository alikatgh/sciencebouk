# Translating Equation Copy

Use this folder for locale-specific equation copy that should not live inside scene code.

Create one file per locale:

- `frontend/src/data/content/equation-locales/de.json`
- `frontend/src/data/content/equation-locales/es.json`
- `frontend/src/data/content/equation-locales/fr.json`

Each file is a JSON object keyed by equation id.

Example:

```json
{
  "1": {
    "hook": "Du baust eine Rampe. Die Stufe ist 3 Fuß hoch und die Basis beginnt 4 Fuß entfernt. Wie lang muss die Rampe sein?",
    "hookAction": "Ziehe die Seiten des Dreiecks, um zu sehen, dass a² + b² immer c² ergibt.",
    "variables": [
      { "name": "a", "description": "Vertikale Seite" },
      { "name": "b", "description": "Horizontale Seite" },
      { "name": "c", "description": "Hypotenuse" }
    ],
    "presets": [
      { "label": "3-4-5" },
      { "label": "5-12-13" },
      { "label": "Leiter" }
    ],
    "glossary": [
      {
        "highlightClass": "sq-c",
        "words": ["Hypotenuse"],
        "tooltip": "Die längste Seite gegenüber dem rechten Winkel"
      }
    ]
  }
}
```

Rules:

- Keep the top-level keys as numeric equation ids in quotes.
- Keep variable `name` values unchanged so descriptions merge onto the correct slider.
- Keep glossary `highlightClass` values unchanged so hover highlights keep working.
- Keep preset order the same as the English source; labels are merged by position.
- Do not translate math variable names unless the source already uses localized symbols intentionally.
- Lesson prose lives in `frontend/src/content/lessons/<locale>/`, not here.

What this folder controls:

- hook text
- hook action text
- variable descriptions
- preset labels
- glossary words and tooltips

What still lives elsewhere:

- long-form lesson content: Markdown lesson files
- scene logic and math: TypeScript scene components
- public marketing/help/legal copy: locale JSON files in `frontend/src/data/content/locales/`
