---
name: upgrade-scenes
description: Upgrade all 17 equation scenes with proper D3 interactivity, visible drag affordances, bigger fonts, and TeachableEquation integration
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# UPGRADE ALL 17 SCENES TO WORLD-CLASS INTERACTIVE

## THE PROBLEM

The teaching framework (`TeachableEquation`, `TouchableFormula`, `LessonRunner`, `RealWorldContext`) is already built and working. D3 is installed and partially used. But the SCENES themselves have these problems:

1. **Tiny fonts** — SVG text at 12-13px is unreadable. Labels, values, annotations are all too small.
2. **Invisible drag affordances** — draggable elements look identical to static ones. No cursor change, no hover glow, no "grab me" hint.
3. **Some scenes still use the old pattern** — `PythagoreanTheoremExplorer` doesn't use `TeachableEquation` at all.
4. **Raw text labels** — showing `b^2` instead of proper superscript or formatted math.
5. **No visual feedback on drag** — when you grab something, there's no glow, no scale-up, no indication you're controlling it.
6. **Missing connection arrows** — when you drag a variable in the formula, there's no visual indication of WHICH element in the visualization corresponds to it.

## THE FIX — SCENE BY SCENE

For EVERY scene in `frontend/src/components/scenes/` and `PythagoreanTheoremExplorer.tsx`:

### A. Font Size Overhaul

Apply these MINIMUM font sizes throughout all SVG scenes:

| Element Type | Current | Target |
|-------------|---------|--------|
| Variable labels (m₁, r, σ) | 12-13px | 18-20px |
| Value labels (3.0 kg, r = 5.1) | 12-13px | 16-18px |
| Title/heading text in SVG | 14-16px | 20-24px |
| Annotation text (insight) | 11-12px | 15-16px |
| Axis tick labels | 10-12px | 14-15px |
| "drag me" hints | 12px | 16px with opacity animation |
| Force/result values (F = 0.39 N) | 14-15px | 20-22px, bold |

Use the Manrope font family everywhere: `fontFamily="Manrope, sans-serif"`.

### B. Visible Drag Affordances

Every draggable element in every SVG must have ALL of these:

1. **Cursor**: `style={{ cursor: 'grab' }}` on hover, `cursor: 'grabbing'` while dragging
2. **Hover glow**: On `mouseenter`/`pointerenter`, add a subtle glow ring or scale-up (1.0 → 1.08)
3. **Drag handle indicator**: A small visual hint near the draggable element:
   - For circles (masses, points): pulsing ring or dashed outline
   - For sliders/handles: ↕ or ↔ arrows icon
   - For draggable lines: grip dots pattern
4. **Active state**: While dragging, the element should:
   - Scale up slightly (1.05-1.1x)
   - Get a colored drop shadow matching its variable color
   - The corresponding variable in the formula should highlight simultaneously
5. **First-visit hint**: Show a small "drag me" label with a subtle bounce animation that fades after the first interaction. Use framer-motion or CSS keyframes.

Implementation pattern for draggable SVG elements:

```tsx
// Draggable circle example
<g
  style={{ cursor: dragging === 'm1' ? 'grabbing' : 'grab' }}
  onPointerDown={handlePointerDown('m1')}
  onPointerEnter={() => onHighlight('m1')}
  onPointerLeave={() => onHighlight(null)}
>
  {/* Hover/active glow ring */}
  {(m1Active || dragging === 'm1') && (
    <circle
      cx={x1} cy={centerY} r={r1 + 8}
      fill="none"
      stroke={VAR_COLORS.primary}
      strokeWidth={2}
      strokeDasharray="6 4"
      opacity={0.5}
    >
      <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1.5s" repeatCount="indefinite" />
    </circle>
  )}
  {/* Main element */}
  <circle
    cx={x1} cy={centerY} r={dragging === 'm1' ? r1 * 1.05 : r1}
    fill={m1Active ? VAR_COLORS.primary : '#93bbfd'}
    stroke={VAR_COLORS.primary} strokeWidth={3}
  />
  {/* Label */}
  <text
    x={x1} y={centerY + 6}
    textAnchor="middle" fontSize={20} fontWeight={700}
    fontFamily="Manrope, sans-serif"
    fill="white" style={{ pointerEvents: 'none' }}
  >
    m₁
  </text>
  {/* Value below */}
  <text
    x={x1} y={centerY + r1 + 26}
    textAnchor="middle" fontSize={16} fontWeight={600}
    fontFamily="Manrope, sans-serif"
    fill={VAR_COLORS.primary}
  >
    {m1.toFixed(1)} kg
  </text>
</g>
```

### C. Migrate PythagoreanTheoremExplorer to TeachableEquation

The Pythagoras scene at `frontend/src/components/PythagoreanTheoremExplorer.tsx` is the ONLY scene not using the `TeachableEquation` framework. Migrate it:

