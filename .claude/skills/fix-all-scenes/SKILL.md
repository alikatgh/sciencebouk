---
name: fix-all-scenes
description: Rewrite all 17 scenes — responsive D3, no hardcoded coords, fill container, proper layout
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# FIX ALL 17 SCENES — Responsive, Clean, Professional

## THE DISEASE

Every scene has hundreds of lines of hardcoded pixel coordinates:
```typescript
const curveLeft = 60      // HARDCODED
const barLeft = 500       // HARDCODED
const coinPanelLeft = 690 // HARDCODED
const W = 900, H = 440   // HARDCODED
```

This means:
- The SVG can NEVER fill its container — it's a rigid 900×440 box
- On a wide monitor with sidebar collapsed, 40% of the screen is dead white space
- On a narrow panel, content gets squished or cut off
- Adding/removing panels requires recalculating 50+ magic numbers
- Every scene is a brittle house of cards

## THE CURE

Every scene must follow this architecture:

### 1. Measure the container, not hardcode dimensions

```typescript
function D3Scene({ vars, ... }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const render = () => {
      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500

      select(el).select("svg").remove()
      const svg = select(el).append("svg")
        .attr("width", W).attr("height", H)
        .style("display", "block")
        .style("touch-action", "none")

      // ALL layout computed from W and H
      const margin = { top: W * 0.04, right: W * 0.04, bottom: W * 0.06, left: W * 0.06 }
      const plotW = W - margin.left - margin.right
      const plotH = H - margin.top - margin.bottom

      const xScale = scaleLinear().domain([0, 1]).range([margin.left, margin.left + plotW])
      const yScale = scaleLinear().domain([0, 1.1]).range([margin.top + plotH, margin.top])

      // ... build everything from scales, not pixels ...
    }

    render()
    const observer = new ResizeObserver(() => requestAnimationFrame(render))
    observer.observe(el)
    return () => { observer.disconnect(); select(el).select("svg").remove() }
  }, [vars, highlightedVar])  // re-render on any change

  return <div ref={containerRef} className="h-full w-full" />
}
```

### 2. Use D3 scales for EVERYTHING — no magic numbers

```typescript
// WRONG
g.append("rect").attr("x", 500).attr("y", 70).attr("width", 190)

// RIGHT
const barScale = scaleBand()
  .domain(["p", "1-p"])
  .range([margin.left + plotW * 0.6, margin.left + plotW * 0.85])
  .padding(0.3)

g.append("rect")
  .attr("x", barScale("p"))
  .attr("width", barScale.bandwidth())
```

### 3. Use D3 axes instead of manual tick rendering

```typescript
// WRONG — 30 lines of manual tick labels
for (const v of [0, 0.25, 0.5, 0.75, 1.0]) {
  g.append("line").attr("x1", xScale(v)).attr("y1", ...) // ugh
  g.append("text").attr("x", xScale(v)).attr("y", ...).text(v.toFixed(2)) // kill me
}

// RIGHT — 2 lines
g.append("g")
  .attr("transform", `translate(0,${margin.top + plotH})`)
  .call(axisBottom(xScale).ticks(5).tickFormat(d => d.toFixed(2)))
  .attr("font-family", "Manrope, sans-serif")

g.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(axisLeft(yScale).ticks(5))
  .attr("font-family", "Manrope, sans-serif")
```

Import: `import { axisBottom, axisLeft } from "d3"`

### 4. Use D3 scaleBand for panel layouts

When a scene has multiple panels (chart + bars + sim), don't hardcode positions. Use `scaleBand`:

```typescript
const panels = scaleBand()
  .domain(["chart", "bars", "sim"])
  .range([margin.left, W - margin.right])
  .padding(0.05)

// Each panel gets its allocated space
const chartX = panels("chart")!
const chartW = panels.bandwidth()
const barsX = panels("bars")!
const barsW = panels.bandwidth()
```

### 5. Font sizes proportional to container

```typescript
const fs = {
  title: Math.max(14, Math.min(22, H / 22)),
  label: Math.max(12, Math.min(18, H / 28)),
  tick:  Math.max(10, Math.min(14, H / 35)),
  value: Math.max(14, Math.min(20, H / 24)),
}
```

### 6. Container div is just `h-full w-full`

```tsx
return <div ref={containerRef} className="h-full w-full" />
```

