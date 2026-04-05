---
name: live-formula
description: Make every formula show real numbers alongside letters so users instantly see what's happening
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# LIVE FORMULA: Kill the Abstraction Barrier

## THE PROBLEM

Users see `a² + b² = c²` and their brain shuts off. Letters are abstract. They don't know what a, b, c ARE, what the formula DOES, or why they should care.

The sliders on the right panel change values, but the formula in the header NEVER changes — it always shows the same static letters. There's a total disconnect between "drag the slider" and "understand the equation."

## THE SOLUTION: Live Substitution Formula

Every formula must have TWO views that the user can toggle between or see simultaneously:

### View 1: The Formula with Letters (what it looks like in a textbook)
```
a² + b² = c²
```

### View 2: The Formula with NUMBERS (what it actually means right now)
```
3² + 4² = 5²
9 + 16 = 25 ✓
```

When the user drags a slider, View 2 updates in real-time. The numbers change. The user SEES the equation working with real values. The "aha" moment is: "oh, THAT'S what a² means — it means 3 times 3 = 9."

## IMPLEMENTATION

### 1. Add a `LiveFormula` component

Create `frontend/src/components/teaching/LiveFormula.tsx`:

This component renders the equation WITH current values substituted in. It uses KaTeX for proper math rendering.

```tsx
interface LiveFormulaProps {
  // Each equation defines how to render its live version
  letterFormula: string           // KaTeX: "a^2 + b^2 = c^2"
  buildLiveFormula: (vars: Record<string, number>) => string  // returns KaTeX with numbers
  buildResultLine?: (vars: Record<string, number>) => string  // optional "= 25 ✓" line
  vars: Record<string, number>
  variables: Variable[]           // for color-coding
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
}
```

