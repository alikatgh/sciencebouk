---
name: make-it-teach
description: Transform every equation into a bidirectional touch-and-learn experience like Brilliant.org
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: opus
---

# THE MISSION

A person who skipped every math class must open this app and *understand* each equation by touching it. Not by reading. Not by watching. By DOING.

The core principle: **Formula ↔ Visual are ONE thing.** Touch the formula → visual changes. Touch the visual → formula changes. They are permanently, visibly, bidirectionally linked. The user must never wonder "what does this variable do?" because they can poke it and SEE.

Study how Brilliant.org, 3Blue1Brown, and Desmos work. They share one insight: **understanding comes from manipulation, not explanation.**

---

## ARCHITECTURE: The Interactive Formula System

### A. Touchable Formula Component (`TouchableFormula.tsx`)

Build a new core component that replaces static KaTeX rendering. Every variable in a formula becomes interactive:

```
Formula: F = G × (m₁ × m₂) / r²
                  ↑      ↑     ↑
              [drag]  [drag] [drag]
```

**How it works:**
- Parse the LaTeX formula and identify all variables
- Each variable renders as a KaTeX span BUT with:
  - **Drag up/down** to increase/decrease the value
  - **Color coding** that matches the corresponding visual element (m₁ is blue in formula AND blue circle in visual)
  - **Live value display** below or beside the variable showing current number
  - **Hover highlight** — hovering a variable in the formula highlights the corresponding element in the visualization, and vice versa
- When user drags a variable in the formula, the visualization updates in real-time
- When user drags something in the visualization, the formula variable updates in real-time
- The `=` sign pulses or glows briefly when both sides balance after a change

**Implementation approach:**
- Create a `TouchableFormula` component that accepts:
  - `formula: string` (LaTeX)
  - `variables: Variable[]` where `Variable = { name: string, symbol: string, value: number, min: number, max: number, step: number, color: string, unit?: string }`
  - `onVariableChange: (name: string, value: number) => void`
  - `highlightedVariable?: string` (for cross-highlighting with visual)
- Render KaTeX but wrap each variable span in an interactive container
- Use pointer events for drag (works on touch AND mouse)
- Show a subtle scrub indicator (↕ arrows or underline) on interactive variables
- On mobile: tap a variable to show a slider popover

### B. Bidirectional Sync Pattern

Every equation page must follow this pattern:

```typescript
// The single source of truth
const [vars, setVars] = useState<Record<string, number>>({
  m1: 2, m2: 10, r: 7.14
});

// Formula changes → visual updates (already natural with React)
// Visual changes → formula updates:
const handleVisualDrag = (varName: string, newValue: number) => {
  setVars(prev => ({ ...prev, [varName]: newValue }));
};

// Both the formula AND the visual read from `vars`
// Both the formula AND the visual can write to `setVars`
```

The visual and formula are not two separate things — they are two views of the same state.

### C. Color-Linked Variables

Every variable gets a consistent color across formula, visual, sliders, and labels:

```typescript
const VARIABLE_PALETTE = {
  primary:   '#3b82f6', // blue — first variable
  secondary: '#f59e0b', // amber — second variable  
  tertiary:  '#10b981', // emerald — third variable
  result:    '#ef4444', // red — the computed result
  constant:  '#6b7280', // gray — constants (G, π, e, etc.)
};
```

When `m₁` is blue in the formula, the m₁ circle in the visual is also blue. When you hover over blue in either place, both highlight. The user's brain never has to translate between "which thing in the formula is which thing in the picture."

---

## PHASE 1: The "Why Should I Care?" Layer

Before ANY math, each equation needs a **real-world hook** — a 1-2 sentence scenario that makes the user think "oh, I actually need this."

Create a `RealWorldContext` component that appears above each visualization:

### For each equation, write the hook:

1. **Pythagoras** — "You're building a ramp for wheelchair access. The wall is 3 feet high, you want the ramp to start 4 feet away. How long does the ramp need to be? Drag the wall height and distance to find out."

