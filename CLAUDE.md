# Sciencebouk — Interactive Math Education Platform

## CRITICAL: Formula Protection Rules
- NEVER modify any LaTeX formula string, KaTeX input, or mathematical notation
- NEVER convert LaTeX to plain text or ASCII
- NEVER rewrite `\frac`, `\partial`, `\nabla`, Greek letters, subscripts, or superscripts into text
- All formulas MUST render with `<InlineMath math={...} />` or `<BlockMath math={...} />` from react-katex
- The old plain-text formula converter is DELETED — a PreToolUse hook (`guard-katex.sh`) will block any attempt to import, recreate, or reference it in source code
- NEVER create any function that converts LaTeX strings to plain text, Unicode, or ASCII equivalents
- When displaying formulas anywhere (cards, lists, previews, modals), ALWAYS use `<InlineMath>` or `<BlockMath>`
- Treat formula strings as IMMUTABLE source code — if broken, preserve and flag, don't rewrite

## Stack
- **Frontend**: React 19 + TypeScript 5.8 + Vite 6.3 + Tailwind CSS 3.4
- **Backend**: Django 5.2 + SQLite3
- **Visualization**: D3.js 7.9, Konva 10.2, Framer Motion 12.6
- **Math rendering**: KaTeX 0.16

## Quick Start
- Frontend: `cd frontend && npm run dev` → http://localhost:5173
- Backend: `cd backend && source .venv/bin/activate && python manage.py runserver` → http://localhost:8000
- Build: `cd frontend && npm run build`

## Project Layout
- `frontend/src/App.tsx` — main app shell (sidebar + content panel)
- `frontend/src/components/EquationVisualization.tsx` — routes to 17 equation scenes
- `frontend/src/components/PythagoreanTheoremExplorer.tsx` — interactive Pythagoras proof
- `frontend/src/components/InteractiveEquation.tsx` — algebra lesson with balance scale
- `frontend/src/data/equations.ts` — 17 equation entries with metadata
- `backend/courses/views.py` — API views with hardcoded course payload
- `backend/formulas_backend/settings.py` — Django settings (env-var driven)

## Code Standards

### Frontend (TypeScript/React)
- 2-space indentation, semicolons optional (follow existing style)
- Functional components with hooks only — no class components
- State: `useState` + `useMemo` — no global state manager
- Visualizations: SVG preferred, Canvas (Konva) for complex scenes
- Math formulas: KaTeX LaTeX syntax in `formula` fields
- Tailwind for styling — use custom tokens: ink, mist, ocean, aqua, sunrise, ember
- Fonts: Newsreader (display), Manrope (body)

### Backend (Python/Django)
- 4-space indentation, PEP 8
- API responses: `JsonResponse` with structured payloads
- CORS configured for localhost:5173 — update for production
- Settings via env vars: DJANGO_SECRET_KEY, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS

## API Endpoints
- `GET /api/health/` — returns `{"status": "ok"}`
- `GET /api/courses/equation-atlas/` — full course payload with equations
- `GET /api/courses/foundational-algebra/` — alias for equation-atlas

## Data Model
Each equation entry has: id, title, formula (LaTeX), author, year, category.
17 equations span Geometry, Algebra, Calculus, Physics, Statistics, Topology, Quantum, CS, Finance.

## Important Notes
- No database models yet — course data is hardcoded in `courses/views.py`
- No test suite configured — needs Jest/Vitest (frontend) and pytest (backend)
- No client-side router — state-driven navigation via `selectedId`
- Each equation has a dedicated SVG scene component in EquationVisualization.tsx

@frontend/package.json
@backend/requirements.txt

## Audit Tool Budget — Non-Negotiable

**One session burned 600k tokens running `code-review --effort max` on an already-audited branch and found 2 cosmetic non-bugs. This rule exists so that never happens again.**

**The ladder — cheapest first, stop when satisfied:**

| Tool | Approx tokens | When to use |
|------|---------------|-------------|
| `code-strength` on 3–5 files | 30–60k | First pass, always |
| `code-review --effort low` | ~80k | When code-strength found real bugs |
| `code-review --effort medium` | ~150k | Explicit user request only |
| `code-review --effort max` | 400–600k | FORBIDDEN after code-strength ran |

**Hard stops — check before running any audit:**

1. Was `code-strength` already run this session on these files? → **stop. You are done.**
2. Tests pass + lint clean + code-strength ran? → **the branch is ready. Say so.**
3. `code-review --effort max` is **FORBIDDEN** on any already-audited branch. No exceptions.
4. If the user explicitly requests `--effort max`: warn of the token cost (~500k) and require confirmation.

**When the branch is clean: say "ready to merge." Do not invent more work.**

