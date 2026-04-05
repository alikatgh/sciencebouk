---
name: world-class
description: Ultimate transformation — take the Formulas project to world-class production quality
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

You are transforming the Formulas project from a prototype into a world-class interactive math education platform. Work methodically through each phase. Use subagents in parallel where possible. Do NOT skip steps — build everything fully, not as stubs.

---

## PHASE 1: Foundation & Architecture

### 1.1 — Backend: Real Data Layer
- Replace hardcoded `COURSE_PAYLOAD` in `courses/views.py` with proper Django models:
  - `Equation` model: id, title, formula (LaTeX), author, year, category, description, stage, sort_order
  - `Course` model: slug, title, description, progress_percent, tone
  - `Lesson` model: FK to Course, title, objective, steps (JSONField), duration_minutes
  - `UserProgress` model: user identifier, equation_id, completed, last_viewed, notes
- Create migrations, seed all 17 equations via a data migration or management command
- Update views to query from DB instead of hardcoded dict
- Add Django REST Framework: serializers, viewsets, router
- New endpoints:
  - `GET /api/equations/` — list all equations (filterable by category)
  - `GET /api/equations/{id}/` — single equation detail
  - `PATCH /api/equations/{id}/progress/` — mark progress
  - `GET /api/courses/{slug}/` — course with nested lessons
  - `GET /api/search/?q=` — search equations by title/author/category
- Add proper error responses, pagination, and API tests

### 1.2 — Frontend: Data Fetching & State
- Install and configure `@tanstack/react-query` for server state
- Create API client module (`frontend/src/api/client.ts`) with typed fetch wrappers
- Replace static `equations.ts` imports with API calls (keep static data as fallback)
- Add loading skeletons and error boundaries
- Add URL-based routing with `react-router-dom`:
  - `/` — equation atlas (current view)
  - `/equation/:id` — deep link to specific equation
  - `/lesson/:slug` — interactive lesson view
  - `/search` — search results
- Persist selected equation in URL so links are shareable

---

## PHASE 2: Complete All 17 Visualizations

Every equation MUST have a rich, interactive, mathematically accurate visualization — not a placeholder. For each scene component that is incomplete or missing:

1. **Pythagoras (id:1)** — Already built. Polish: add labels, step-through proof animation, keyboard drag support
2. **Logarithms (id:2)** — Interactive log scale slider: show how log compresses large ranges. Plot y=log_b(x) with adjustable base b. Show multiplication→addition relationship
3. **Calculus (id:3)** — Animated tangent line on a curve. Drag point along f(x), show slope = f'(x) in real-time. Toggle to show area under curve (integral) filling in
4. **Gravity (id:4)** — Two masses with adjustable size. Show gravitational force vector scaling with F=Gm1m2/r². Drag masses closer/apart, force arrow updates
5. **Complex Numbers (id:5)** — Argand diagram. Plot z = a+bi, show magnitude and angle. Multiply by i to rotate 90°. Interactive: drag point, see polar and rectangular forms
6. **Euler Polyhedra (id:6)** — 3D wireframe polyhedra (tetrahedron, cube, dodecahedron). Show V-E+F=2 with counts updating as you select different shapes
7. **Normal Distribution (id:7)** — Bell curve with adjustable μ and σ. Shade areas for 1σ, 2σ, 3σ. Show percentages. Click to sample random points
8. **Wave Equation (id:8)** — Animated standing wave. Adjust frequency, amplitude, wavelength. Show superposition of two waves
9. **Fourier Transform (id:9)** — Draw a waveform → decompose into sine components. Show frequency spectrum. Toggle individual harmonics on/off
10. **Navier-Stokes (id:10)** — 2D fluid simulation (simplified): particles flowing around an obstacle. Adjust viscosity. Show velocity field arrows
11. **Maxwell's Equations (id:11)** — Electric field lines from point charges. Place +/- charges, see field lines update. Show magnetic field from current loop
12. **Thermodynamics (id:12)** — Entropy visualization: ordered grid of particles → disordered state. Slider for temperature. Show S = k·ln(W) with microstate count
13. **Relativity (id:13)** — Lorentz factor γ vs velocity slider. Show time dilation: two clocks diverging. Length contraction of a moving object
14. **Schrödinger (id:14)** — Particle in a box: wave function ψ(x) for n=1,2,3... Show probability density |ψ|². Adjust potential well width
15. **Information Theory (id:15)** — Entropy of a binary source: slide probability p, show H(p) = -p·log(p) - (1-p)·log(1-p). Visualize with coin flip uncertainty
16. **Chaos Theory (id:16)** — Logistic map: x_next = r·x·(1-x). Bifurcation diagram as r slider moves from 1→4. Show period doubling → chaos
17. **Black-Scholes (id:17)** — Option price surface: adjust strike, volatility, time-to-expiry. Show call/put price curves. Greeks (delta, gamma) as overlays

