---
name: d3-rewrite
description: Rewrite all equation scenes to use real D3.js — not React SVG with D3 as a calculator
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# REWRITE ALL SCENES WITH REAL D3.js

## THE PROBLEM

Every scene currently does this:

```tsx
// WRONG — D3 as a calculator, React renders SVG
import { scaleLinear, line } from "d3"

function Scene() {
  const [dragging, setDragging] = useState(null)
  const handlePointerDown = (e) => { ... }  // manual drag reimplementation
  const handlePointerMove = (e) => { ... }  // manual SVG point math
  
  return (
    <svg>
      <circle cx={px} cy={py} onPointerDown={handlePointerDown} />  {/* React JSX SVG */}
      <motion.line animate={{ x1, y1, x2, y2 }} />  {/* Framer Motion on SVG?? */}
    </svg>
  )
}
```

This is wrong because:
1. D3's `drag()` handles touch, mouse, pointer capture, coordinate transforms automatically — reimplementing it is buggy
2. D3's `transition()` is built for SVG — Framer Motion is for DOM elements
3. React re-renders the entire SVG on every state change — D3 surgically updates only what changed
4. No zoom, brush, or advanced interactions possible with this pattern

## THE CORRECT PATTERN

See `CalculusScene.tsx` for the reference implementation. Here's the architecture:

```tsx
function D3Scene({ vars, onVarChange, highlightedVar, onHighlight }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<Selection>(null)  // D3 group reference
  
  // 1. SETUP — runs once, creates all SVG elements
  useEffect(() => {
    const svg = select(containerRef.current)
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
    
    const g = svg.append("g")
    gRef.current = g
    
    // Create ALL elements once
    g.append("path").attr("class", "main-curve")
    g.append("circle").attr("class", "draggable-dot")
    g.append("text").attr("class", "value-label")
    // etc.
    
    // Set up D3 drag on interactive elements
    const dragBehavior = drag()
      .on("start", function() { select(this).style("cursor", "grabbing") })
      .on("drag", (event) => {
        const dataX = xScale.invert(event.x)
        onVarChangeRef.current('varName', clamp(dataX, min, max))
      })
      .on("end", function() { select(this).style("cursor", "grab") })
    
    g.select(".draggable-dot").call(dragBehavior)
    
    return () => { select(containerRef.current).select("svg").remove() }
  }, [])  // ONLY ONCE
  
  // 2. UPDATE — runs on every variable change, uses D3 transitions
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    
    // D3 transitions — smooth, performant, SVG-native
    g.select(".draggable-dot")
      .transition().duration(150)
      .attr("cx", xScale(vars.x))
      .attr("cy", yScale(f(vars.x)))
    
    g.select(".value-label")
      .text(`x = ${vars.x.toFixed(1)}`)
    
  }, [vars, highlightedVar])
  
  // 3. HOVER — cross-highlighting
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select(".draggable-dot")
      .on("mouseenter", () => onHighlight('x'))
      .on("mouseleave", () => onHighlight(null))
  }, [onHighlight])
  
  return (
    <div ref={containerRef} className="h-full w-full" />
    // NO SVG IN JSX — D3 owns it entirely
  )
}
```

## KEY RULES

### D3 owns the SVG
- Container div is `ref={containerRef}`, NO JSX SVG elements
- `d3.select(container).append("svg")` creates the SVG
- All elements created with `g.append("circle")`, `g.append("text")`, etc.
- Elements are identified by CSS class: `.attr("class", "my-element")`
- Updates via `g.select(".my-element").transition().duration(150).attr(...)`

### D3 drag() for ALL interactive elements
- `d3.drag()` handles mouse, touch, pointer capture automatically
- `event.x`, `event.y` are already in SVG coordinate space — no manual `createSVGPoint` math
- `.on("start")` → cursor change + glow
- `.on("drag")` → update variable via `onVarChange`
- `.on("end")` → cursor restore + remove glow
- Minimum drag target: use an invisible `circle r=44` behind the visible element

