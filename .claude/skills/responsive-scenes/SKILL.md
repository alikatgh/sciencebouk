---
name: responsive-scenes
description: Make all D3 scenes responsive — measure container, fill every pixel, no hardcoded dimensions
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# RESPONSIVE D3 SCENES — Fill Every Pixel

## THE PROBLEM

Every scene has `const W = 900; const H = 440` hardcoded. The SVG viewBox is fixed. The scene renders at that aspect ratio regardless of how much screen space is available. Result: dead white space everywhere, especially when the sidebar is collapsed or on wide monitors.

The SVG `<rect width="900" height="440">` is a rigid box sitting inside a flexible layout. The layout around it (sidebar, header, controls panel) is all flexbox. But the visualization — the MAIN CONTENT — is the one thing that doesn't flex.

## THE SOLUTION

Every D3 scene must:
1. **Measure its container** with `ResizeObserver`
2. **Set the SVG viewBox dynamically** to match the actual available pixels
3. **Recompute all D3 scales and positions** when the container resizes
4. **Never hardcode W and H** — read them from the container

## ARCHITECTURE

### The `useContainerSize` hook

Create `frontend/src/hooks/useContainerSize.ts`:

```typescript
import { useEffect, useRef, useState } from "react"

interface Size { width: number; height: number }

export function useContainerSize(
  ref: React.RefObject<HTMLDivElement | null>
): Size {
  const [size, setSize] = useState<Size>({ width: 900, height: 440 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setSize({ width: Math.round(width), height: Math.round(height) })
      }
    })

    observer.observe(el)

    // Initial measurement
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    }

    return () => observer.disconnect()
  }, [ref])

  return size
}
```

### How scenes use it

```typescript
function D3SomeScene({ vars, onVarChange, ... }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)

  // D3 setup — re-runs when W or H change
  useEffect(() => {
    const el = containerRef.current
    if (!el || W < 100 || H < 100) return

    // Clear and rebuild SVG at new size
    select(el).select("svg").remove()

    const svg = select(el)
      .append("svg")
      .attr("width", W)
      .attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`)
      // NO preserveAspectRatio — fill the container exactly
      .style("display", "block")

    // ... create all elements with scales based on W, H ...

    // Scales use actual dimensions
    const xScale = scaleLinear().domain([0, 10]).range([margin, W - margin])
    const yScale = scaleLinear().domain([0, 14]).range([H - margin, margin])

    // ... rest of setup ...

    return () => { select(el).select("svg").remove() }
  }, [W, H])  // REBUILD on resize

  // Update on var change (separate effect, no rebuild)
  useEffect(() => {
    // ... update element positions using current W, H ...
  }, [vars, W, H, highlightedVar])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      // NO aspect-ratio, NO fixed dimensions — pure flex fill
    />
  )
}
```

### Key differences from current approach

| Current (broken) | New (responsive) |
|---|---|
| `const W = 900, H = 440` | `const { width: W, height: H } = useContainerSize(containerRef)` |
| `viewBox="0 0 900 440"` | `viewBox="0 0 ${W} ${H}"` with actual width/height attrs |
| `preserveAspectRatio="xMidYMid meet"` | No preserveAspectRatio — SVG IS the container |
| `style={{ aspectRatio: "900/440" }}` on container | `className="h-full w-full"` — fill parent |
| Scales hardcoded to 900/440 | Scales computed from measured W, H |
| Setup runs once `[]` | Setup runs on resize `[W, H]` |
| `<rect width={900} height={440}>` | `<rect width={W} height={H}>` |

### Container CSS

The container div must be a flex child that fills all available space:

```tsx
// In the scene component
<div ref={containerRef} className="h-full w-full" />

// In TeachableEquation, the visualization area:
<div className="min-h-0 min-w-0 flex-1">
  {children({ vars, setVar, ... })}
</div>
```

No `aspect-ratio`. No `max-height`. No `overflow-hidden` on the container. The SVG fills whatever space the layout gives it.

### Adaptive margins and font sizes

With responsive sizing, margins and font sizes should scale too:

```typescript
// Scale-aware sizing
const baseFontSize = Math.min(W, H) / 40  // ~11px at 440px, ~20px at 800px
const margin = Math.max(30, Math.min(60, W * 0.05))
const dotRadius = Math.max(6, Math.min(12, W / 80))
const labelSize = Math.max(12, Math.min(18, baseFontSize * 1.3))
const tickSize = Math.max(10, Math.min(14, baseFontSize))
```

### Performance: debounce resize

ResizeObserver fires on every pixel change during resize. The hook should debounce:

```typescript
// In useContainerSize
const observer = new ResizeObserver((entries) => {
  // Use requestAnimationFrame to batch
  requestAnimationFrame(() => {
    const { width, height } = entries[0].contentRect
    if (width > 0 && height > 0) {
      setSize({ width: Math.round(width), height: Math.round(height) })
    }
  })
})
```

D3 rebuilds are cheap (a few ms) because we only create ~20-50 SVG elements. No need for heavy debouncing.

## HOW TO APPLY TO EACH SCENE

For each scene file in `frontend/src/components/scenes/`:

1. **Remove** `const W = 900` and `const H = 440` (or whatever hardcoded values)
2. **Add** `import { useContainerSize } from "../../hooks/useContainerSize"`
3. **Add** `const { width: W, height: H } = useContainerSize(containerRef)` at top of component
4. **Change** the setup `useEffect` deps from `[]` to `[W, H]`
5. **Change** the container div from `style={{ aspectRatio: "..." }}` to `className="h-full w-full"`
6. **Change** all scale computations to use dynamic W, H
7. **Remove** `preserveAspectRatio` from SVG (set width/height attrs instead)
8. **Make** margins, font sizes, dot radii proportional to W/H

### Also fix TeachableEquation wrapper

The visualization child must get `h-full w-full` from the parent. Check `TeachableEquation.tsx` — the child wrapper should be:

```tsx
<div className="min-h-0 min-w-0 flex-1">
  {children({ vars, setVar, ... })}
</div>
```

And in `App.tsx`, the content area:
```tsx
<div className="flex-1 overflow-hidden p-2">
  <FormulaProvider value={selectedEquation.formula}>
    <EquationVisualization equation={selectedEquation} />
  </FormulaProvider>
</div>
```

No `overflow-y-auto` — the scene handles its own space. No padding that wastes pixels.

## EXECUTION

1. Create `useContainerSize` hook
2. Fix TeachableEquation + App layout to give full height/width to visualization
3. Convert PythagorasScene (reference implementation)
4. Convert CalculusScene
5. Convert GravityScene
6. Convert all remaining 14 scenes
7. Run `npx tsc --noEmit` after each
8. Test: resize browser window, collapse/expand sidebar — visualization must smoothly fill all available space at all times

## THE RESULT

- Sidebar open: visualization fills ~70% of screen width, full height
- Sidebar collapsed: visualization fills ~95% of screen width, full height
- Small window: visualization shrinks proportionally, labels stay readable
- Wide monitor: visualization spreads out, uses every pixel
- **Zero dead white space anywhere**
