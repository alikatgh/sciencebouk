# Translating scene copy

This folder is for locale-specific overrides of the interactive scene copy in [`scene-copy.json`](../scene-copy.json).

## How it works

- Keep the same JSON structure as the English base file.
- You only need to include fields you want to override.
- Missing fields automatically fall back to English.

## Placeholders

- Dynamic values use double-brace placeholders like `{{speed}}`, `{{entropy}}`, or `{{n}}`.
- Keep placeholder names exactly the same in translated strings.
- Do not add or remove braces around placeholders.

## Safety rules

- Do not translate JSON keys.
- Do not translate math symbols such as `ΔΓ`, `Φ`, `H`, `E`, or `L` unless the product team wants that explicitly.
- Preserve TeX fragments like `\\text{...}` and escape sequences like `\\;`.
- Keep compact and ultra-compact labels short, especially for mobile.

## Example

`es.json`

```json
{
  "wave": {
    "description": {
      "lowBass": "Bajo profundo -- un zumbido grave",
      "default": "Velocidad = {{speed}} unidades/s"
    }
  }
}
```
