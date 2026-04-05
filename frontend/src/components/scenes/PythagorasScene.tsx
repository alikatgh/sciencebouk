import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import { select, drag, type D3DragEvent } from "d3"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { getEquationConfig } from "../../data/equationConfig"

const FONT = "Manrope, sans-serif"

const eqConfig = getEquationConfig(1)

const variables: Variable[] = [
  { name: 'a', symbol: 'a', latex: 'a', value: 3, min: 1, max: 7, step: 0.5, color: VAR_COLORS.primary, description: 'Vertical side' },
  { name: 'b', symbol: 'b', latex: 'b', value: 4, min: 1, max: 7, step: 0.5, color: VAR_COLORS.secondary, description: 'Horizontal side' },
  { name: 'c', symbol: 'c', latex: 'c', value: 5, min: 0, max: 20, step: 0.01, color: VAR_COLORS.result, constant: true, description: 'Hypotenuse' },
]

const lessons: LessonStep[] = [
  {
    id: 'touch',
    instruction: "Grab the blue dot on side a and drag up to make it longer.",
    highlightElements: ['a'],
    unlockedVariables: ['a'],
    lockedVariables: ['b'],
    successCondition: { type: 'variable_changed', target: 'a' },
    celebration: 'subtle',
    insight: "The hypotenuse c grew too. And look at the squares — the blue one (a²) got bigger, and so did the red one (c²). They always balance.",
  },
  {
    id: 'squares',
    instruction: "Watch the squares. Blue area + amber area always equals red area. Drag both a and b to verify.",
    highlightElements: ['a', 'b'],
    unlockedVariables: ['a', 'b'],
    successCondition: { type: 'variable_changed', target: 'b' },
    celebration: 'subtle',
    insight: "a² + b² = c². Always. No matter what size the triangle is.",
  },
  {
    id: 'classic',
    instruction: "Set a = 3 and b = 4. What is c?",
    highlightElements: ['a', 'b'],
    unlockedVariables: ['a', 'b'],
    successCondition: { type: 'value_reached', target: 'a', value: 3, tolerance: 0.5 },
    celebration: 'big',
    insight: "c = 5. The famous 3-4-5 triangle. Builders have used this for 4,000 years to make perfect right angles.",
  },
]

export function PythagorasScene(): ReactElement {
  return (
    <TeachableEquation
      hook="You need to build a ramp. The step is 3 feet high, the base starts 4 feet away. How long is the ramp?"
      hookAction="Drag the sides of the triangle to see a² + b² always equals c²."
      formula="{a}² + {b}² = {c}²"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const c = Math.sqrt(v.a * v.a + v.b * v.b)
        return `{\\color{#3b82f6}${v.a.toFixed(1)}}^2 + {\\color{#f59e0b}${v.b.toFixed(1)}}^2 = {\\color{#ef4444}${c.toFixed(2)}}^2`
      }}
      buildResultLine={(v) => {
        const a2 = v.a * v.a, b2 = v.b * v.b
        return `${a2.toFixed(1)} + ${b2.toFixed(1)} = ${(a2 + b2).toFixed(1)} \\;\\checkmark`
      }}
      describeResult={(v) => {
        const c = Math.sqrt(v.a * v.a + v.b * v.b)
        if (c < 2) return "A very small triangle"
        if (c > 8) return "That's a long hypotenuse!"
        return `The ramp needs to be ${c.toFixed(1)} units long`
      }}
      presets={[
        { label: "3-4-5", values: { a: 3, b: 4 } },
        { label: "5-12-13", values: { a: 5, b: 12 } },
        { label: "Ladder", values: { a: 2, b: 6 } },
      ]}
      glossary={eqConfig?.glossary}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm }) => {
        const c = Math.sqrt(vars.a * vars.a + vars.b * vars.b)
        return (
          <D3Pythagoras
            a={vars.a} b={vars.b} c={c}
            highlightedTerm={highlightedTerm}
            onVarChange={setVar}
            highlightedVar={highlightedVar}
            onHighlight={setHighlightedVar}
          />
        )
      }}
    </TeachableEquation>
  )
}