### D3 transition() for animations
- `selection.transition().duration(ms).attr(...)` — not Framer Motion
- Chain transitions: `.transition().delay(100).attr(...)`
- Use `.ease(d3.easeCubicOut)` for natural motion
- For continuous animations (pulsing glow), use SVG `<animate>` element

### Consistent sizing
- All scenes: `const W = 900, H = 440`
- Font sizes: labels 16-18px, values 14-16px, headings 18-20px, ticks 13px
- All fonts: `fontFamily: "Manrope, sans-serif"`
- Drag handles: visible dot r=10, hit area r=44
- Glow ring: r=22, dashed, animated stroke-dashoffset

### Info boxes — ANCHORED positions, not floating
- t/x value: top-left corner of plot
- Result (slope, force, etc.): top-right corner
- Secondary info: below the result box
- NEVER let labels overlap the visualization or float near the drag point

## SCENES TO REWRITE

CalculusScene.tsx is already done. Apply the same pattern to all others:

1. **GravityScene.tsx** — masses with drag, force arrows with D3 transition
2. **LogarithmScene.tsx** — bar chart with drag, D3 scales for log values
3. **NormalDistributionScene.tsx** — bell curve with draggable peak (D3 drag on the curve itself)
4. **WaveScene.tsx** — animated wave with D3 transitions on amplitude/frequency
5. **ComplexScene.tsx** — Argand diagram with draggable point, D3 for rotation animation
6. **EulerPolyhedraScene.tsx** — 3D wireframe with D3 transitions between shapes
7. **FourierScene.tsx** — waveform decomposition, D3 for harmonic rendering
8. **ChaosScene.tsx** — bifurcation diagram with D3 brush for r selection
9. **FluidScene.tsx** — particle simulation with D3 force layout or manual update
10. **MaxwellScene.tsx** — field lines with D3 drag for charges
11. **EntropyScene.tsx** — particle animation with D3 transitions
12. **RelativityScene.tsx** — twin paradox with D3 transitions on clocks
13. **SchrodingerScene.tsx** — wave function with D3 area/line
14. **InformationScene.tsx** — entropy curve with D3 drag
15. **BlackScholesScene.tsx** — option price curves with D3 brush
16. **PythagorasScene.tsx** — draggable triangle with D3 drag on corners

## FOR EACH SCENE:

1. Read the current code
2. Extract the math functions (f(x), computations)
3. Extract the variables and lesson steps (keep as-is)
4. Rewrite the Visual component using the D3 pattern above:
   - `useEffect` #1: create SVG + elements + drag behaviors (runs once)
   - `useEffect` #2: update positions/values with D3 transitions (runs on var change)
   - `useEffect` #3: hover handlers for cross-highlighting
   - Container div with `ref`, NO JSX SVG
5. Keep the `TeachableEquation` wrapper (it manages lessons, formula bar)
6. Run `npx tsc --noEmit` after each scene
7. Verify in browser: drag works, transitions are smooth, labels don't overlap

## WHAT TO REMOVE
- All `<motion.circle>`, `<motion.line>`, `<motion.text>` — replace with D3 transitions
- All manual `onPointerDown/Move/Up` handlers — replace with `d3.drag()`
- All `useState` for drag state — D3 drag manages this internally
- All `createSVGPoint` / `getScreenCTM` math — D3 drag gives you SVG coords automatically
- All `setPointerCapture` calls — D3 drag handles this
- All `useCallback` for pointer handlers — not needed with D3 drag

## EXECUTION ORDER

Priority (most visible, most interactive):
1. GravityScene (draggable masses)
2. NormalDistributionScene (draggable peak)  
3. PythagorasScene (draggable triangle)
4. WaveScene (amplitude/frequency)
5. ChaosScene (bifurcation r slider)
6. ComplexScene (Argand diagram)

Then the rest in any order.

After each scene, verify:
- Drag feels immediate and responsive (no lag)
- Transitions are smooth (D3 easing, not React re-render jank)
- Labels are anchored in fixed positions (not floating chaotically)
- Font sizes are consistent (16-18px labels, 13px ticks)
- Hit areas are large enough for touch (r=44 invisible circle)
