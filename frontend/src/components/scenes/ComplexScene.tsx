import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const F = "Manrope, sans-serif"

const variables: Variable[] = [
  { name: 'a', symbol: 'a', latex: 'a', value: 1, min: -2.5, max: 2.5, step: 0.1, color: VAR_COLORS.primary, description: 'Real part Re(z)' },
  { name: 'b', symbol: 'b', latex: 'b', value: 0.5, min: -2.5, max: 2.5, step: 0.1, color: VAR_COLORS.secondary, description: 'Imaginary part Im(z)' },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'explore-real',
    instruction: lessonCopy["explore-real"].instruction,
    hint: lessonCopy["explore-real"].hint,
    highlightElements: ['a'],
    unlockedVariables: ['a'],
    lockedVariables: ['b'],
    successCondition: { type: 'variable_changed', target: 'a' },
    celebration: 'subtle',
    insight: lessonCopy["explore-real"].insight,
  },
  {
    id: 'explore-imaginary',
    instruction: lessonCopy["explore-imaginary"].instruction,
    hint: lessonCopy["explore-imaginary"].hint,
    highlightElements: ['b'],
    unlockedVariables: ['b'],
    lockedVariables: ['a'],
    successCondition: { type: 'variable_changed', target: 'b' },
    celebration: 'subtle',
    insight: lessonCopy["explore-imaginary"].insight,
  },
  {
    id: 'multiply-by-i',
    instruction: lessonCopy["multiply-by-i"].instruction,
    hint: lessonCopy["multiply-by-i"].hint,
    highlightElements: ['a', 'b'],
    unlockedVariables: ['a', 'b'],
    successCondition: { type: 'variable_changed', target: 'b' },
    celebration: 'big',
    insight: lessonCopy["multiply-by-i"].insight,
  },
  ]
}

export function ComplexScene(): ReactElement {
  const lessonCopy = useLessonCopy("complex")
  const lessons = buildLessons(lessonCopy)
  return (
    <TeachableEquation
      hook="Your phone screen can rotate 90 degrees. How does the software know where each pixel goes? It multiplies by i."
      hookAction="Tap 'Multiply by i' and watch every point rotate exactly 90 degrees."
      formula="{a} + {b}i"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const sign = v.b >= 0 ? '+' : '-'
        return `z = {\\color{#3b82f6}${v.a.toFixed(2)}} ${sign} {\\color{#f59e0b}${Math.abs(v.b).toFixed(2)}}\\,i`
      }}
      buildResultLine={(v) => {
        const mag = Math.sqrt(v.a * v.a + v.b * v.b)
        const angle = (Math.atan2(v.b, v.a) * 180) / Math.PI
        return `|z| = ${mag.toFixed(2)},\\; \\theta = ${angle.toFixed(1)}^\\circ`
      }}
      describeResult={(v) => {
        const mag = Math.sqrt(v.a * v.a + v.b * v.b)
        const angle = (Math.atan2(v.b, v.a) * 180) / Math.PI
        if (mag < 0.1) return "At the origin -- zero"
        if (Math.abs(v.b) < 0.05) return "On the real axis -- a regular number"
        if (Math.abs(v.a) < 0.05) return "On the imaginary axis -- pure imaginary"
        return `${angle.toFixed(0)} degrees from the real axis`
      }}
      presets={[
        { label: "Unit (1+0i)", values: { a: 1, b: 0 } },
        { label: "Pure imaginary (0+1i)", values: { a: 0, b: 1 } },
        { label: "45\u00B0 (1+1i)", values: { a: 1, b: 1 } },
      ]}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar }) => (
        <D3ComplexVisual
          a={vars.a}
          b={vars.b}
          onVarChange={setVar}
          highlightedVar={highlightedVar}
          onHighlight={setHighlightedVar}
        />
      )}
    </TeachableEquation>
  )
}

interface D3ComplexVisualProps {
  a: number
  b: number
  onVarChange: (name: string, value: number) => void
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
}

function formatComplex(re: number, im: number): string {
  const rStr = re.toFixed(2)
  const iAbs = Math.abs(im).toFixed(2)
  if (Math.abs(im) < 0.005) return `${rStr}`
  if (Math.abs(re) < 0.005) return im > 0 ? `${iAbs}i` : `-${iAbs}i`
  return im > 0 ? `${rStr} + ${iAbs}i` : `${rStr} - ${iAbs}i`
}