interface Props {
  a: number; b: number; c: number
  highlightedTerm?: string | null
  onVarChange: (name: string, value: number) => void
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
}

/**
 * Compute the 4 corners of the c² square (rotated, attached to hypotenuse).
 * In a coordinate system where the right-angle is at origin,
 * side a goes UP (negative Y in SVG), side b goes RIGHT.
 *
 * Hypotenuse: from P2(0, -a) to P1(b, 0).
 * Direction along hyp: d = (b, a) (in SVG: right and down).
 * Perpendicular (outward, away from origin): n = (a/c, -b/c) in data, = (a, -b)/c.
 * In SVG coords (y flipped): the outward normal that points AWAY from origin is (a, -b)/c.
 * But wait — in SVG, P2 is above P1. The perpendicular pointing away from P0(0,0)
 * goes to the upper-right. Let me just verify with a = 3, b = 4, c = 5:
 *   P2 = (0, -3), P1 = (4, 0)
 *   Hyp direction = (4, 3), perp = (-3, 4) or (3, -4)
 *   Origin is at (0,0). Midpoint of hyp = (2, -1.5).
 *   (3, -4) from midpoint → (5, -5.5) — that's upper-right, AWAY from origin. ✓
 * So outward perpendicular unit vector = (a, -b) / c in SVG coords.
 * c² square side length = c (in data units).
 * Offset vector = c * (a/c, -b/c) = (a, -b).
 */
function cSquareCorners(
  p1: { x: number; y: number }, // end of side b
  p2: { x: number; y: number }, // end of side a (top)
  a: number, b: number, s: number,
) {
  // Offset in pixels: (a, -b) * s
  const dx = a * s
  const dy = -b * s
  return [
    p2,
    p1,
    { x: p1.x + dx, y: p1.y + dy },
    { x: p2.x + dx, y: p2.y + dy },
  ]
}

/**
 * Bounding box of all geometry in data-unit coords (origin at right-angle).
 * Returns scale and origin position to center everything in the given W×H.
 */
function computeLayout(a: number, b: number, W: number, H: number) {
  const c = Math.sqrt(a * a + b * b)
  const PAD = 20

  // All corners in data coords (right-angle at 0,0, a up, b right)
  // sq-a: from (-a, -a) to (0, 0)
  // sq-b: from (0, 0) to (b, b)
  // sq-c corners in data coords: apply (a, -b) offset to hyp endpoints
  const cSq = [
    { x: 0, y: -a },
    { x: b, y: 0 },
    { x: b + a, y: -b },
    { x: a, y: -a - b },
  ]

  const allX = [-a, 0, b, ...cSq.map(p => p.x)]
  const allY = [-a, 0, b, ...cSq.map(p => p.y)]

  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const minY = Math.min(...allY)
  const maxY = Math.max(...allY)

  const totalW = maxX - minX
  const totalH = maxY - minY

  const availW = W - PAD * 2
  const availH = H - PAD * 2

  const s = Math.min(availW / totalW, availH / totalH)

  // Right-angle corner position in SVG coords (centered)
  const ox = PAD + (availW - totalW * s) / 2 + (-minX) * s
  const oy = PAD + (availH - totalH * s) / 2 + (-minY) * s

  return { s, ox, oy, c }
}

