# Formulas — Interactive Math Education Platform

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
