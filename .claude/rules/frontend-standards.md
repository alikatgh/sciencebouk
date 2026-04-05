---
paths:
  - "frontend/**/*.{ts,tsx}"
---

# Frontend Development Rules

## Components
- Functional components only — never class components
- Export named components, not default exports (except pages)
- Co-locate types with components — no separate types file unless shared
- Props interface named `{ComponentName}Props`

## Hooks & State
- `useState` for local UI state
- `useMemo` for expensive computations (geometry, scales, paths)
- `useCallback` for event handlers passed to children
- No Redux, Zustand, or Context unless complexity demands it

## Visualization Components
- Each equation gets its own scene component
- SVG for static/simple visuals, Konva for complex interactive canvas
- D3 for scales, paths, and data transformations — not for DOM manipulation
- Framer Motion for enter/exit animations
- All formulas in KaTeX LaTeX syntax

## Styling
- Tailwind utility classes — no inline styles or CSS files per component
- Custom tokens: ink (text), mist (bg), ocean (primary), aqua (secondary), sunrise (highlight), ember (error)
- Responsive: use Tailwind breakpoints, not manual media queries

## TypeScript Strictness
- No `any` types — use `unknown` and narrow, or define proper interfaces
- All component props must have explicit TypeScript interfaces
- Event handlers must be properly typed (not `(e: any) => ...`)
- Prefer `Record<string, T>` over `{ [key: string]: T }`

## Performance Patterns
- D3 scenes: SVG creation in useEffect with `[]` deps — never rebuild SVG on state change
- D3 drag handlers must update DOM directly, sync React state only on drag end
- Use `useRef` for values needed in D3 callbacks to avoid stale closures
- Memoize filtered/computed arrays with useMemo when passed as props

## Accessibility
- Interactive SVG elements need `role` and `aria-label` attributes
- KaTeX formulas need `aria-label` with spoken-math equivalent
- All buttons and links must have accessible names
- Color is never the only indicator — always pair with shape or text
