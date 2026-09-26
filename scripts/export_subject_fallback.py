"""Export the curated subject seed as offline frontend teaching content.

Run after editing seed_subjects.py. No Django setup or database is required.
"""

import ast
import json
from pathlib import Path
import re
import unicodedata


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "backend/courses/management/commands/seed_subjects.py"
OUTPUT = ROOT / "frontend/src/data/content"


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value.lower())
    return re.sub(r"[-\s]+", "-", value).strip("-_")


def main() -> None:
    source = ast.parse(SOURCE.read_text())
    # The seed's helpers and assignments contain only curated content. Exclude
    # Django imports and the database-writing management command entirely.
    content = ast.Module(
        body=[node for node in source.body if isinstance(node, (ast.FunctionDef, ast.Assign))],
        type_ignores=[],
    )
    namespace = {}
    exec(compile(content, str(SOURCE), "exec"), namespace)
    manifest = []
    payloads = []
    for equation in namespace["SUBJECT_EQUATIONS"]:
        summary = {key: equation[key] for key in ("title", "formula", "author", "year", "category", "description")}
        summary.update(id=equation["sort_order"], slug=slugify(equation["title"]), stage="live-demo")
        manifest.append(summary)
        payloads.append({
            **summary,
            "hook": equation["hook"],
            "hook_action": equation["hook_action"],
            "variables_data": equation["variables"],
            "presets_data": equation["presets"],
            "lessons_data": equation["lessons"],
            "glossary_data": equation.get("glossary", []),
        })

    for filename, content in (("subject-manifest-fallback.json", manifest), ("subject-equations-fallback.json", payloads)):
        (OUTPUT / filename).write_text(json.dumps(content, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Exported {len(payloads)} curated subject equations.")


if __name__ == "__main__":
    main()
