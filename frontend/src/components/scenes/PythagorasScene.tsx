import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import { select } from "d3-selection"
import { drag, type D3DragEvent } from "d3-drag"
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
 * Outward perpendicular unit vector = (a, -b) / c in SVG coords.
 */
function cSquareCorners(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  a: number, b: number, s: number,
) {
  const dx = a * s
  const dy = -b * s
  return [
    p2,
    p1,
    { x: p1.x + dx, y: p1.y + dy },
    { x: p2.x + dx, y: p2.y + dy },
  ]
}

function computeLayout(a: number, b: number, W: number, H: number) {
  const c = Math.sqrt(a * a + b * b)
  const PAD = 40 // more padding for labels

  // Bounding box in data coords (right-angle at origin, a up, b right)
  // sq-a extends left by a, sq-b extends down by b
  // sq-c extends upper-right: corners at (b+a, -b) and (a, -a-b)
  const cSq = [
    { x: 0, y: -a },
    { x: b, y: 0 },
    { x: b + a, y: -b },
    { x: a, y: -a - b },
  ]

  const allX = [-a, 0, b, ...cSq.map(p => p.x)]
  const allY = [-a, 0, b, ...cSq.map(p => p.y)]

  // Add extra margin for labels (labels extend ~30px beyond geometry)
  const labelMargin = 2 // data units extra

  const minX = Math.min(...allX) - labelMargin
  const maxX = Math.max(...allX) + labelMargin
  const minY = Math.min(...allY) - labelMargin
  const maxY = Math.max(...allY) + labelMargin

  const totalW = maxX - minX
  const totalH = maxY - minY

  const availW = W - PAD * 2
  const availH = H - PAD * 2

  const s = Math.min(availW / totalW, availH / totalH)

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

  // Live values during drag — bypasses React render cycle for 60fps SVG
  const liveRef = useRef({ a, b })
  const draggingRef = useRef(false)
  // Store the update function so external effects can call it
  const updateRef = useRef<((aVal: number, bVal: number) => void) | null>(null)

  // Sync React props → SVG when not dragging (handles presets, lesson steps)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = { a, b }
    updateRef.current?.(a, b)
  }, [a, b])

  // Highlight rings (lightweight attr toggle, no SVG rebuild)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const svg = select(el).select("svg")
    svg.select(".handle-a-ring").attr("opacity", highlightedVar === 'a' ? 0.6 : 0)
    svg.select(".handle-b-ring").attr("opacity", highlightedVar === 'b' ? 0.6 : 0)
  }, [highlightedVar])

  // Glossary term highlighting (lightweight attr toggle)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const g = select(el).select("svg g")
    // Reset
    g.select(".sq-a").attr("stroke-width", 1.5).attr("stroke", VAR_COLORS.primary)
    g.select(".sq-b").attr("stroke-width", 1.5).attr("stroke", VAR_COLORS.secondary)
    g.select(".sq-c").attr("stroke-width", 1.5).attr("stroke", VAR_COLORS.result)
    g.select(".tri").attr("stroke-width", 2.5).attr("stroke", "#1e293b")
    g.select(".right-angle").attr("stroke-width", 1.5).attr("stroke", "#94a3b8")

    if (highlightedTerm === "sq-c") g.select(".sq-c").attr("stroke-width", 4)
    if (highlightedTerm === "tri") g.select(".tri").attr("stroke-width", 4)
    if (highlightedTerm === "all-squares") {
      g.select(".sq-a").attr("stroke-width", 4)
      g.select(".sq-b").attr("stroke-width", 4)
      g.select(".sq-c").attr("stroke-width", 4)
    }
    if (highlightedTerm === "right-angle") g.select(".right-angle").attr("stroke-width", 3).attr("stroke", "#ef4444")
  }, [highlightedTerm])

  // ═══════════════════════════════════════════════════════════════
  // Main SVG — created ONCE, rebuilt only on container resize.
  // Drag updates go through updateGeometry() directly, not React.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let currentW = 0
    let currentH = 0

    function buildSVG() {
      if (!el) return
      select(el).select("svg").remove()

      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      currentW = W
      currentH = H

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .style("touch-action", "none")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")

      // ── Create all elements with classes (positions set by updateGeometry) ──

      // Squares (drawn behind triangle)
      g.append("rect").attr("class", "sq-a").attr("rx", 3)
        .attr("fill", VAR_COLORS.primary + "15").attr("stroke", VAR_COLORS.primary).attr("stroke-width", 1.5)
      g.append("text").attr("class", "sq-a-text")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("fill", VAR_COLORS.primary)

      g.append("rect").attr("class", "sq-b").attr("rx", 3)
        .attr("fill", VAR_COLORS.secondary + "15").attr("stroke", VAR_COLORS.secondary).attr("stroke-width", 1.5)
      g.append("text").attr("class", "sq-b-text")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("fill", VAR_COLORS.secondary)

      g.append("polygon").attr("class", "sq-c")
        .attr("fill", VAR_COLORS.result + "10").attr("stroke", VAR_COLORS.result).attr("stroke-width", 1.5)
      g.append("text").attr("class", "sq-c-text")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 700).attr("fill", VAR_COLORS.result)

      // Triangle (on top of squares)
      g.append("polygon").attr("class", "tri")
        .attr("fill", "#f8fafc").attr("fill-opacity", 0.85)
        .attr("stroke", "#1e293b").attr("stroke-width", 2.5).attr("stroke-linejoin", "round")

      // Right-angle marker
      g.append("path").attr("class", "right-angle")
        .attr("fill", "none").attr("stroke", "#94a3b8").attr("stroke-width", 1.5)

      // Side labels
      g.append("text").attr("class", "label-a")
        .attr("text-anchor", "start").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 800).attr("fill", VAR_COLORS.primary)
      g.append("text").attr("class", "label-b")
        .attr("text-anchor", "middle").attr("dominant-baseline", "auto")
        .attr("font-family", FONT).attr("font-weight", 800).attr("fill", VAR_COLORS.secondary)
      g.append("text").attr("class", "label-c")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-family", FONT).attr("font-weight", 800).attr("fill", VAR_COLORS.result)

      // Drag handles
      const hA = g.append("g").attr("class", "handle-a").style("cursor", "ns-resize")
      hA.append("circle").attr("class", "handle-a-hit").attr("r", 30).attr("fill", "transparent")
      hA.append("circle").attr("class", "handle-a-dot").attr("r", 8)
        .attr("fill", VAR_COLORS.primary).attr("stroke", "white").attr("stroke-width", 2.5)
      hA.append("circle").attr("class", "handle-a-ring").attr("r", 18)
        .attr("fill", "none").attr("stroke", VAR_COLORS.primary)
        .attr("stroke-width", 2).attr("stroke-dasharray", "5 3").attr("opacity", 0)

      const hB = g.append("g").attr("class", "handle-b").style("cursor", "ew-resize")
      hB.append("circle").attr("class", "handle-b-hit").attr("r", 30).attr("fill", "transparent")
      hB.append("circle").attr("class", "handle-b-dot").attr("r", 8)
        .attr("fill", VAR_COLORS.secondary).attr("stroke", "white").attr("stroke-width", 2.5)
      hB.append("circle").attr("class", "handle-b-ring").attr("r", 18)
        .attr("fill", "none").attr("stroke", VAR_COLORS.secondary)
        .attr("stroke-width", 2).attr("stroke-dasharray", "5 3").attr("opacity", 0)

      // ── updateGeometry: repositions everything from a,b WITHOUT React ──
      function updateGeometry(aVal: number, bVal: number) {
        const cVal = Math.sqrt(aVal * aVal + bVal * bVal)
        const { s, ox, oy } = computeLayout(aVal, bVal, W, H)

        const fs = Math.max(12, Math.min(20, Math.min(W, H) / 30))
        const lfs = Math.max(14, Math.min(20, fs * 1.1))

        const p0 = { x: ox, y: oy }
        const p1 = { x: ox + bVal * s, y: oy }
        const p2 = { x: ox, y: oy - aVal * s }
        const cSq = cSquareCorners(p1, p2, aVal, bVal, s)

        // Square a
        g.select(".sq-a")
          .attr("x", p0.x - aVal * s).attr("y", p0.y - aVal * s)
          .attr("width", aVal * s).attr("height", aVal * s)
        g.select(".sq-a-text")
          .attr("x", p0.x - aVal * s / 2).attr("y", p0.y - aVal * s / 2)
          .attr("font-size", fs).text(`a² = ${fmt(aVal * aVal)}`)

        // Square b
        g.select(".sq-b")
          .attr("x", p0.x).attr("y", p0.y)
          .attr("width", bVal * s).attr("height", bVal * s)
        g.select(".sq-b-text")
          .attr("x", p0.x + bVal * s / 2).attr("y", p0.y + bVal * s / 2)
          .attr("font-size", fs).text(`b² = ${fmt(bVal * bVal)}`)

        // Square c
        g.select(".sq-c")
          .attr("points", cSq.map(p => `${p.x},${p.y}`).join(" "))
        const cCenter = { x: avg(cSq, 'x'), y: avg(cSq, 'y') }
        g.select(".sq-c-text")
          .attr("x", cCenter.x).attr("y", cCenter.y)
          .attr("font-size", fs).text(`c² = ${fmt(cVal * cVal)}`)

        // Triangle
        g.select(".tri")
          .attr("points", `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`)

        // Right-angle marker
        const ra = Math.min(14, s * 0.8)
        g.select(".right-angle")
          .attr("d", `M${p0.x + ra},${p0.y} L${p0.x + ra},${p0.y - ra} L${p0.x},${p0.y - ra}`)

        // Side labels — positioned OUTSIDE the triangle, away from squares
        // a label: right of the vertical side, inside the triangle
        const aLabelOffset = Math.max(20, s * 0.8)
        g.select(".label-a")
          .attr("x", p0.x + aLabelOffset).attr("y", (p0.y + p2.y) / 2)
          .attr("text-anchor", "start")
          .attr("font-size", lfs).text(`a = ${fmt(aVal)}`)

        // b label: above the horizontal side, centered
        g.select(".label-b")
          .attr("x", (p0.x + p1.x) / 2).attr("y", p0.y - Math.max(14, s * 0.5))
          .attr("text-anchor", "middle")
          .attr("font-size", lfs).text(`b = ${fmt(bVal)}`)

        // c label: on the hypotenuse, offset INTO the triangle (away from c² square)
        const cNormX = -(aVal / cVal)  // normal pointing into triangle
        const cNormY = (bVal / cVal)
        const cOffset = Math.max(20, s * 0.8)
        const cMidX = (p1.x + p2.x) / 2 + cNormX * cOffset
        const cMidY = (p1.y + p2.y) / 2 + cNormY * cOffset
        g.select(".label-c")
          .attr("x", cMidX).attr("y", cMidY)
          .attr("text-anchor", "middle")
          .attr("font-size", lfs).text(`c = ${cVal.toFixed(1)}`)

        // Handle positions
        g.select(".handle-a-hit").attr("cx", p2.x).attr("cy", p2.y)
        g.select(".handle-a-dot").attr("cx", p2.x).attr("cy", p2.y)
        g.select(".handle-a-ring").attr("cx", p2.x).attr("cy", p2.y)

        g.select(".handle-b-hit").attr("cx", p1.x).attr("cy", p1.y)
        g.select(".handle-b-dot").attr("cx", p1.x).attr("cy", p1.y)
        g.select(".handle-b-ring").attr("cx", p1.x).attr("cy", p1.y)

        // Store layout for drag coordinate conversion
        layoutRef.s = s
        layoutRef.ox = ox
        layoutRef.oy = oy
      }

      // Layout ref for drag handlers (avoids closure stale data)
      const layoutRef = { s: 1, ox: 0, oy: 0 }

      // Expose for external sync
      updateRef.current = updateGeometry

      // Initial render
      updateGeometry(liveRef.current.a, liveRef.current.b)

      // ── D3 drag — updates SVG directly, syncs React only on end ──

      const dragA = drag<SVGGElement, unknown>()
        .on("start", () => { draggingRef.current = true })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newA = Math.max(1, Math.min(7, (layoutRef.oy - event.y) / layoutRef.s))
          const snapped = Math.round(newA * 2) / 2
          liveRef.current.a = snapped
          updateGeometry(snapped, liveRef.current.b)
        })
        .on("end", () => {
          draggingRef.current = false
          onVarChangeRef.current('a', liveRef.current.a)
        })
      hA.call(dragA)

      const dragB = drag<SVGGElement, unknown>()
        .on("start", () => { draggingRef.current = true })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newB = Math.max(1, Math.min(7, (event.x - layoutRef.ox) / layoutRef.s))
          const snapped = Math.round(newB * 2) / 2
          liveRef.current.b = snapped
          updateGeometry(liveRef.current.a, snapped)
        })
        .on("end", () => {
          draggingRef.current = false
          onVarChangeRef.current('b', liveRef.current.b)
        })
      hB.call(dragB)

      // Hover cross-highlighting
      hA.on("mouseenter", () => onHighlightRef.current('a'))
        .on("mouseleave", () => onHighlightRef.current(null))
      hB.on("mouseenter", () => onHighlightRef.current('b'))
        .on("mouseleave", () => onHighlightRef.current(null))
    }

    buildSVG()

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w !== currentW || h !== currentH) {
        requestAnimationFrame(buildSVG)
      }
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      select(el).select("svg").remove()
      updateRef.current = null
    }
  }, []) // ← empty deps: SVG created once, rebuilt only on resize

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