2. **Logarithms** — "An earthquake measures 7.0 on the Richter scale. Another measures 8.0. Is the second one 'a little bigger'? Drag the scale to see — it's actually 10× more powerful. That's what logarithms do."

3. **Calculus** — "You're driving and your GPS shows speed = 60 mph. But the speedometer is broken — you only have the odometer (distance). How do you figure out your speed from distance? Drag the time slider on the distance curve to see your speed appear as the slope."

4. **Gravity** — "Why do astronauts float in space? They don't — gravity is still pulling them. Drag the distance slider to Earth and see how the force barely changes at space station altitude. They float because they're falling sideways."

5. **Complex Numbers** — "Your phone screen can rotate 90°. How does the software know where each pixel goes? It multiplies by i. Tap the multiply-by-i button and watch every point rotate exactly 90°."

6. **Euler's Polyhedra** — "Count the vertices, edges, and faces of any 3D shape you can imagine. Vertices minus edges plus faces always equals 2. Always. Try to break it — tap different shapes."

7. **Normal Distribution** — "In a class of 1000 students, how many score above 90%? Drag the curve to see. This is why grading on a curve exists — and why 'average' isn't an insult."

8. **Fourier Transform** — "Every sound your phone plays is just a recipe of pure tones mixed together. Draw any sound wave, and watch it decompose into its ingredients. This is how MP3 compression works."

9. **Wave Equation** — "Pluck a guitar string. Why does it make a note instead of noise? Because only certain wave shapes can fit on the string. Drag the string length and watch which waves survive."

10. **Navier-Stokes** — "Why does smoke curl instead of going straight? Why do planes have that wing shape? Drag the obstacle shape and watch how air flows around it. This equation governs every fluid on Earth — and we still can't fully solve it."

11. **Maxwell's Equations** — "How does your WiFi signal get through walls? Drag a charge back and forth and watch: a wave of electric and magnetic fields launches out and travels at the speed of light. You just made a radio wave."

12. **Thermodynamics** — "Why can't you unscramble an egg? Click 'reverse time' on these bouncing particles and watch — technically possible, but the odds are 1 in a number with more digits than atoms in the universe."

13. **Relativity** — "GPS satellites move fast and sit in weaker gravity. Without Einstein's corrections, your GPS location would drift by 10 km per day. Drag the speed slider to see time itself slow down."

14. **Schrödinger** — "An electron isn't a tiny ball — it's a cloud of probability. Drag the box walls closer and watch: confine it more, and it gets MORE energetic. This is why atoms don't collapse."

15. **Information Theory** — "You're playing 20 questions. If the answer is almost certainly 'yes', the question was useless. The most informative question is the one you're most uncertain about. Drag the probability to see."

16. **Chaos Theory** — "Weather forecasts are useless past 10 days. Why? Drag the starting value by 0.001 and watch: the tiniest change leads to a completely different outcome. This is the butterfly effect."

17. **Black-Scholes** — "You can buy the RIGHT to purchase a stock at today's price, but in the future. How much is that right worth? It depends on how volatile the stock is. Drag volatility and watch the option price change."

**Rules for hooks:**
- No jargon. Zero. If a word requires a math class, replace it.
- Must be a scenario the person has encountered or can picture (phones, cars, GPS, music, cooking)
- Must end with an ACTION: "drag this", "tap that", "watch what happens"
- Max 3 sentences

---

## PHASE 2: Progressive Disclosure Lessons

Each equation gets a 3-5 step lesson that builds understanding from zero. Not a wall of text — a sequence of INTERACTIONS.

### Lesson Step Structure (`LessonStep`)

```typescript
interface LessonStep {
  id: string;
  instruction: string;          // 1 sentence: what to do
  hint?: string;                // Shown after 10 seconds of no action
  highlightElements: string[];  // Which UI elements to pulse/glow
  lockedVariables?: string[];   // Variables user CAN'T touch yet (revealed later)
  unlockedVariables: string[];  // Variables user CAN touch this step
  successCondition: {           // How to know they did it
    type: 'variable_changed' | 'value_reached' | 'clicked' | 'dragged';
    target: string;
    value?: number;
    tolerance?: number;
  };
  celebration: 'subtle' | 'medium' | 'big';  // How much to celebrate
  insight: string;              // The "aha!" text shown after completing the step
}
```