## Available Skills (25 slash commands)

Run any skill by typing `/skill-name` in Claude Code.

### Session Management
| Skill | Purpose |
|-------|---------|
| `/session-start` | Load context, report state, ask for session goal |
| `/session-end` | Save SESSION_STATE + JOURNAL, suggest commit |
| `/next` | One recommended next action based on project state |

### Audit & Fix
| Skill | Purpose |
|-------|---------|
| `/audit-ui` | Full UI audit → SCREEN_INVENTORY + KNOWN_UI_DEBT |
| `/security-scan [client\|server]` | OWASP Top 10 audit → logs SEC-* issues |
| `/env-check` | Missing vars, hardcoded secrets, client/server alignment → ENV-* |
| `/api-audit` | Route auth, validation, rate limiting, consistency → API-* |
| `/api-contract` | Validate frontend API calls match backend routes |
| `/fix-gap [id]` | Fix one tracked issue from KNOWN_UI_DEBT.md |
| `/batch-fix` | Fix all P0/P1 issues in one pass with quality gate |

### Code Review & Refactor (React / TypeScript)
| Skill | Purpose |
|-------|---------|
| `/dan-review [file]` | Code review via Dan Abramov's 10 mental models → DAN-* |
| `/dan-refactor [file]` | Structural refactor — fix cascades, derive state, clean flow |
| `/dan-verify [file]` | Post-refactor verification — behavior preserved, deps intact |
| `/dan-think [question]` | Architecture reasoning — state placement, context vs props |

### Quality
| Skill | Purpose |
|-------|---------|
| `/run-tests [scope]` | Run test suite (vitest/jest/pytest/go test — auto-detected) |
| `/lint-fix [scope]` | Auto-fix linter + formatter (biome/eslint/ruff — auto-detected) |
| `/perf-audit` | Bundle size, re-render hotspots, data fetching |
| `/a11y-audit` | WCAG 2.1 AA — keyboard, screen readers, contrast, ARIA |

### Bug Hunting
| Skill | Purpose |
|-------|---------|
| `/bug-sweep [path]` | Deep React bug scan — leaks, stale closures, race conditions |
| `/bug-hunt [scope]` | Parallel agent bug hunt across the full codebase |

### Design Workflow
| Skill | Purpose |
|-------|---------|
| `/design-screen [name]` | Write screen spec to `docs/screens/` |
| `/implement-screen [name]` | Implement from spec |
| `/critique-screen [name]` | Visual + UX assessment → artifacts/reviews/ |
| `/ralph-redesign` | Bounded screenshot-loop redesign (max 5 iterations) |

### Deployment
| Skill | Purpose |
|-------|---------|
| `/deploy-check` | CI status + live URL health check (read-only) |

---

## Fan-out economics — a worked example (build the instinct)

Before you fan out N agents / a Workflow, pattern-match against this real case.

EXAMPLE — same task (reskin 17 files: swap CSS classes, keep the copy), two ways:

  ✗ WHAT WE DID — one agent per file:
      parallel(pages.map(p => agent("reskin page " + p)))      # 17 agents
    Each agent re-read its 400–1000-line template AND the SAME shared CSS engine
    AND re-derived the SAME class mapping, then self-verified.
    → ~1.3M tokens (~$6.50), ~76k/agent  (estimated 250–400k — 3–5× off).

  ✓ SAME RESULT, a fraction of the cost:
    1. CASCADE FIRST — one edit to the shared engine + global stylesheet restyled
       ALL 17 pages at once (~80% of the win, tens of k tokens): a shared rule
       cascades to every consumer for free.
    2. RESIDUE (mechanical class swaps) — a sed/codemod pass (≈free), OR ONE agent
       given the mapping + file list doing all 17 in a single context (engine read
       ONCE, not 17×).

THE TELL: the per-item work was MECHANICAL + UNIFORM and every agent re-paid for
the SAME shared context. That shape — uniform transform + shared context re-read
N times — means a fleet is the wrong tool. Fan-out is for items that each need
INDEPENDENT reasoning (e.g. "find the bug in THIS subsystem"), not stamping one
transform across N files.

THE CHECK before any fan-out over N items:
1. Exhausted the shared/cascade layer first? (one rule beats N agents.)
2. Each item mechanical/uniform? → batch / script / cheaper model, not N top agents.
3. Estimate `(avg file + shared-context + verify) × N` (~75k/file). Compute & SHOW it.
4. Keep the cheap central verify (compile / lint / grep); generation is the overpriced half.

Rule of thumb: mechanical + uniform + shared-context-heavy → cascade or one batched
pass, NEVER one-agent-per-item. Full version: `~/.claude/CLAUDE.md` §4c.
