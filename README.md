# Sciencebouk — Interactive Math Education Platform

An interactive web application that brings 17 landmark mathematical equations to life through rich visualizations, hands-on exploration, and guided lessons.

## Quick Start

### Development (local)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_equations
python manage.py runserver                  # http://localhost:8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                                 # http://localhost:5173
```

### Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# API: http://localhost:8000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6.3, Tailwind CSS 3.4 |
| Visualization | D3.js 7.9, Konva 10.2, Framer Motion 12.6 |
| Math rendering | KaTeX 0.16 |
| Data fetching | TanStack React Query 5, React Router 7 |
| Backend | Django 5.2, Django REST Framework 3.16, SQLite |
| Testing | Vitest + React Testing Library (frontend), Django TestCase (backend) |
| CI/CD | GitHub Actions |

## Features

- **17 interactive equation visualizations** — each with sliders, drag handles, and real-time animations
- **Dark mode** — toggleable with system preference detection
- **URL routing** — shareable deep links to each equation (`/equation/3`)
- **Category navigation** — collapsible sidebar groups by subject area
- **Search** — filter equations by title, author, or category
- **Keyboard shortcuts** — arrow keys to navigate, `/` to search, `Esc` to close
- **Mobile responsive** — slide-out drawer on small screens
- **Error boundaries** — graceful degradation if a visualization fails
- **Lazy loading** — scene components code-split for fast initial load

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/health/` | Health check |
| GET | `/api/equations/` | Paginated list (filterable by `?category=`) |
| GET | `/api/equations/{id}/` | Single equation detail |
| PATCH | `/api/equations/{id}/progress/` | Update user progress |
| GET | `/api/search/?q=` | Search equations |
| GET | `/api/courses/{slug}/` | Course with nested lessons |

## The 17 Equations

| # | Equation | Category | Visualization |
|---|----------|----------|---------------|
| 1 | Pythagoras's Theorem | Geometry | Draggable proof with area squares |
| 2 | Logarithms | Algebra | Log scale bars + adjustable base curve |
| 3 | Calculus | Calculus | Tangent/secant line with h slider |
| 4 | Law of Gravity | Physics | Draggable masses with force vectors |
| 5 | Complex Numbers | Complex Numbers | Argand diagram with multiply-by-i |
| 6 | Euler's Polyhedra Formula | Topology | 3D rotating polyhedra wireframes |
| 7 | Normal Distribution | Statistics | Bell curve with adjustable mean/std |
| 8 | Fourier Transform | Signal Processing | Waveform decomposition into harmonics |
| 9 | Wave Equation | Physics | Standing waves with frequency/amplitude |
| 10 | Navier-Stokes | Fluid Dynamics | Particle flow around obstacle |
| 11 | Maxwell's Equations | Electromagnetism | Field lines + EM wave propagation |
| 12 | Thermodynamics | Thermodynamics | Entropy particle disorder simulation |
| 13 | Relativity | Physics | Lorentz factor, time dilation clocks |
| 14 | Schrodinger's Equation | Quantum Mechanics | Particle-in-a-box wave functions |
| 15 | Information Theory | Information | Shannon entropy + coin flip explorer |
| 16 | Chaos Theory | Dynamical Systems | Bifurcation diagram + cobweb plot |
| 17 | Black-Scholes | Finance | Option pricing with Greeks overlay |

## Testing

```bash
# Frontend: 8 tests
cd frontend && npm run test

# Backend: 76 tests
cd backend && source .venv/bin/activate && python manage.py test courses -v 2
```

## Environment Variables

See [`.env.example`](.env.example) for all configuration options.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