### Example: Pythagoras Lesson

**Step 1: Touch it**
- Instruction: "See the blue side of the triangle? Drag it to make it longer."
- Unlock: `a` (side a)
- Lock: `b` (side b)  
- Highlight: the blue side in the visual AND the blue `a` in the formula
- Success: user changed `a` at all
- Insight: "Notice how the hypotenuse (the long side) got longer too? It HAS to — the triangle got bigger."

**Step 2: See the squares**
- Instruction: "Now look at the colored squares on each side. Drag `a` again and watch the areas."
- Unlock: `a`
- Highlight: the area squares
- Success: user changed `a` to any value
- Insight: "The area of the big square ALWAYS equals the other two combined. That's a² + b² = c². It's not magic — it's geometry."

**Step 3: Try to break it**
- Instruction: "Now both sides are unlocked. Try to make a triangle where a² + b² does NOT equal c²."
- Unlock: `a`, `b`
- Success: user tries for 15 seconds (they can't break it)
- Insight: "You can't. It's impossible. That's what makes it a theorem — it's always true for any right triangle. This is why builders use 3-4-5 triangles to check if corners are square."

**Step 4: Real-world challenge**
- Instruction: "A 6-foot ladder leans against a wall. The base is 2 feet from the wall. How high does it reach? Set a=2 and c=6 to find b."
- Unlock: `a`, `c`
- Success: user sets a≈2, c≈6 and sees b≈5.66
- Celebration: big
- Insight: "5 feet 8 inches. You just used a 2,500-year-old theorem to solve a real problem. Builders, architects, and game developers use this hundreds of times a day."

### Lesson Design Rules

1. **Step 1 is ALWAYS just "touch something"** — zero cognitive load, pure exploration
2. **Never explain before they experience** — let them see it, THEN name it
3. **Lock variables** they don't need yet — progressive reveal prevents overwhelm
4. **Every step has exactly ONE action** — not "adjust a and b and observe c"
5. **Insights are conversational** — "Notice how..." not "The theorem states that..."
6. **Include a "try to break it" step** — builds conviction that the math is real
7. **End with a real-world challenge** — connects abstract to concrete
8. **Celebrate completion** — subtle glow for small steps, confetti or satisfying animation for finishing

---

## PHASE 3: Enhanced Visualization Interactivity

For EVERY equation, upgrade the visualization to support bidirectional manipulation:

### Required for each visualization:

1. **Drag handles on visual elements** — not just sliders below. The visual IS the control.
   - Gravity: drag the masses themselves (already done — good!)
   - Pythagoras: drag the triangle corners
   - Normal Distribution: drag the peak of the bell curve to change μ, drag the inflection point to change σ
   - Calculus: drag the point on the curve

2. **Formula ↔ Visual cross-highlighting**
   - Hover over `m₁` in formula → m₁ circle in visual pulses
   - Hover over m₁ circle in visual → `m₁` in formula highlights
   - This works for EVERY variable in EVERY equation

3. **Result annotation in the visual**
   - Don't just show the formula result in KaTeX
   - Annotate it ON the visual: the force arrow labeled "F = 0.39", the hypotenuse labeled "c = 5"
   - When the result changes, the annotation updates with a brief number-ticker animation

4. **Unit context**
   - Show real units where applicable: "meters", "newtons", "seconds"
   - Not abstract "F = 0.39" but "F = 0.39 newtons — about the weight of a small apple"
   - Include scale references for large/small numbers: "that's the weight of 3 blue whales"

5. **Extreme value exploration**
   - Let users push variables to extremes and see what happens
   - Gravity: make r very small → force explodes (this is why black holes are a thing)
   - Relativity: push v near c → gamma explodes (this is why you can't reach light speed)
   - Show a tooltip at extremes explaining the real-world implication

6. **Animation trails**
   - When dragging, leave a fading ghost trail showing previous positions
   - This helps users see the TRAJECTORY of change, not just the current state
   - Especially important for: wave equation, chaos theory, Fourier

7. **Comparison mode**
   - "Snapshot" button: freeze current state as a ghost overlay
   - Adjust variables, see new state alongside the snapshot
   - "How much did F change when I doubled the distance?"

---

## PHASE 4: Micro-interactions & Tactile Feel

The app must feel PHYSICAL. Every interaction should feel like touching a real object.

### Touch Feedback
- **Drag variables**: slight resistance at first (like breaking static friction), then smooth
- **Sliders**: snap to nice numbers with a subtle haptic-like CSS pulse
- **Formula variables**: gentle scale-up (1.0 → 1.1) on hover, color shift
- **Completion**: satisfying spring animation (Framer Motion `spring` transition)

### Visual Feedback
- **Active variable**: glowing halo around the element being dragged (both in formula and visual)
- **Causality arrow**: when dragging a variable, show a brief animated arrow/line from the cause (what you're touching) to the effect (what's changing). This teaches which variables affect which.
- **Value tooltip**: floating near the cursor during drag, showing the current value updating in real-time
- **Balance indicator**: for equations, show a subtle scale/balance metaphor. When both sides are equal, it's level. During transition, it tips slightly.

### Transitions
- **Number changes**: use counting/ticker animation (like an odometer), not instant jumps
- **Shape changes**: smooth interpolation via D3 transitions or Framer Motion
- **Color changes**: gradual hue shifts when values cross thresholds (e.g., force goes from blue (weak) to red (strong))
- **Entry animations**: when switching equations, new visualization assembles itself piece by piece (not instant pop-in)

### Sound (optional but powerful)
- Subtle tick sound when snapping to values
- Rising/falling tone as values increase/decrease
- Satisfying "ding" on lesson step completion
- All sounds off by default, togglable. Use Web Audio API for synthesis (no audio files needed)

---

## PHASE 5: "I Get It!" Moments

Design specific moments where the user's understanding clicks. These are the payoffs.

### For each equation, design ONE "aha moment":

1. **Pythagoras**: The area squares rearrangement animation — watch the four triangles rearrange to prove a² + b² = c² visually. No numbers needed.
2. **Logarithms**: Stack earthquakes — show magnitude 5, 6, 7, 8 as physical stacked bars. The jump from 7→8 is BIGGER THAN ALL PREVIOUS COMBINED.
3. **Calculus**: The speedometer — show a car's distance graph, user drags time, a speedometer needle shows the derivative as speed. Suddenly derivatives aren't abstract.
4. **Gravity**: Astronaut orbit — show why ISS astronauts float. They're falling, but the Earth curves away. The "weightlessness" is free-fall. Mind = blown.
5. **Complex Numbers**: Rotation sequence — multiply by i four times: point goes 90° → 180° → 270° → back to start. i⁴ = 1. Complex numbers are rotations!
6. **Euler's Polyhedra**: Try to build a shape where V-E+F ≠ 2. They can't. (Unless they add a hole — show torus where V-E+F = 0.)
7. **Normal Distribution**: Central limit theorem demo — roll 1 die: flat distribution. Roll 2 and average: triangular. Roll 10: nearly perfect bell curve. Nature creates this shape automatically.
8. **Fourier**: Build a square wave from sine waves. Add harmonics one by one and watch the jagged edges emerge. "This is how a synthesizer makes sounds."
9. **Wave Equation**: Harmonics on a string — show why only specific frequencies resonate. "This is why a guitar has frets at those specific positions."
10. **Navier-Stokes**: Laminar vs turbulent — slow flow is smooth, fast flow is chaotic. There's a precise threshold (Reynolds number). "This is why you can pour honey but not squirt water straight."
11. **Maxwell's**: Shake a charge and watch a wave propagate at c. "You just made light. This is literally how radio, WiFi, and light work."
12. **Thermodynamics**: The "unbreak the egg" — run particles forward (disorder increases). Reverse time — technically possible but you'd need to wait longer than the age of the universe.
13. **Relativity**: The twin paradox — send one twin at 0.9c for 10 years. When they return, the traveling twin aged 4.4 years. Their sibling aged 10. Drag the speed to see.
14. **Schrödinger**: Squeeze the box — particle energy INCREASES. "This is quantum confinement. This is why transistors get weird when they get small. This is why Moore's law is ending."
15. **Information Theory**: Optimal 20 questions — show how binary search always finds the answer in log₂(n) questions. "This is why computers use binary."
16. **Chaos**: Two dots starting 0.001 apart — watch them diverge completely in 20 iterations. "This is why weather can't be predicted past 10 days."
17. **Black-Scholes**: Show that the formula was used to price real options — and when traders ignored its assumptions in 2008, it contributed to the financial crisis.

---

## IMPLEMENTATION PRIORITIES

### Build these FIRST (they affect everything):

1. **`TouchableFormula` component** — the core innovation. Every equation uses it.
2. **Bidirectional state sync pattern** — establish the `vars` state pattern that all equations share.
3. **Color-linked variable system** — the palette and cross-highlighting logic.
4. **`RealWorldContext` component** — hooks for all 17 equations.
5. **`LessonStep` system** — framework, then populate per equation.

### Then upgrade each equation (in order of impact):

Priority 1 (most intuitive for beginners):
- Pythagoras (geometry is visual by nature)
- Gravity (everyone understands "things fall")
- Normal Distribution (grades, everyone relates)

Priority 2 (strong visual metaphors):
- Calculus (speedometer metaphor)
- Wave Equation (guitar string)
- Fourier (sound decomposition)

Priority 3 (mind-bending but accessible):
- Relativity (GPS, twins)
- Chaos Theory (butterfly effect)
- Information Theory (20 questions)

Priority 4 (harder concepts, need great scaffolding):
- Complex Numbers, Euler Polyhedra, Logarithms
- Navier-Stokes, Maxwell's, Thermodynamics
- Schrödinger, Black-Scholes

### Quality bar for each equation:

- [ ] Real-world hook (no jargon, ends with action)
- [ ] Touchable formula with color-linked variables
- [ ] Bidirectional: drag visual ↔ formula updates
- [ ] 3-5 step progressive lesson
- [ ] One designed "aha moment"
- [ ] Cross-highlighting between formula and visual
- [ ] Works on mobile (touch drag, slider fallbacks)
- [ ] Result annotated ON the visual with units
- [ ] Extreme values explored with tooltips
- [ ] Entry animation when switching to this equation

---

## NON-NEGOTIABLE RULES

1. **If a user has to READ to understand, you failed.** The interaction teaches. Text only names what they already experienced.
2. **If the formula and visual can diverge, you failed.** They are always in sync. Always.
3. **If a variable is in the formula but can't be touched, you failed.** (Constants like G, π, e are fine — but label them as "constant" on hover.)
4. **If the user asks "why should I care?", you failed.** The real-world hook must make them care before any math appears.
5. **If a lesson step requires knowledge from a previous class, you failed.** Each equation is self-contained.
6. **If it doesn't work on a phone with fat fingers, you failed.** Touch targets minimum 44px. Slider fallbacks for precision.
7. **Zero math jargon in user-facing text.** "Slope" → "steepness". "Derivative" → "rate of change" or "speed". "Integral" → "total accumulated". Jargon can appear in parentheses AFTER the plain explanation.

---

## EXECUTION

Work equation by equation, completing ALL layers (hook + touchable formula + bidirectional visual + lesson + aha moment) for each equation before moving to the next. A fully finished Pythagoras is infinitely more valuable than 17 half-built equations.

Use the `math-verifier` agent after each equation to validate accuracy.
Use the `frontend-specialist` agent for complex D3/Konva visualizations.
Use the `accessibility-auditor` agent after every 3 equations.

After each equation is complete, check:
- Can a 14-year-old who skipped math class use this and understand the equation?
- Does touching the formula change the visual?
- Does touching the visual change the formula?
- Is there a moment where they go "ohhhh, THAT'S what this means"?

If any answer is no, it's not done yet.
