#!/usr/bin/env python3
"""Generate complete terms-rich.json (lead + analogy + sections + confused) for every term."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Reuse parsers from sibling script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_terms_registry import (  # noqa: E402
    parse_glossary_bullets,
    parse_glossary_h3,
    parse_lesson_bullets,
    slug,
)

BOLD_RE = re.compile(r"\*\*([^*]{2,60})\*\*")
CODE_TERM_RE = re.compile(r"`([a-zA-Z_][a-zA-Z0-9_.]{1,40})`")
SECTION_RE = re.compile(r"^## (.+)$", re.MULTILINE)

PROJECT_META = {
    "21": {
        "name": "Vingt-Un Rogue",
        "repo": "alikatgh/21",
        "domain": "LÖVE/Lua roguelike card game",
        "analogy_pool": [
            "a playing-card table where every rule change is explicit",
            "a board-game phase tracker — only one phase active at a time",
            "a dealer's glove — risky moves are protected so the night continues",
            "a labelled toolbox every file hands to callers via `require`",
            "a scoreboard that only updates through one official choke-point",
        ],
        "where_hint": "Search the real repo: `src/logic/`, `src/state/`, `src/ui/`, and `src/data/`.",
    },
    "local_llm": {
        "name": "Sakha-LLM",
        "repo": "alikatgh/sakha-llm",
        "domain": "Yakut language model training and deployment",
        "analogy_pool": [
            "a factory assembly line — tensors flow through stations that each reshape meaning",
            "a library index sorted by rarity — common tokens fade, distinctive ones stand out",
            "a hill-climbing hiker — gradients point downhill toward lower loss",
            "a bilingual dictionary that learns coordinates instead of definitions",
            "a compression zip file for model weights — smaller on disk, nearly same when opened",
        ],
        "where_hint": "Read `model.py`, `train.py`, `data/`, and `export/` in the sakha-llm repo.",
    },
    "mappster": {
        "name": "Mappster",
        "repo": "alikatgh/mappster",
        "domain": "maps, transit, and local commerce super-app",
        "analogy_pool": [
            "a post office that re-addresses every map request so users never phone foreign tile servers",
            "a customs hall — auth and schema booths run before your handler touches the database",
            "a bus timetable glued to a live GPS dot moving on a map",
            "a city grid where every coordinate snaps to a cell before you aggregate safety stats",
            "a wallet with atomic locks — two tabs cannot spend the same API call budget twice",
        ],
        "where_hint": "Trace `backend/routers/`, `apps/web/src/map/`, and `packages/core/`.",
    },
    "bigo": {
        "name": "What Users Want",
        "repo": "alikatgh/whats-users-want",
        "domain": "support-ticket NLP pipeline and want taxonomy",
        "analogy_pool": [
            "a library index card wall — rare phrases name clusters, boilerplate words fade",
            "a briefing packet for a temp analyst — rules on page one, one ticket on page two",
            "a sorting belt at a warehouse — tickets become vectors before clustering",
            "a dashboard slide deck that recomputes when you move a slider (Streamlit)",
            "a staged factory line — each script leaves a marker so reruns skip finished work",
        ],
        "where_hint": "Open `scripts/option2_pipeline.py`, `build_user_wants_taxonomy.py`, and `outputs/option2_*`.",
    },
    "sciencebouk": {
        "name": "sciencebouk",
        "repo": "alikatgh/sciencebouk",
        "domain": "interactive equation explorer and learning aids",
        "analogy_pool": [
            "a museum placard next to a live dial you can twist",
            "a worksheet with a worked example in the margin",
            "a concept-check question before the next room unlocks",
            "a graph where moving one slider redraws the whole curve",
            "a prerequisite map — you visit easier equations before harder ones",
        ],
        "where_hint": "See `frontend/src/data/whatItMeans.ts`, `conceptChecks.ts`, and `docs/LEARNING_AIDS.md`.",
    },
}


def collect_terms(glossaries: list[Path], lessons_dirs: list[Path]) -> dict[str, dict]:
    terms: dict[str, dict] = {}
    categories: dict[str, str] = {}
    current_cat = "General"

    for gpath in glossaries:
        if not gpath.exists():
            continue
        gtext = gpath.read_text(encoding="utf-8", errors="replace")
        for line in gtext.splitlines():
            if line.startswith("## ") and not line.startswith("### "):
                current_cat = line[3:].strip()
        if "### " in gtext:
            for tid, t in parse_glossary_h3(gtext).items():
                terms[tid] = t
                categories[tid] = current_cat
        if re.search(r"^- \*\*", gtext, re.MULTILINE):
            for tid, t in parse_glossary_bullets(gtext).items():
                terms.setdefault(tid, t)
                categories.setdefault(tid, current_cat)

    for tid, t in parse_lesson_bullets(lessons_dirs).items():
        if tid not in terms or len(t.get("short", "")) > len(terms[tid].get("short", "")):
            terms[tid] = {**terms.get(tid, {}), **t}
        categories.setdefault(tid, categories.get(tid, "Lessons"))

    return terms, categories


def scan_lesson_prose(lessons_dirs: list[Path], known: set[str]) -> dict[str, dict]:
    """Extract bold/code tokens from lesson bodies not yet in registry."""
    extra: dict[str, dict] = {}
    skip = {
        "Objectives", "Why it matters", "Try it", "Check yourself", "Part A", "Part B",
        "Note", "Warning", "Tip", "Reveal", "Summary", "Table", "Figure",
    }
    for lessons_dir in lessons_dirs:
        if not lessons_dir.exists():
            continue
        for path in lessons_dir.rglob("*.md"):
            if path.name in ("index.md", "glossary.md", "README.md"):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            # skip front matter blocks
            for m in BOLD_RE.finditer(text):
                label = m.group(1).strip()
                if len(label) < 3 or label in skip or label.startswith("http"):
                    continue
                tid = slug(label)
                if not tid or tid in known:
                    continue
                if tid in extra:
                    continue
                extra[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": f"Technical term used in {path.name}.",
                    "lead": f"“{label}” appears in the lesson {path.stem} — here's what it means in context.",
                }
            for m in CODE_TERM_RE.finditer(text):
                label = m.group(1)
                if label in ("true", "false", "null", "None", "self", "return"):
                    continue
                tid = slug(label)
                if not tid or tid in known or tid in extra:
                    continue
                extra[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": f"Identifier referenced in {path.name}.",
                    "lead": f"`{label}` is used in {path.stem} — open that file when you see it in prose.",
                }
    return extra


def pick_confused(tid: str, all_ids: list[str], category_map: dict[str, str], n: int = 3) -> list[str]:
    cat = category_map.get(tid, "")
    same = [x for x in all_ids if x != tid and category_map.get(x) == cat]
    if len(same) >= n:
        return same[:n]
    others = [x for x in all_ids if x != tid and x not in same]
    out = same + others
    # stable-ish pick by hash
    out.sort(key=lambda x: (category_map.get(x) != cat, x))
    return [x for x in out if x != tid][:n]


def has_rich(t: dict) -> bool:
    return bool(t.get("analogy") and t.get("sections") and t.get("confused"))


def generate_rich(
    tid: str,
    base: dict,
    meta: dict,
    category: str,
    all_ids: list[str],
    category_map: dict[str, str],
) -> dict:
    label = base.get("title") or base.get("label") or tid
    short = base.get("short") or ""
    lead = base.get("lead") or f"Let's explain “{label}” in plain English."
    pool = meta["analogy_pool"]
    analogy_body = (
        f"Think of **{label}** in the context of {meta['domain']}.\n\n"
        f"{short or lead}\n\n"
        f"Picture it like {pool[hash(tid) % len(pool)]} — that's the role **{label}** plays in this project."
    )
    sections = [
        {
            "heading": "What it actually means",
            "body": short or lead,
        },
        {
            "heading": f"Where you see it in {meta['name']}",
            "body": (
                f"Category: {category}. {meta['where_hint']} "
                f"Grep for “{label}” or `{label}` in the repo to land on the real call site."
            ),
        },
        {
            "heading": "Why it matters",
            "body": (
                f"If **{label}** still feels abstract, read the lesson that introduces it, "
                f"then grep the codebase — every term in this course is grounded in shipped code, not toy examples."
            ),
        },
    ]
    confused = pick_confused(tid, all_ids, category_map, 3)
    if not confused:
        confused = [x for x in all_ids if x != tid][:3]

    out = {
        "label": base.get("label", label),
        "title": label,
        "lead": lead if len(lead) > 40 else f"Okay — let's explain **{label}** in a much simpler way.\n\n{lead}",
        "analogy": {"title": "Simple analogy", "body": analogy_body},
        "sections": sections,
        "confused": confused,
    }
    aliases = base.get("aliases")
    if aliases:
        out["aliases"] = aliases
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, choices=PROJECT_META.keys())
    ap.add_argument("--glossary", action="append", default=[], type=Path)
    ap.add_argument("--lessons", action="append", default=[], type=Path)
    ap.add_argument("--existing-rich", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--scan-prose", action="store_true", default=True)
    args = ap.parse_args()

    meta = PROJECT_META[args.project]
    terms, categories = collect_terms(args.glossary, args.lessons)

    known_ids = set(terms.keys())
    if args.scan_prose:
        extra = scan_lesson_prose(args.lessons, known_ids)
        for tid, t in extra.items():
            terms[tid] = t
            categories.setdefault(tid, "Lesson prose")

    existing: dict[str, dict] = {}
    if args.existing_rich and args.existing_rich.exists():
        existing = json.loads(args.existing_rich.read_text(encoding="utf-8")).get("terms", {})

    all_ids = sorted(terms.keys())
    rich_terms: dict[str, dict] = {}

    for tid in all_ids:
        base = terms[tid]
        if tid in existing and has_rich(existing[tid]):
            rich_terms[tid] = existing[tid]
            continue
        if tid in existing:
            # merge hand partial with generated fill
            gen = generate_rich(tid, {**base, **existing[tid]}, meta, categories.get(tid, "General"), all_ids, categories)
            merged = {**gen, **existing[tid]}
            if not merged.get("analogy"):
                merged["analogy"] = gen["analogy"]
            if not merged.get("sections"):
                merged["sections"] = gen["sections"]
            if not merged.get("confused"):
                merged["confused"] = gen["confused"]
            rich_terms[tid] = merged
        else:
            rich_terms[tid] = generate_rich(tid, base, meta, categories.get(tid, "General"), all_ids, categories)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"version": 1, "terms": rich_terms}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    rich_count = sum(1 for t in rich_terms.values() if has_rich(t))
    print(f"Wrote {len(rich_terms)} rich terms ({rich_count} complete) → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())