function D3Pythagoras({ a, b, c, highlightedTerm, onVarChange, highlightedVar, onHighlight }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  const onHighlightRef = useRef(onHighlight)
  onVarChangeRef.current = onVarChange
  onHighlightRef.current = onHighlight

  // Measure + render
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const render = () => {
      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500

      select(el).select("svg").remove()

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .style("touch-action", "none")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")
      const { s, ox, oy } = computeLayout(a, b, W, H)

      // Triangle vertices
      const p0 = { x: ox, y: oy }
      const p1 = { x: ox + b * s, y: oy }
      const p2 = { x: ox, y: oy - a * s }

      // c² square
      const cSq = cSquareCorners(p1, p2, a, b, s)

      // Font sizes proportional to scene
      const fs = Math.max(12, Math.min(20, Math.min(W, H) / 30))

      // --- Draw squares (behind triangle) ---

      // Square a (blue, extends left)
      g.append("rect")
        .attr("x", p0.x - a * s).attr("y", p0.y - a * s)
        .attr("width", a * s).attr("height", a * s).attr("rx", 3)
        .attr("fill", VAR_COLORS.primary + "15").attr("stroke", VAR_COLORS.primary).attr("stroke-width", 1.5)
      g.append("text")
        .attr("x", p0.x - a * s / 2).attr("y", p0.y - a * s / 2)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("font-size", fs)
        .attr("fill", VAR_COLORS.primary).text(`a² = ${fmt(a * a)}`)

      // Square b (amber, extends down)
      g.append("rect")
        .attr("x", p0.x).attr("y", p0.y)
        .attr("width", b * s).attr("height", b * s).attr("rx", 3)
        .attr("fill", VAR_COLORS.secondary + "15").attr("stroke", VAR_COLORS.secondary).attr("stroke-width", 1.5)
      g.append("text")
        .attr("x", p0.x + b * s / 2).attr("y", p0.y + b * s / 2)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("font-size", fs)
        .attr("fill", VAR_COLORS.secondary).text(`b² = ${fmt(b * b)}`)

      // Square c (red, rotated along hypotenuse)
      g.append("polygon")
        .attr("points", cSq.map(p => `${p.x},${p.y}`).join(" "))
        .attr("fill", VAR_COLORS.result + "10").attr("stroke", VAR_COLORS.result).attr("stroke-width", 1.5)
      const cCenter = { x: avg(cSq, 'x'), y: avg(cSq, 'y') }
      g.append("text")
        .attr("x", cCenter.x).attr("y", cCenter.y)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("font-size", fs)
        .attr("fill", VAR_COLORS.result).text(`c² = ${fmt(c * c)}`)

      // --- Triangle (on top of squares) ---
      g.append("polygon")
        .attr("points", `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`)
        .attr("fill", "#f8fafc").attr("fill-opacity", 0.85)
        .attr("stroke", "#1e293b").attr("stroke-width", 2.5).attr("stroke-linejoin", "round")

      // Right-angle marker
      const ra = Math.min(14, s * 0.8)
      g.append("path")
        .attr("d", `M${p0.x + ra},${p0.y} L${p0.x + ra},${p0.y - ra} L${p0.x},${p0.y - ra}`)
        .attr("fill", "none").attr("stroke", "#94a3b8").attr("stroke-width", 1.5)

      // --- Side labels ---
      const lfs = Math.max(14, Math.min(20, fs * 1.1))

      // a label (left of vertical side, inside triangle)
      g.append("text")
        .attr("x", p0.x + 16).attr("y", (p0.y + p2.y) / 2)
        .attr("text-anchor", "start").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 800).attr("font-size", lfs)
        .attr("fill", VAR_COLORS.primary).text(`a = ${fmt(a)}`)

      // b label (above horizontal side)
      g.append("text")
        .attr("x", (p0.x + p1.x) / 2).attr("y", p0.y - 12)
        .attr("text-anchor", "middle").attr("dominant-baseline", "auto")
        .attr("font-family", FONT).attr("font-weight", 800).attr("font-size", lfs)
        .attr("fill", VAR_COLORS.secondary).text(`b = ${fmt(b)}`)

      // c label (on hypotenuse, offset outward)
      const cMidX = (p1.x + p2.x) / 2 + (a / c) * 18
      const cMidY = (p1.y + p2.y) / 2 - (b / c) * 18
      g.append("text")
        .attr("x", cMidX).attr("y", cMidY)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 800).attr("font-size", lfs)
        .attr("fill", VAR_COLORS.result).text(`c = ${c.toFixed(2)}`)

      // --- Drag handles ---

      // Handle a (at top of side a)
      const hA = g.append("g").style("cursor", "ns-resize")
      hA.append("circle").attr("cx", p2.x).attr("cy", p2.y).attr("r", 30).attr("fill", "transparent")
      hA.append("circle").attr("cx", p2.x).attr("cy", p2.y).attr("r", 8)
        .attr("fill", VAR_COLORS.primary).attr("stroke", "white").attr("stroke-width", 2.5)
      if (highlightedVar === 'a') {
        hA.append("circle").attr("cx", p2.x).attr("cy", p2.y).attr("r", 18)
          .attr("fill", "none").attr("stroke", VAR_COLORS.primary)
          .attr("stroke-width", 2).attr("stroke-dasharray", "5 3").attr("opacity", 0.6)
      }

      // Handle b (at end of side b)
      const hB = g.append("g").style("cursor", "ew-resize")
      hB.append("circle").attr("cx", p1.x).attr("cy", p1.y).attr("r", 30).attr("fill", "transparent")
      hB.append("circle").attr("cx", p1.x).attr("cy", p1.y).attr("r", 8)
        .attr("fill", VAR_COLORS.secondary).attr("stroke", "white").attr("stroke-width", 2.5)
      if (highlightedVar === 'b') {
        hB.append("circle").attr("cx", p1.x).attr("cy", p1.y).attr("r", 18)
          .attr("fill", "none").attr("stroke", VAR_COLORS.secondary)
          .attr("stroke-width", 2).attr("stroke-dasharray", "5 3").attr("opacity", 0.6)
      }

      // D3 drag behaviors
      const dragA = drag<SVGGElement, unknown>()
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newA = Math.max(1, Math.min(7, (oy - event.y) / s))
          onVarChangeRef.current('a', Math.round(newA * 2) / 2)
        })
      hA.call(dragA)

      const dragB = drag<SVGGElement, unknown>()
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newB = Math.max(1, Math.min(7, (event.x - ox) / s))
          onVarChangeRef.current('b', Math.round(newB * 2) / 2)
        })
      hB.call(dragB)

      // Hover cross-highlighting
      hA.on("mouseenter", () => onHighlightRef.current('a')).on("mouseleave", () => onHighlightRef.current(null))
      hB.on("mouseenter", () => onHighlightRef.current('b')).on("mouseleave", () => onHighlightRef.current(null))

      // Glossary term highlighting — glow the matching element
      const glowWidth = 4
      const glowColor = "#8b5cf6"
      if (highlightedTerm === "sq-c") {
        // Highlight hypotenuse / c-square
        g.select("polygon:nth-of-type(1)").attr("stroke-width", glowWidth).attr("stroke", VAR_COLORS.result)
      }
      if (highlightedTerm === "tri") {
        g.select("polygon:nth-of-type(2)").attr("stroke-width", glowWidth).attr("stroke", "#1e293b")
      }
      if (highlightedTerm === "all-squares") {
        g.selectAll("rect").attr("stroke-width", glowWidth)
        g.select("polygon:nth-of-type(1)").attr("stroke-width", glowWidth)
      }
      if (highlightedTerm === "right-angle") {
        g.select("path").attr("stroke-width", 3).attr("stroke", "#ef4444")
      }
    }

    render()

    const observer = new ResizeObserver(() => requestAnimationFrame(render))
    observer.observe(el)

    return () => { observer.disconnect(); select(el).select("svg").remove() }
  }, [a, b, c, highlightedVar, highlightedTerm])

  return (
    <div ref={containerRef} className="h-full w-full" />
  )
}

function fmt(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)
}

function avg(pts: { x: number; y: number }[], axis: 'x' | 'y'): number {
  return pts.reduce((sum, p) => sum + p[axis], 0) / pts.length
}