Example for Pythagoras:
```tsx
buildLiveFormula: (vars) => {
  const a2 = (vars.a * vars.a).toFixed(0)
  const b2 = (vars.b * vars.b).toFixed(0)
  const c = Math.sqrt(vars.a * vars.a + vars.b * vars.b)
  const c2 = (c * c).toFixed(1)
  return `{\\color{#3b82f6}${vars.a.toFixed(1)}}^2 + {\\color{#f59e0b}${vars.b.toFixed(1)}}^2 = {\\color{#ef4444}${c.toFixed(2)}}^2`
}
buildResultLine: (vars) => {
  const a2 = vars.a * vars.a
  const b2 = vars.b * vars.b
  return `${a2.toFixed(0)} + ${b2.toFixed(0)} = ${(a2 + b2).toFixed(1)}`
}
```

Example for Gravity:
```tsx
buildLiveFormula: (vars) => {
  const F = (vars.m1 * vars.m2) / (vars.r * vars.r)
  return `{\\color{#ef4444}${F.toFixed(2)}} = G \\times \\frac{{\\color{#3b82f6}${vars.m1.toFixed(1)}} \\times {\\color{#f59e0b}${vars.m2.toFixed(1)}}}{{\\color{#10b981}${vars.r.toFixed(1)}}^2}`
}
buildResultLine: (vars) => {
  const F = (vars.m1 * vars.m2) / (vars.r * vars.r)
  return `F = ${vars.m1.toFixed(1)} × ${vars.m2.toFixed(1)} / ${vars.r.toFixed(1)}² = ${F.toFixed(2)} N`
}
```

### 2. Rendering

The `LiveFormula` component renders:

```
┌──────────────────────────────────────────────┐
│  a² + b² = c²          ← letter formula      │ (gray, smaller)
│  3² + 4² = 5²          ← live numbers         │ (colored, BIGGER)  
│  9 + 16 = 25 ✓         ← computed result      │ (bold, prominent)
└──────────────────────────────────────────────┘
```

- The letter formula is shown smaller and grayed out (reference)
- The live number formula is the MAIN display — big, colored to match variables
- Each number is colored to match its variable's color in the slider panel
- When a variable changes, the number does a brief scale-up animation (1.0 → 1.1 → 1.0)
- The result line shows the final computation with a ✓ or ✗

### 3. Color-coded numbers

This is crucial. When the slider for `a` is blue, the number `3` in the formula must ALSO be blue. The user's eye follows the color:

```
  a         slider [====●====]  3.0        ← blue
  ↓                                        
  3² + 4² = 5²                             ← the "3" is also blue
```

Use KaTeX color commands: `{\color{#3b82f6}3}^2`

### 4. Where to place it

The `LiveFormula` goes in the RIGHT panel of `TeachableEquation`, ABOVE the variable sliders:

```
┌─────────────────────────┐
│ RIGHT PANEL             │
│                         │
│ ┌─────────────────────┐ │
│ │ a² + b² = c²   (ref)│ │   ← letter formula (small, gray)
│ │ 3² + 4² = 5²        │ │   ← live formula (big, colored)
│ │ 9 + 16 = 25 ✓       │ │   ← result (bold)
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ a  [====●====] 3.0  │ │   ← slider (blue)
│ │ b  [====●====] 4.0  │ │   ← slider (amber)
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Lesson / Free toggle│ │
│ │ Step 1 of 3...      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 💡 Real-world hook  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### 5. Update TeachableEquation props

Each scene must now provide:
- `letterFormula: string` — the KaTeX formula with letters (already exists as `formula`)
- `buildLiveFormula: (vars) => string` — returns KaTeX with current numbers substituted
- `buildResultLine?: (vars) => string` — optional result computation string

### 6. Update every scene

For each of the 17 scenes, add `buildLiveFormula` and `buildResultLine`:

**Pythagoras**: `3² + 4² = 5²` → `9 + 16 = 25 ✓`

**Gravity**: `F = G × 3.0 × 7.0 / 5.0²` → `F = 0.84 N`

**Calculus**: `slope = lim (f(3.1) - f(3.0)) / 0.1` → `slope = -0.16`

**Normal Distribution**: `Φ(2.0) = (1/√(2π·1.5)) × e^(-(2.0-3.0)²/(2·1.5²))` → `Φ = 0.21`

**Logarithms**: `log(81 × 83) = log(81) + log(83)` → `3.83 = 1.91 + 1.92 ✓`

**Wave Equation**: Show wavelength, frequency, amplitude as actual numbers

**Relativity**: `E = 5.0 × (3×10⁸)²` → `E = 4.5 × 10¹⁷ joules — that's a nuclear bomb`

**Each equation** — every variable replaced with its current value, color-coded.

### 7. Real-world unit annotations

Below the result line, add a brief human-scale reference:

```
F = 0.84 N
↳ about the weight of a small apple
```

```
E = 4.5 × 10¹⁷ J
↳ enough energy to power a city for a year
```

```
slope = -0.16
↳ the curve is going slightly downhill here
```

Define these as a function per equation:
```tsx
describeResult?: (vars: Record<string, number>) => string
```

Examples:
- Gravity: F < 0.1 → "barely any pull", F ~ 1 → "like holding an apple", F > 10 → "black-hole territory"
- Normal Distribution: show what % of data falls in the shaded region
- Relativity: compare the energy to everyday objects

### 8. Scenario Presets

Add preset buttons below the sliders — one click loads a real-world scenario:

```tsx
interface Preset {
  label: string
  values: Record<string, number>
  description: string
}
```

**Pythagoras presets:**
- "3-4-5 triangle" → a=3, b=4
- "TV diagonal" → a=36, b=48 (inches) — "Your 60-inch TV"
- "Ladder against wall" → a=2, b=6 — "How high does it reach?"

**Gravity presets:**
- "Earth + apple" → m1=6e24, m2=0.1, r=6.4e6 (scaled)
- "Earth + Moon" → different values
- "Two bowling balls" → m1=7, m2=7, r=0.3

**Calculus presets:**
- "Hill at t=2" → t=2 (slope positive, going up)
- "Valley at t=5" → t=5 (slope zero, flat)
- "Steep descent at t=4" → t=4 (slope negative)

**Relativity presets:**
- "Walking speed" → v=1.4 m/s (γ ≈ 1.000000000)
- "Airplane" → v=250 m/s (γ ≈ 1.0000000003)
- "GPS satellite" → v=3900 m/s (GPS would be 10km off without correction!)
- "90% light speed" → v=0.9c (γ = 2.29, time halves)

Render as small pill buttons:
```
[3-4-5 triangle]  [TV diagonal]  [Ladder problem]
```

Clicking a preset animates the sliders to the new values (D3 transition or requestAnimationFrame).

### 9. Number Input Fields

Make each slider's value ALSO a clickable text field. User can:
- Drag the slider (coarse control)
- Click the number and type an exact value (precision)

```
a  [====●====]  3.0    ← click "3.0" to type any number
```

This lets users test specific scenarios: "what if a = 17.5?"

Implementation: when user clicks the value label, swap it for a tiny `<input type="number">`. On blur or Enter, apply the value and swap back to text.

## EXECUTION ORDER

1. Build `LiveFormula` component
2. Integrate into `TeachableEquation` right panel (above sliders)
3. Add `buildLiveFormula` + `buildResultLine` to Pythagoras scene first
4. Add `describeResult` to Pythagoras
5. Add presets to Pythagoras
6. Add number input fields to `TouchableFormula` slider rows
7. Verify Pythagoras is complete and intuitive
8. Repeat for all 16 remaining scenes

## THE TEST

Show the app to someone who failed algebra. If they can:
1. See `3² + 4² = 5²` and say "oh, 9 + 16 = 25"
2. Drag a slider and watch the numbers change
3. Click "Ladder problem" and solve it without help
4. Explain in their own words what the formula does

Then it works. If at any point they say "what does a mean?" — we failed.