1. Create `frontend/src/components/scenes/PythagorasScene.tsx` following the same pattern as `GravityScene.tsx`
2. Define `variables`: a, b, c (computed), with proper colors, ranges, units
3. Define `lessonSteps` using the existing lesson flow (touch → see squares → try to break it → real-world)
4. Use the `TeachableEquation` wrapper with render prop for the visual
5. Make the triangle sides and squares draggable WITH the affordance pattern above
6. Show area values INSIDE the squares with big readable fonts (not raw `a^2` — use proper `a²` unicode)
7. Update `EquationVisualization.tsx` to use the new `PythagorasScene` instead of `PythagoreanTheoremExplorer`

### D. D3 Drag Enhancement for Complex Scenes

For scenes that use D3 scales and paths (curves, graphs), enhance the drag interaction:

**Calculus Scene**: The dot on the curve should have a visible trail/shadow as you drag it. Show the tangent line extending clearly. The slope value should appear as a large tooltip near the dot.

**Normal Distribution**: Dragging the peak of the bell curve should be intuitive — grab the top of the curve itself. Show μ and σ values as large labels ON the curve, not just in the formula.

**Fourier**: Each harmonic toggle should be a big, tactile button ON the visualization. The combined waveform should animate smoothly as harmonics are added/removed.

**Chaos Theory**: The bifurcation diagram slider (r) should be a large, visible track at the bottom of the SVG. The current r value should have a vertical line through the diagram.

**Black-Scholes**: The option price curve should have a draggable dot showing the current price point. Volatility should be adjustable by "spreading" the curve wider/narrower with a two-finger-like gesture or a clear handle.

### E. Cross-Highlighting Polish

The `highlightedVar` / `onHighlight` system already works. Make it more visible:

1. When hovering a variable in the formula → the corresponding visual element gets a pulsing colored ring
2. When hovering a visual element → the corresponding variable chip in the formula gets a glow background
3. Draw a subtle connecting line (bezier curve) between the formula variable and the visual element, lasting 1 second on first hover (teaches the connection, then fades)
4. Use the SAME colors consistently: `VAR_COLORS.primary` for the first variable, `VAR_COLORS.secondary` for the second, etc.

### F. Result Display Enhancement

The computed result (F in gravity, c in pythagoras, slope in calculus, etc.) should be:

1. **Large and prominent** — 22-26px, bold, in `VAR_COLORS.result` color
2. **Annotated ON the visual** — not just in the formula. The force arrow labeled "F = 0.39 N", the hypotenuse labeled "c = 5.0"
3. **Animated transitions** — when the value changes, use a counting/ticker animation (numbers roll up/down)
4. **Scale context** — for extreme values, show a tooltip: "That's about the weight of an apple" or "That's stronger than Earth's pull on you"

### G. Touch/Mobile Optimization

1. All drag targets must be minimum 44px tap target
2. For small elements (dots on curves), add an invisible larger hit area circle
3. Touch drag must use `touch-action: none` on the SVG
4. Test that pointer events work on iOS Safari (use `onPointerDown`, not `onMouseDown`)

## EXECUTION ORDER

Work through scenes in this order (most impactful first):

1. **PythagorasScene** — migrate to TeachableEquation, biggest visibility
2. **GravityScene** — already close, just needs font/affordance fixes
3. **CalculusScene** — high value, strong visual metaphor
4. **NormalDistributionScene** — already has peak dragging, needs polish
5. **WaveScene** — simple, quick win
6. **ChaosScene** — bifurcation diagram is iconic
7. **RelativityScene** — twin paradox is powerful
8. **ComplexScene** — Argand diagram rotation
9. **LogarithmScene** — earthquake bars
10. **FourierScene** — harmonic decomposition
11. **InformationScene** — entropy curve
12. **SchrodingerScene** — particle in box
13. **EntropyScene** — particle disorder
14. **EulerPolyhedraScene** — shape explorer
15. **MaxwellScene** — field lines + wave
16. **FluidScene** — particle flow
17. **BlackScholesScene** — option pricing

For EACH scene:
1. Read the current code
2. Fix all font sizes per the table above
3. Add drag affordances (glow ring, cursor, scale-up, hint)
4. Ensure `TeachableEquation` wrapping with proper variables and lessons
5. Verify cross-highlighting works
6. Run `npx tsc --noEmit` after each scene

## QUALITY CHECK

After upgrading each scene, verify:
- [ ] Can I see all labels clearly at normal zoom? (no squinting)
- [ ] Do I know what's draggable before I try? (visible hint/cursor)
- [ ] Does dragging feel responsive? (immediate visual feedback)
- [ ] Does the formula highlight when I hover the visual? (and vice versa)
- [ ] Is the computed result visible ON the visualization? (not just in formula)
- [ ] Does it work on a phone touchscreen? (44px targets, touch-action: none)
- [ ] Are fonts using Manrope consistently?