No `style={{ aspectRatio }}`. No `overflow-hidden`. No fixed dimensions. The SVG fills whatever the layout gives it.

## SCENE-BY-SCENE REWRITE GUIDE

For EACH scene, the rewrite follows this pattern:

1. **Delete** all `const W/H/left/right/top/bottom` hardcoded values
2. **Add** ResizeObserver to measure container
3. **Replace** magic pixel positions with D3 scales (`scaleLinear`, `scaleBand`, `axisBottom`)
4. **Replace** manual tick rendering with `d3.axisBottom()` / `d3.axisLeft()`
5. **Make** font sizes proportional to container dimensions
6. **Keep** the math functions, variables, lessons, TeachableEquation wrapper unchanged
7. **Keep** D3 drag behaviors but use scale-based coordinate conversion

### Specific guidance per scene:

**InformationScene** (current worst offender — 495 lines, 30+ magic numbers):
- 3-panel layout → use `scaleBand` for panel positions
- Entropy curve → `scaleLinear` for x/y, `d3.axisBottom/Left` for ticks
- Bar chart → `scaleBand` for bar positions, `scaleLinear` for height
- Coin flip sim → position within its panel band
- Bottom entropy display → position relative to bottom of container
- Target: <250 lines

**NormalDistributionScene**:
- Bell curve → `scaleLinear` x/y with `d3.axisBottom/Left`
- Sigma shading regions → computed from scales
- Draggable peak → D3 drag with `xScale.invert(event.x)`

**FourierScene**:
- Waveform display → full-width `scaleLinear`
- Harmonic toggles → `scaleBand` for button positions
- Combined wave → path from `d3.line`

**ChaosScene**:
- Bifurcation diagram → `scaleLinear` x (r) and y (x_n)
- Time series → separate `scaleLinear` if split view
- r slider → D3 `brush` or drag along x-axis

**BlackScholesScene**:
- Option price curves → `scaleLinear` with `d3.axisBottom/Left`
- Greeks overlay → same scales, different series

**CalculusScene** (partially fixed):
- Already uses D3 but still has `const W = 900, H = 460`
- Needs ResizeObserver treatment

**GravityScene** (partially fixed):
- Same — needs ResizeObserver

**All other scenes**: same pattern. Read → identify hardcoded coords → replace with scales → add ResizeObserver.

## D3 IMPORTS NEEDED

Make sure each scene imports what it uses:
```typescript
import {
  select,
  scaleLinear,
  scaleBand,      // for multi-panel layouts
  axisBottom,     // for x-axis
  axisLeft,       // for y-axis
  line,           // for paths
  area,           // for filled areas
  range,          // for data generation
  drag,           // for interactivity
  type D3DragEvent,
} from "d3"
```

## EXECUTION ORDER

Start with the worst offenders (most hardcoded, most broken):

1. **InformationScene** — 30+ magic numbers, 3 panels
2. **NormalDistributionScene** — complex curve + shading
3. **BlackScholesScene** — multiple curves + overlay
4. **MaxwellScene** — field lines + wave display
5. **FourierScene** — harmonics + combined wave
6. **ChaosScene** — bifurcation diagram
7. **SchrodingerScene** — wave functions
8. **FluidScene** — particle simulation
9. **EntropyScene** — particle animation
10. **ComplexScene** — Argand diagram
11. **EulerPolyhedraScene** — 3D wireframes
12. **LogarithmScene** — bar chart + curve
13. **WaveScene** — standing wave
14. **RelativityScene** — time dilation
15. **CalculusScene** — add ResizeObserver to existing
16. **GravityScene** — add ResizeObserver to existing
17. **PythagorasScene** — already responsive, verify

After EACH scene:
- `npx tsc --noEmit`
- Resize browser window → visualization fills space
- Collapse/expand sidebar → no dead space
- Drag variables → smooth, no jank
- All labels readable at any size

## THE RESULT

Every scene:
- Fills 100% of available space — zero dead white pixels
- Resizes smoothly when window/sidebar changes
- Labels scale proportionally — always readable
- Uses D3 axes (not 30 lines of manual tick rendering)
- Uses D3 scales for ALL positioning (not `const barLeft = 500`)
- Under 250 lines (down from 400-500)
- Clean, maintainable, professional
