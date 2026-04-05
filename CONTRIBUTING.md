# Contributing to Sciencebouk

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.12+
- npm

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_equations
python manage.py runserver
```
API available at http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App available at http://localhost:5173

### Docker (full stack)
```bash
docker compose up --build
```
Frontend at http://localhost:3000, API at http://localhost:8000

## Running Tests

```bash
# Frontend
cd frontend && npm run test

# Backend
cd backend && source .venv/bin/activate && python manage.py test courses -v 2
```

## Code Standards

- **Frontend**: TypeScript strict mode, functional components only, Tailwind CSS
- **Backend**: PEP 8, Django REST Framework, type hints
- **Visualizations**: SVG preferred, D3 for scales/paths, Framer Motion for animations

## Adding a New Equation

1. Add entry to `frontend/src/data/equations.ts`
2. Create scene component in `frontend/src/components/scenes/`
3. Register in `frontend/src/components/EquationVisualization.tsx`
4. Add to backend seed command in `backend/courses/management/commands/seed_equations.py`
5. Run migrations and seed: `python manage.py seed_equations`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Run `npx tsc --noEmit` before submitting
- All CI checks must pass
