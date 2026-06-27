#!/usr/bin/env python3
"""Generate complete terms-rich.json (lead + analogy + sections + confused) for every term."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_terms_registry import (  # noqa: E402
    parse_frontend_data,
    parse_glossary_bullets,
    parse_glossary_h3,
    parse_lesson_bullets,
    slug,
)

BOLD_RE = re.compile(r"\*\*([^*]{2,80})\*\*")
CODE_TERM_RE = re.compile(r"`([a-zA-Z_][a-zA-Z0-9_.]{2,48})`")
CONTEXT_RE = re.compile(r".{0,120}\*\*([^*]+)\*\*.{0,120}", re.DOTALL)

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "go",
    "he", "her", "him", "his", "if", "in", "is", "it", "its", "me", "my", "no",
    "not", "of", "on", "or", "our", "she", "so", "the", "their", "them", "then",
    "there", "these", "they", "this", "to", "up", "us", "was", "we", "when",
    "who", "why", "will", "with", "you", "your", "all", "any", "can", "had",
    "has", "have", "how", "into", "just", "like", "may", "more", "most", "new",
    "now", "old", "one", "only", "other", "out", "over", "same", "see", "some",
    "such", "than", "that", "them", "too", "two", "use", "very", "what", "which",
    "while", "work", "yes", "yet", "each", "make", "made", "here", "also", "both",
    "does", "done", "even", "back", "been", "before", "after", "being", "between",
    "could", "should", "would", "about", "above", "below", "under", "again",
    "once", "where", "because", "through", "during", "without", "within",
    "part", "step", "steps", "note", "tips", "try", "read", "open", "file",
    "files", "line", "lines", "code", "list", "table", "figure", "summary",
    "objectives", "reveal", "warning", "tip", "example", "examples", "result",
    "results", "output", "input", "type", "types", "name", "names", "value",
    "values", "true", "false", "null", "none", "self", "return", "import",
    "class", "function", "method", "module", "test", "tests", "run", "runs",
    "first", "second", "third", "next", "last", "left", "right", "top", "bottom",
    "less", "many", "much", "few", "every", "whole", "full", "half", "way",
    "bg", "dt", "fn", "fw", "gs", "h1", "h2", "h3", "id", "iq", "ui", "ux",
    "fr", "f6", "f7", "f8", "f9", "10", "11", "12",
}

SKIP_BOLD = {
    "Objectives", "Why it matters", "Try it", "Check yourself", "Simple analogy",
    "What it actually means", "The mental model", "Where you see it",
    "Predict before reading", "Still not clear?", "Part A", "Part B", "Part C",
    "Note", "Warning", "Tip", "Reveal", "Summary", "Table", "Figure",
}

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

MIN_SECTIONS = 3
MIN_CONFUSED = 3


def is_stopword(label: str, tid: str) -> bool:
    low = label.lower().strip()
    if low in STOPWORDS or tid in STOPWORDS:
        return True
    if re.fullmatch(r"\d+([.-]\d+)*", low):
        return True
    if re.fullmatch(r"[a-z]{1,2}", low):
        return True
    return False


def is_technical_label(label: str) -> bool:
    """True if label looks like a domain term, not plain prose."""
    if is_stopword(label, slug(label)):
        return False
    if label in SKIP_BOLD:
        return False
    if re.search(r"[_.\\/]", label):
        return True
    if re.search(r"[A-Z]{2,}", label):  # acronym
        return True
    if re.search(r"[A-Z][a-z]+[A-Z]", label):  # camelCase
        return True
    if "`" in label:
        return True
    if label.startswith("src/") or label.startswith("http"):
        return False
    # Multi-word title-case phrases (Game state machine)
    words = re.findall(r"[A-Za-z]+", label)
    if len(words) >= 2 and any(w[0].isupper() for w in words[1:]):
        return True
    # Single technical-looking tokens
    if len(label) >= 5 and re.search(r"[-_]", label):
        return True
    if len(label) >= 6 and label[0].isupper():
        return True
    return False


def extract_context(text: str, label: str) -> str:
    for m in CONTEXT_RE.finditer(text):
        if m.group(1).strip() == label:
            ctx = m.group(0).replace("**", "").replace("\n", " ")
            ctx = re.sub(r"\s+", " ", ctx).strip()
            if len(ctx) > 40:
                return ctx[:320]
    return ""


def collect_terms(
    glossaries: list[Path],
    lessons_dirs: list[Path],
    frontend_data: Path | None = None,
) -> tuple[dict[str, dict], dict[str, str]]:
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

    if frontend_data:
        for tid, t in parse_frontend_data(frontend_data).items():
            if tid not in terms or len(t.get("short", "")) > len(terms[tid].get("short", "")):
                terms[tid] = {**terms.get(tid, {}), **t}
            categories.setdefault(tid, t.get("source_category", "Frontend data"))

    return terms, categories


def scan_lesson_prose(lessons_dirs: list[Path], known: set[str]) -> dict[str, dict]:
    """Extract only technical bold/code tokens not already in glossary/bullets."""
    extra: dict[str, dict] = {}
    for lessons_dir in lessons_dirs:
        if not lessons_dir.exists():
            continue
        for path in sorted(lessons_dir.rglob("*.md")):
            if path.name in ("index.md", "glossary.md", "README.md"):
                continue
            if path.suffix not in (".md",):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            # Only scan lesson body after plain-english block to avoid nav junk
            body = text
            if "## Part" in text:
                body = text.split("## Part", 1)[-1]

            for m in BOLD_RE.finditer(body):
                label = m.group(1).strip()
                if not is_technical_label(label):
                    continue
                tid = slug(label)
                if not tid or tid in known or tid in extra or is_stopword(label, tid):
                    continue
                ctx = extract_context(text, label)
                short = ctx or f"{label} is a technical concept used when reading {path.stem.replace('-', ' ')}."
                extra[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": short,
                    "lead": f"**{label}** — let's unpack this in plain English.\n\n{short}",
                    "source_lesson": path.name,
                }

            for m in CODE_TERM_RE.finditer(body):
                label = m.group(1)
                if not re.search(r"[_.]", label) and not label[0].isupper():
                    continue
                if is_stopword(label, slug(label)):
                    continue
                tid = slug(label)
                if not tid or tid in known or tid in extra:
                    continue
                extra[tid] = {
                    "id": tid,
                    "label": label,
                    "title": label,
                    "short": f"`{label}` is a symbol or API name referenced in {path.name}.",
                    "lead": (
                        f"When you see `{label}` in the lesson, open {path.name} and grep for it — "
                        f"it names real code in this repository."
                    ),
                    "source_lesson": path.name,
                }
    return extra


def pick_confused(tid: str, all_ids: list[str], category_map: dict[str, str], n: int = MIN_CONFUSED) -> list[str]:
    cat = category_map.get(tid, "")
    same = [x for x in all_ids if x != tid and category_map.get(x) == cat and not is_stopword(x, x)]
    pool = same if len(same) >= n else same + [x for x in all_ids if x != tid and x not in same]
    pool = [x for x in pool if x != tid and not is_stopword(x, x)]
    pool.sort(key=lambda x: (category_map.get(x) != cat, x))
    if len(pool) < n:
        pool = pool + [x for x in all_ids if x not in pool and x != tid][: n - len(pool)]
    return pool[:n]


def is_hand_authored(entry: dict) -> bool:
    """True when entry looks hand-written, not from generate_rich template."""
    if entry.get("table") or any(s.get("code") for s in (entry.get("sections") or [])):
        return True
    if not has_full_rich(entry):
        return False
    body = (entry.get("analogy") or {}).get("body", "")
    return "not a toy example" not in body and "shows up in real shipped code" not in body


def has_full_rich(t: dict) -> bool:
    sections = t.get("sections") or []
    confused = t.get("confused") or []
    analogy = t.get("analogy") or {}
    body = analogy.get("body") or ""
    return bool(
        t.get("lead")
        and analogy
        and len(body) > 60
        and len(sections) >= MIN_SECTIONS
        and len(confused) >= MIN_CONFUSED
    )


def ensure_full_rich(entry: dict, gen: dict) -> dict:
    """Merge generated fill-ins; never leave partial sections/confused."""
    out = {**gen, **entry}
    if not out.get("lead"):
        out["lead"] = gen["lead"]
    if not out.get("analogy") or len((out.get("analogy") or {}).get("body", "")) < 60:
        out["analogy"] = gen["analogy"]
    secs = out.get("sections") or []
    if len(secs) < MIN_SECTIONS:
        out["sections"] = gen["sections"]
    conf = out.get("confused") or []
    if len(conf) < MIN_CONFUSED:
        out["confused"] = gen["confused"]
    return out


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
    lead = base.get("lead") or f"Let's explain **{label}** in plain English."
    if not lead.startswith("Okay") and not lead.startswith("**"):
        lead = f"Okay, let's try explaining **{label}** in a much simpler way.\n\n{lead}"

    pool = meta["analogy_pool"]
    analogy_pick = pool[hash(tid) % len(pool)]
    analogy_body = (
        f"Think of **{label}** like {analogy_pick}.\n\n"
        f"{short or lead}\n\n"
        f"In {meta['name']}, this idea shows up in real shipped code — not a toy example."
    )

    lesson_ref = base.get("source_lesson", "the course glossary")
    sections = [
        {"heading": "What it actually means", "body": short or lead},
        {
            "heading": f"Where you see it in {meta['name']}",
            "body": (
                f"Category: {category}. Introduced in {lesson_ref}. "
                f"{meta['where_hint']} Search the repo for `{label}` or «{label}»."
            ),
        },
        {
            "heading": "Try it yourself",
            "body": (
                f"Open the lesson that mentions **{label}**, then grep the codebase. "
                f"Can you name one file and one line where it matters? If yes, you've understood it."
            ),
        },
        {
            "heading": "Why it matters",
            "body": (
                f"Skipping **{label}** makes the next lesson feel like magic. "
                f"With this popup you have the plain-English version before diving into code."
            ),
        },
    ]

    confused = pick_confused(tid, all_ids, category_map, MIN_CONFUSED)

    out: dict = {
        "label": base.get("label", label),
        "title": label,
        "lead": lead,
        "analogy": {"title": "Simple analogy", "body": analogy_body},
        "sections": sections[: max(MIN_SECTIONS, 4)],
        "confused": confused,
    }
    if base.get("aliases"):
        out["aliases"] = base["aliases"]
    if base.get("table"):
        out["table"] = base["table"]
    if base.get("code"):
        out["sections"] = out["sections"][:2] + [{"heading": "Code example", "body": "", "code": base["code"]}] + out["sections"][2:]
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, choices=PROJECT_META.keys())
    ap.add_argument("--glossary", action="append", default=[], type=Path)
    ap.add_argument("--lessons", action="append", default=[], type=Path)
    ap.add_argument("--existing-rich", type=Path, default=None)
    ap.add_argument("--handcrafted-seed", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--frontend-data", type=Path, default=None)
    ap.add_argument("--scan-prose", action="store_true")
    args = ap.parse_args()

    meta = PROJECT_META[args.project]
    terms, categories = collect_terms(args.glossary, args.lessons, args.frontend_data)

    known_ids = set(terms.keys())
    if args.scan_prose:
        extra = scan_lesson_prose(args.lessons, known_ids)
        for tid, t in extra.items():
            terms[tid] = t
            categories.setdefault(tid, "Lesson prose")

    hand_crafted: dict[str, dict] = {}
    if args.handcrafted_seed and args.handcrafted_seed.exists():
        hand_crafted.update(
            json.loads(args.handcrafted_seed.read_text(encoding="utf-8")).get("terms", {})
        )
    if args.existing_rich and args.existing_rich.exists():
        for k, v in json.loads(args.existing_rich.read_text(encoding="utf-8")).get("terms", {}).items():
            if is_hand_authored(v):
                hand_crafted[k] = v

    # Seed-only hand entries (e.g. first-class-function) must appear even if absent from glossary scan
    for tid, overlay in hand_crafted.items():
        if tid not in terms:
            terms[tid] = {
                "id": tid,
                "label": overlay.get("label", tid),
                "title": overlay.get("title", overlay.get("label", tid)),
                "short": overlay.get("short") or overlay.get("lead", ""),
                "lead": overlay.get("lead", ""),
            }
            categories.setdefault(tid, "Hand-authored")

    all_ids = sorted(terms.keys())
    rich_terms: dict[str, dict] = {}

    for tid in all_ids:
        base = terms[tid]
        gen = generate_rich(tid, base, meta, categories.get(tid, "General"), all_ids, categories)
        if tid in hand_crafted and has_full_rich(hand_crafted[tid]):
            rich_terms[tid] = ensure_full_rich(hand_crafted[tid], gen)
        elif tid in hand_crafted:
            rich_terms[tid] = ensure_full_rich(hand_crafted[tid], gen)
        else:
            rich_terms[tid] = gen

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"version": 1, "terms": rich_terms}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    full = sum(1 for t in rich_terms.values() if has_full_rich(t))
    print(f"Wrote {len(rich_terms)} rich terms ({full} full) → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())