function D3ComplexVisual({ a, b, onVarChange, highlightedVar, onHighlight }: D3ComplexVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight

  // Live values during drag — bypasses React render cycle for 60fps SVG
  const liveRef = useRef({ a, b })
  const draggingRef = useRef(false)
  // Store the update function so external effects can call it
  const updateRef = useRef<((aVal: number, bVal: number) => void) | null>(null)

  // Sync React props -> SVG when not dragging (handles presets, lesson steps, button clicks)
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

    const aActive = highlightedVar === 'a'
    const bActive = highlightedVar === 'b'
    const pointActive = aActive || bActive

    svg.select(".point-glow").attr("opacity", pointActive ? 0.5 : 0)
    svg.select(".proj-a")
      .attr("stroke", aActive ? VAR_COLORS.primary : "#5a79ff")
      .attr("stroke-width", aActive ? 2.5 : 1.5)
    svg.select(".proj-b")
      .attr("stroke", bActive ? VAR_COLORS.secondary : "#57b59a")
      .attr("stroke-width", bActive ? 2.5 : 1.5)
  }, [highlightedVar])

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

      const isNarrow = W < 500
      const compact = W < 440 || H < 420
      const ultraCompact = W < 390 || H < 360
      const CX = isNarrow ? W * 0.5 : W * 0.42
      const CY = H * 0.5
      const RADIUS = Math.min(W, H) * (isNarrow ? 0.36 : 0.32)

      const xScale = scaleLinear().domain([-3, 3]).range([CX - RADIUS * 1.5, CX + RADIUS * 1.5])
      const yScale = scaleLinear().domain([-3, 3]).range([CY + RADIUS * 1.5, CY - RADIUS * 1.5])

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Complex plane visualization showing i squared equals negative one")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#f8fbff")

      const g = svg.append("g")

      // ── Static elements: grid, axes, unit circle ──

      // Grid lines
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue
        g.append("line").attr("x1", xScale(i)).attr("y1", yScale(-3)).attr("x2", xScale(i)).attr("y2", yScale(3))
          .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
        g.append("line").attr("x1", xScale(-3)).attr("y1", yScale(i)).attr("x2", xScale(3)).attr("y2", yScale(i))
          .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
        if (ultraCompact && Math.abs(i) !== 1 && Math.abs(i) !== 3) continue
        if (!ultraCompact && compact && Math.abs(i) === 2) continue
        g.append("text").attr("x", xScale(i)).attr("y", CY + 18).attr("text-anchor", "middle")
          .attr("font-size", 12).attr("fill", "#94a3b8").attr("font-family", F).text(String(i))
        g.append("text").attr("x", CX - 14).attr("y", yScale(i) + 4).attr("text-anchor", "end")
          .attr("font-size", 12).attr("fill", "#94a3b8").attr("font-family", F).text(ultraCompact ? String(i) : `${i}i`)
      }

      // Axes
      g.append("line").attr("x1", xScale(-3)).attr("y1", CY).attr("x2", xScale(3)).attr("y2", CY)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
      g.append("line").attr("x1", CX).attr("y1", yScale(-3)).attr("x2", CX).attr("y2", yScale(3))
        .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
      g.append("text").attr("x", xScale(3) - 8).attr("y", CY - 10)
        .attr("font-size", ultraCompact ? 14 : 17).attr("fill", "#64748b").attr("font-weight", 700).attr("font-family", F).text(ultraCompact ? "x" : "Re")
      g.append("text").attr("x", CX + 10).attr("y", yScale(3) + 14)
        .attr("font-size", ultraCompact ? 14 : 17).attr("fill", "#64748b").attr("font-weight", 700).attr("font-family", F).text(ultraCompact ? "y" : "Im")

      // Unit circle
      g.append("circle").attr("cx", CX).attr("cy", CY).attr("r", xScale(1) - CX)
        .attr("fill", "none").attr("stroke", "#dbeafe").attr("stroke-width", 2).attr("stroke-dasharray", "6 4")

      // ── Dynamic elements (positioned by updateGeometry) ──

      // Angle arc
      g.append("path").attr("class", "angle-arc")
        .attr("fill", "none").attr("stroke", "#f59e0b").attr("stroke-width", 2)

      // Angle text
      g.append("text").attr("class", "angle-text")
        .attr("font-size", 13).attr("fill", "#f59e0b").attr("font-weight", 600).attr("font-family", F).attr("text-anchor", "middle")

      // Vector line
      g.append("line").attr("class", "vector-line")
        .attr("stroke", "#5a79ff").attr("stroke-width", 4)

      // Dashed projection lines
      g.append("line").attr("class", "proj-a")
        .attr("stroke", "#5a79ff").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 4").attr("opacity", 0.5)
      g.append("line").attr("class", "proj-b")
        .attr("stroke", "#57b59a").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 4").attr("opacity", 0.5)

      // Glow ring for point
      g.append("circle").attr("class", "point-glow").attr("r", 20).attr("fill", "none")
        .attr("stroke", VAR_COLORS.primary).attr("stroke-width", 2.5).attr("stroke-dasharray", "6 4").attr("opacity", 0)

      // Draggable point group
      const ptG = g.append("g").attr("class", "point-group").style("cursor", "grab").style("touch-action", "none")
      ptG.append("circle").attr("class", "point-hit").attr("r", 44).attr("fill", "transparent")
      ptG.append("circle").attr("class", "point-dot").attr("r", 10)
        .attr("fill", "#5a79ff").attr("stroke", "white").attr("stroke-width", 3)

      // Point label
      g.append("text").attr("class", "point-label")
        .attr("font-size", ultraCompact ? 12 : compact ? 13 : 15).attr("fill", "#1e293b").attr("font-weight", 600).attr("font-family", F)

      // Info panel — hidden on narrow screens (redundant with live formula below)
      if (!isNarrow) {
        const infoX = W * 0.73
        const infoTxtX = infoX + 18
        g.append("rect").attr("x", infoX).attr("y", H * 0.07).attr("width", W * 0.24).attr("height", H * 0.41).attr("rx", 14)
          .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
        g.append("text").attr("x", infoTxtX).attr("y", H * 0.13)
          .attr("font-size", 17).attr("fill", "#1e293b").attr("font-weight", 700).attr("font-family", F)
          .text("Complex Number")

        g.append("text").attr("x", infoTxtX).attr("y", H * 0.19)
          .attr("font-size", 13).attr("fill", "#64748b").attr("font-family", F).attr("font-weight", 600).text("Rectangular:")
        g.append("text").attr("class", "info-rect").attr("x", infoTxtX).attr("y", H * 0.23)
          .attr("font-size", 15).attr("fill", "#1e293b").attr("font-weight", 600).attr("font-family", F)

        g.append("text").attr("x", infoTxtX).attr("y", H * 0.29)
          .attr("font-size", 13).attr("fill", "#64748b").attr("font-family", F).attr("font-weight", 600).text("Polar:")
        g.append("text").attr("class", "info-polar").attr("x", infoTxtX).attr("y", H * 0.33)
          .attr("font-size", 15).attr("fill", "#1e293b").attr("font-weight", 600).attr("font-family", F)

        g.append("text").attr("x", infoTxtX).attr("y", H * 0.39)
          .attr("font-size", 13).attr("fill", "#64748b").attr("font-family", F).attr("font-weight", 600).text("Magnitude:")
        g.append("text").attr("class", "info-mag").attr("x", infoTxtX).attr("y", H * 0.43)
          .attr("font-size", 15).attr("fill", "#1e293b").attr("font-weight", 600).attr("font-family", F)
      }

      // D3 action buttons inside SVG
      const btnLabels = ultraCompact ? ["\u00D7i", "-1", "z*", "\u21BA"] : compact ? ["\u00D7i", "-1", "Conj", "\u21BA"] : ["x i", "x (-1)", "Conj", "Reset"]
      const btnClasses = ["btn-mult-i", "btn-mult-neg", "btn-conj", "btn-reset"]
      const btnCharW = ultraCompact ? 5.8 : compact ? 6.5 : W < 380 ? 7 : 9
      const btnPad = ultraCompact ? 10 : compact ? 12 : W < 380 ? 14 : 20
      const btnGap = ultraCompact ? 4 : compact ? 5 : W < 380 ? 6 : 10
      const btnFontSize = ultraCompact ? 8 : compact ? 9 : W < 380 ? 10 : 12
      let bx = W * 0.015
      for (let i = 0; i < btnLabels.length; i++) {
        const bw = btnLabels[i].length * btnCharW + btnPad
        const bg = g.append("g").attr("class", btnClasses[i]).style("cursor", "pointer")
          .attr("transform", `translate(${bx}, ${H - 38})`)
        bg.append("rect").attr("width", bw).attr("height", 26).attr("rx", 13)
          .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
        bg.append("text").attr("x", bw / 2).attr("y", 17).attr("text-anchor", "middle")
          .attr("font-size", btnFontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#4f73ff")
          .text(btnLabels[i])
        bx += bw + btnGap
      }

      // ── updateGeometry: repositions everything from a,b WITHOUT React ──
      function updateGeometry(aVal: number, bVal: number) {
        const px = xScale(aVal)
        const py = yScale(bVal)
        const magnitude = Math.sqrt(aVal * aVal + bVal * bVal)
        const angle = Math.atan2(bVal, aVal)
        const angleDeg = (angle * 180) / Math.PI

        // Vector line
        g.select(".vector-line")
          .attr("x1", CX).attr("y1", CY).attr("x2", px).attr("y2", py)

        // Projection lines
        g.select(".proj-a")
          .attr("x1", px).attr("y1", py).attr("x2", px).attr("y2", CY)
        g.select(".proj-b")
          .attr("x1", px).attr("y1", py).attr("x2", CX).attr("y2", py)

        // Angle arc
        if (magnitude > 0.05) {
          const arcR = 32
          const startX = CX + arcR
          const startY = CY
          const endX = CX + arcR * Math.cos(-angle)
          const endY = CY + arcR * Math.sin(-angle)
          const largeArc = Math.abs(angleDeg) > 180 ? 1 : 0
          const sweep = angle >= 0 ? 0 : 1
          g.select(".angle-arc").attr("d", `M ${startX} ${startY} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${endX} ${endY}`)
          g.select(".angle-text")
            .attr("x", CX + 45 * Math.cos(-angle / 2))
            .attr("y", CY + 45 * Math.sin(-angle / 2) + 4)
            .text(ultraCompact ? "" : `${angleDeg.toFixed(0)}\u00B0`)
        } else {
          g.select(".angle-arc").attr("d", "")
          g.select(".angle-text").text("")
        }

        // Point
        g.select(".point-group").attr("transform", `translate(${px},${py})`)
        g.select(".point-glow").attr("cx", px).attr("cy", py)

        // Point label
        const pointLabel = ultraCompact ? formatComplex(aVal, bVal) : compact ? `${formatComplex(aVal, bVal)}` : `z = ${formatComplex(aVal, bVal)}`
        g.select(".point-label")
          .attr("text-anchor", compact ? "middle" : null)
          .attr("x", compact ? W / 2 : px + 16)
          .attr("y", compact ? (ultraCompact ? 28 : 34) : py - 16)
          .text(pointLabel)

        // Info panel — only exists when !isNarrow
        if (!isNarrow) {
          g.select(".info-rect").text(`z = ${formatComplex(aVal, bVal)}`)
          g.select(".info-polar").text(`|z| = ${magnitude.toFixed(3)}, \u03B8 = ${angleDeg.toFixed(1)}\u00B0`)
          g.select(".info-mag").text(`|z| = \u221A(${aVal.toFixed(2)}\u00B2 + ${bVal.toFixed(2)}\u00B2) = ${magnitude.toFixed(3)}`)
        }
      }

      // Expose for external sync
      updateRef.current = updateGeometry

      // Initial render
      updateGeometry(liveRef.current.a, liveRef.current.b)

      // ── D3 drag — updates SVG directly, syncs React only on end ──

      const dragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          g.select(".point-glow").attr("opacity", 0.5)
        })
        .on("drag", function (event: D3DragEvent<SVGGElement, unknown, unknown>) {
          const newA = Math.round(xScale.invert(event.x) * 10) / 10
          const newB = Math.round(yScale.invert(event.y) * 10) / 10
          const clampedA = Math.max(-2.5, Math.min(2.5, newA))
          const clampedB = Math.max(-2.5, Math.min(2.5, newB))
          liveRef.current.a = clampedA
          liveRef.current.b = clampedB
          updateGeometry(clampedA, clampedB)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          g.select(".point-glow").attr("opacity", 0)
          onVarChangeRef.current('a', liveRef.current.a)
          onVarChangeRef.current('b', liveRef.current.b)
        })

      ptG.call(dragBehavior)

      // Hover cross-highlighting
      ptG.on("pointerenter", () => onHighlightRef.current('a'))
        .on("pointerleave", () => onHighlightRef.current(null))

      // ── Button click handlers (use liveRef for current a/b) ──
      g.select(".btn-mult-i").on("click", () => {
        const curA = liveRef.current.a
        const curB = liveRef.current.b
        const newA = -curB
        const newB = curA
        liveRef.current = { a: newA, b: newB }
        updateGeometry(newA, newB)
        onVarChangeRef.current('a', newA)
        onVarChangeRef.current('b', newB)
      })
      g.select(".btn-mult-neg").on("click", () => {
        const newA = -liveRef.current.a
        const newB = -liveRef.current.b
        liveRef.current = { a: newA, b: newB }
        updateGeometry(newA, newB)
        onVarChangeRef.current('a', newA)
        onVarChangeRef.current('b', newB)
      })
      g.select(".btn-conj").on("click", () => {
        const newB = -liveRef.current.b
        liveRef.current.b = newB
        updateGeometry(liveRef.current.a, newB)
        onVarChangeRef.current('b', newB)
      })
      g.select(".btn-reset").on("click", () => {
        liveRef.current = { a: 1, b: 0.5 }
        updateGeometry(1, 0.5)
        onVarChangeRef.current('a', 1)
        onVarChangeRef.current('b', 0.5)
      })
    }

    buildSVG()

    let rebuildScheduled = false
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w !== currentW || h !== currentH) {
        if (!rebuildScheduled) {
          rebuildScheduled = true
          requestAnimationFrame(() => { rebuildScheduled = false; buildSVG() })
        }
      }
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      select(el).select("svg").remove()
      updateRef.current = null
    }
  }, []) // <- empty deps: SVG created once, rebuilt only on resize

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