Each visualization must:
- Be mathematically correct (use the math-verifier agent to check)
- Have smooth animations via Framer Motion or requestAnimationFrame
- Include interactive controls (sliders, drag handles, toggles)
- Display the equation in KaTeX with highlighted variables that correspond to the visualization
- Show labels/annotations explaining what's happening
- Be responsive (use ResizeObserver pattern from PythagoreanTheoremExplorer)

---

## PHASE 3: UI/UX Polish

### 3.1 — Design System Upgrade
- Add dark mode: define dark variants for all Tailwind tokens, toggle with `prefers-color-scheme` + manual switch
- Add smooth page transitions with Framer Motion `AnimatePresence`
- Sidebar: add category grouping (Geometry, Algebra, Physics, etc.) with collapsible sections
- Sidebar: show progress indicators per equation (not started / in progress / completed)
- Add a top navigation bar with: logo, search input, dark mode toggle, progress summary
- Mobile responsive: sidebar becomes a slide-out drawer on small screens
- Add keyboard shortcuts: arrow keys to navigate equations, Escape to close panels

### 3.2 — Interactive Lesson System
- Expand `InteractiveEquation.tsx` into a full lesson framework:
  - Multi-step lessons with progress bar
  - Each step: instruction → interactive challenge → verification → next
  - Support different interaction types: drag-to-solve, fill-in-the-blank, multiple-choice, free-form LaTeX input
  - Celebration animation on completion (confetti or subtle glow)
  - Track completion in UserProgress

### 3.3 — Search & Discovery
- Full-text search across equations: title, author, category, year, description
- Filter by category chips
- Sort by: chronological, alphabetical, category
- "Related equations" suggestions at the bottom of each visualization

### 3.4 — Onboarding
- First-visit tutorial overlay: highlight sidebar, explain how to interact with visualizations
- Tooltip hints on interactive elements ("drag to adjust", "click to explore")

---

## PHASE 4: Performance & Quality

### 4.1 — Performance
- Lazy-load equation scene components with `React.lazy` + `Suspense`
- Virtualize sidebar list if it grows beyond 17 (future-proof)
- Memoize expensive D3 calculations
- Use `will-change` CSS for animated SVG/Canvas elements
- Add loading skeletons for API-fetched content
- Measure and optimize Largest Contentful Paint (LCP) < 2.5s

### 4.2 — Accessibility (run accessibility-auditor agent)
- All SVG visualizations: `role="img"`, `aria-label` with math description
- Interactive elements: keyboard operable (Tab, Enter, Arrow keys, Escape)
- KaTeX formulas: `aria-label` with spoken math ("a squared plus b squared equals c squared")
- Color contrast: verify all token combinations meet WCAG AA (4.5:1 text, 3:1 UI)
- Focus management: visible focus rings, logical tab order
- Screen reader announcements for state changes in interactive elements
- Reduced motion: respect `prefers-reduced-motion`, provide static alternatives

### 4.3 — Testing
- Frontend: set up Vitest + React Testing Library
  - Unit tests for each scene component (renders without crash, correct math output)
  - Integration test for equation navigation flow
  - Snapshot tests for KaTeX formula rendering
- Backend: pytest + Django test client
  - Test all API endpoints (200, 404, 400 cases)
  - Test model validation
  - Test search endpoint
  - Test pagination
- Add `npm run test` and `pytest` scripts
- Type coverage: zero `any` types, strict TypeScript

### 4.4 — Error Handling
- Global error boundary with friendly math-themed error page
- API error states: retry button, offline detection
- Graceful degradation: if a visualization fails, show the equation + description instead of crashing

---

## PHASE 5: Production Readiness

- Add `Dockerfile` for backend (Django + Gunicorn)
- Add `Dockerfile` for frontend (nginx serving static build)
- Add `docker-compose.yml` for local full-stack development
- Add GitHub Actions CI workflow:
  - On PR: lint, type-check, test (frontend + backend)
  - On merge to main: build + deploy
- Add `.env.example` with all required environment variables documented
- Add `CONTRIBUTING.md` with development setup and PR guidelines
- Update `README.md` with badges (CI status, license) and screenshots section

---

## Execution Rules

1. Work phase by phase, in order. Complete each phase before moving on.
2. After each major component, run `npx tsc --noEmit` to catch type errors immediately.
3. Use the `frontend-specialist` agent for complex visualization components.
4. Use the `math-verifier` agent after building each equation scene.
5. Use the `code-reviewer` agent after completing each phase.
6. Use the `accessibility-auditor` agent after Phase 3.
7. Commit after each completed phase with a descriptive message.
8. If a visualization requires a library not yet installed, install it and document why.
9. Every component must be fully functional — no TODOs, no placeholders, no "coming soon".
10. Prefer elegant, minimal code. Each visualization should feel like a crafted demo, not a test page.
