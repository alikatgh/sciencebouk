import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import "d3-transition"
import { range } from "d3-array"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { curveMonotoneX, line } from "d3-shape"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { getLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const F = "Manrope, sans-serif"

const BASE = 10

const variables: Variable[] = [
  { name: 'x', symbol: 'x', latex: 'x', value: 20, min: 1, max: 100, step: 1, color: VAR_COLORS.primary, description: 'First number' },
  { name: 'y', symbol: 'y', latex: 'y', value: 5, min: 1, max: 100, step: 1, color: VAR_COLORS.secondary, description: 'Second number' },
]

const lessonCopy = getLessonCopy("logarithm")

const lessons: LessonStep[] = [
  {
    id: 'drag-x',
    instruction: lessonCopy["drag-x"].instruction,
    hint: lessonCopy["drag-x"].hint,
    highlightElements: ['x'],
    unlockedVariables: ['x'],
    lockedVariables: ['y'],
    successCondition: { type: 'variable_changed', target: 'x' },
    celebration: 'subtle',
    insight: lessonCopy["drag-x"].insight,
  },
  {
    id: 'product-rule',
    instruction: lessonCopy["product-rule"].instruction,
    hint: lessonCopy["product-rule"].hint,
    highlightElements: ['x', 'y'],
    unlockedVariables: ['x', 'y'],
    successCondition: { type: 'variable_changed', target: 'y' },
    celebration: 'subtle',
    insight: lessonCopy["product-rule"].insight,
  },
  {
    id: 'earthquake',
    instruction: lessonCopy.earthquake.instruction,
    hint: lessonCopy.earthquake.hint,
    highlightElements: ['x', 'y'],
    unlockedVariables: ['x', 'y'],
    successCondition: { type: 'value_reached', target: 'x', value: 10, tolerance: 2 },
    celebration: 'big',
    insight: lessonCopy.earthquake.insight,
  },
]

export function LogarithmScene(): ReactElement {
  return (
    <TeachableEquation
      hook="An earthquake measures 7.0 on the Richter scale. Another measures 8.0. Is it 'a little bigger'? It's 10x more powerful. That's logarithms."
      hookAction="Drag x and y to see how log turns multiplication into addition."
      formula="\\log({x} \\cdot {y}) = \\log {x} + \\log {y}"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        return `\\log({\\color{#3b82f6}${v.x}} \\times {\\color{#f59e0b}${v.y}}) = \\log({\\color{#3b82f6}${v.x}}) + \\log({\\color{#f59e0b}${v.y}})`
      }}
      buildResultLine={(v) => {
        const logX = Math.log(v.x) / Math.log(BASE)
        const logY = Math.log(v.y) / Math.log(BASE)
        const logXY = Math.log(v.x * v.y) / Math.log(BASE)
        return `${logX.toFixed(3)} + ${logY.toFixed(3)} = ${logXY.toFixed(3)} \\;\\checkmark`
      }}
      describeResult={(v) => {
        const product = v.x * v.y
        if (product >= 1000) return "Huge product -- but the log is only " + (Math.log(product) / Math.log(BASE)).toFixed(1)
        if (product <= 2) return "Tiny product -- log is near zero"
        return "log(" + product + ") = " + (Math.log(product) / Math.log(BASE)).toFixed(3)
      }}
      presets={[
        { label: "10 \u00D7 10", values: { x: 10, y: 10 } },
        { label: "2 \u00D7 50", values: { x: 2, y: 50 } },
        { label: "100 \u00D7 100", values: { x: 100, y: 100 } },
      ]}
    >
      {({ vars, setVar }) => (
        <D3LogarithmVisual
          xVal={vars.x}
          yVal={vars.y}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface D3LogarithmVisualProps {
  xVal: number
  yVal: number
  onVarChange: (name: string, value: number) => void
}

function D3LogarithmVisual({ xVal, yVal, onVarChange }: D3LogarithmVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  // Live values during drag -- bypasses React render cycle for 60fps SVG
  const liveRef = useRef({ x: xVal, y: yVal })
  const draggingRef = useRef(false)
  // Store the update function so external effects can call it
  const updateRef = useRef<((x: number, y: number) => void) | null>(null)

  // Sync React props -> SVG when not dragging (handles presets, lesson steps)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = { x: xVal, y: yVal }
    updateRef.current?.(xVal, yVal)
  }, [xVal, yVal])

  // ═══════════════════════════════════════════════════════════════
  // Main SVG -- created ONCE, rebuilt only on container resize.
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
      const compact = W < 480 || H < 420
      const ultraCompact = W < 390 || H < 360
      if (H < 100) return
      currentW = W
      currentH = H

      // Font sizes -- proportional to container
      const fontSize = Math.max(12, Math.min(18, H / 28))
      const fontSizeSm = Math.max(10, Math.min(15, H / 32))
      const fontSizeLg = Math.max(16, Math.min(28, H / 18))

      // Bar layout -- proportional to container
      const barX0 = W * 0.06
      const barMaxW = W * 0.38
      const barH = Math.max(20, H * 0.07)
      const barY1 = H * 0.14
      const barY2 = H * 0.3
      const barY3 = H * 0.46
      const maxLog = Math.log(10000) / Math.log(BASE)
      const barScale = scaleLinear().domain([0, maxLog]).range([0, barMaxW])

      // Curve layout -- right half
      const curveLeft = W * 0.52
      const curveRight = W * 0.95
      const curveTop = H * 0.12
      const curveBottom = H * 0.6
      const cxScale = scaleLinear().domain([0.5, 100]).range([curveLeft, curveRight])
      const cyScale = scaleLinear().domain([-0.5, 2.5]).range([curveBottom, curveTop])

      // Value scale for bar drag handles
      const xValueScale = scaleLinear().domain([1, 100]).range([barX0, barX0 + barMaxW])
      const yValueScale = scaleLinear().domain([1, 100]).range([barX0, barX0 + barMaxW])

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Logarithm product rule: bar chart and curve")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")

      // --- Bar section ---

      // log(x) label + bar
      g.append("text").attr("class", "logx-label")
        .attr("x", barX0).attr("y", barY1 - 8)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#2f5bd1")

      g.append("rect").attr("class", "logx-bar")
        .attr("x", barX0).attr("y", barY1).attr("height", barH).attr("rx", 6)
        .attr("fill", "#6585ff")

      // Plus sign
      g.append("text")
        .attr("x", W * 0.03).attr("y", barY2 + H * 0.05)
        .attr("font-size", fontSizeLg).attr("font-weight", 700).attr("font-family", F).attr("fill", "#94a3b8")
        .text("+")

      // log(y) label + bar
      g.append("text").attr("class", "logy-label")
        .attr("x", barX0).attr("y", barY2 - 8)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#157a63")

      g.append("rect").attr("class", "logy-bar")
        .attr("x", barX0).attr("y", barY2).attr("height", barH).attr("rx", 6)
        .attr("fill", "#57b59a")

      // Equals sign
      g.append("text")
        .attr("x", W * 0.03).attr("y", barY3 + H * 0.047)
        .attr("font-size", fontSizeLg).attr("font-weight", 700).attr("font-family", F).attr("fill", "#94a3b8")
        .text("=")

      // log(xy) label + bar
      g.append("text").attr("class", "logxy-label")
        .attr("x", barX0).attr("y", barY3 - 8)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#9a5c0e")

      g.append("rect").attr("class", "logxy-bar")
        .attr("x", barX0).attr("y", barY3).attr("height", barH).attr("rx", 6)
        .attr("fill", "#f5b942")

      // Draggable handle on logx bar
      const xDragHandle = g.append("g").attr("class", "x-drag-handle").style("cursor", "ew-resize").style("touch-action", "none")
      xDragHandle.append("rect")
        .attr("x", -15).attr("y", barY1 - 5).attr("width", 30).attr("height", barH + 10)
        .attr("fill", "transparent")
      xDragHandle.append("circle")
        .attr("cy", barY1 + barH / 2).attr("r", 7)
        .attr("fill", "#6585ff").attr("stroke", "white").attr("stroke-width", 2)

      // Draggable handle on logy bar
      const yDragHandle = g.append("g").attr("class", "y-drag-handle").style("cursor", "ew-resize").style("touch-action", "none")
      yDragHandle.append("rect")
        .attr("x", -15).attr("y", barY2 - 5).attr("width", 30).attr("height", barH + 10)
        .attr("fill", "transparent")
      yDragHandle.append("circle")
        .attr("cy", barY2 + barH / 2).attr("r", 7)
        .attr("fill", "#57b59a").attr("stroke", "white").attr("stroke-width", 2)

      // Divider line inside combined bar
      g.append("line").attr("class", "logxy-divider")
        .attr("y1", barY3 + 2).attr("y2", barY3 + barH - 2)
        .attr("stroke", "#9a5c0e").attr("stroke-width", 2).attr("stroke-dasharray", "3 2")

      // Verification text
      g.append("text").attr("class", "verify-label")
        .attr("x", barX0).attr("y", barY3 + barH + H * 0.05)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#16a34a")

      // --- Curve section ---

      // Curve title
      g.append("text")
        .attr("x", (curveLeft + curveRight) / 2).attr("y", curveTop - H * 0.028)
        .attr("text-anchor", "middle").attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#475569")
        .text(ultraCompact ? "log(x)" : compact ? "log\u2081\u2080(x)" : "y = log\u2081\u2080(x)")

      // Axes
      g.append("line")
        .attr("x1", curveLeft).attr("y1", cyScale(0)).attr("x2", curveRight).attr("y2", cyScale(0))
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("line")
        .attr("x1", cxScale(1)).attr("y1", curveTop).attr("x2", cxScale(1)).attr("y2", curveBottom)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)

      // Tick labels
      ;(ultraCompact ? [1, 100] : compact ? [1, 10, 100] : [1, 10, 50, 100]).forEach(v => {
        g.append("line")
          .attr("x1", cxScale(v)).attr("y1", cyScale(0) - 3)
          .attr("x2", cxScale(v)).attr("y2", cyScale(0) + 3)
          .attr("stroke", "#94a3b8").attr("stroke-width", 1.5)
        g.append("text")
          .attr("x", cxScale(v)).attr("y", cyScale(0) + H * 0.038)
          .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("font-family", F).attr("fill", "#94a3b8")
          .text(v)
      })

      // Log curve path
      const curveGen = line<number>()
        .x(d => cxScale(d))
        .y(d => cyScale(Math.log(d) / Math.log(BASE)))
        .curve(curveMonotoneX)
      g.append("path")
        .attr("d", curveGen(range(0.5, 101, 0.5)) ?? "")
        .attr("fill", "none").attr("stroke", "#1e293b").attr("stroke-width", 3)

      // Dot on curve for x -- vertical line
      g.append("line").attr("class", "curve-vline")
        .attr("stroke", "#6585ff").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3")

      // Draggable curve dot
      const curveDotGroup = g.append("g").attr("class", "curve-dot-group").style("cursor", "grab").style("touch-action", "none")
      curveDotGroup.append("circle").attr("r", 18).attr("fill", "transparent")
      curveDotGroup.append("circle").attr("class", "curve-dot").attr("r", 6)
        .attr("fill", "#6585ff").attr("stroke", "white").attr("stroke-width", 2)

      // --- Values panel ---
      const panelX = curveLeft
      const panelY = curveBottom + 30
      const panelW = curveRight - curveLeft
      const panelH = Math.min(H * 0.28, H - panelY - 10)
      g.append("rect")
        .attr("x", panelX).attr("y", panelY).attr("width", panelW).attr("height", panelH)
        .attr("rx", 12).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)

      const panelPad = W * 0.02
      g.append("text")
        .attr("x", panelX + panelPad).attr("y", panelY + panelH * 0.2)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
        .text(ultraCompact ? "Vals" : compact ? "Values" : "Current Values")

      g.append("text").attr("class", "val-logx")
        .attr("x", panelX + panelPad).attr("y", panelY + panelH * 0.4)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#2f5bd1")

      g.append("text").attr("class", "val-logy")
        .attr("x", panelX + panelPad).attr("y", panelY + panelH * 0.57)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#157a63")

      g.append("text").attr("class", "val-logxy")
        .attr("x", panelX + panelPad).attr("y", panelY + panelH * 0.73)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#9a5c0e")

      g.append("text").attr("class", "val-confirm")
        .attr("x", panelX + panelPad).attr("y", panelY + panelH * 0.92)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#16a34a")
        .text(ultraCompact ? "Rule ok" : compact ? "Rule confirmed" : "Product rule confirmed")

      // Drag hint
      g.append("text")
        .attr("x", W / 2).attr("y", H - H * 0.033)
        .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("font-family", F).attr("fill", "#94a3b8").attr("opacity", 0.6)
        .text(ultraCompact ? "" : compact ? "Drag bars or dot" : "Drag the dots on the bars or curve to change x and y")

      // ── updateGeometry: repositions everything from x,y WITHOUT React ──
      function updateGeometry(xv: number, yv: number) {
        const logX = Math.log(xv) / Math.log(BASE)
        const logY = Math.log(yv) / Math.log(BASE)
        const logXY = Math.log(xv * yv) / Math.log(BASE)

        // Bar widths
        g.select(".logx-bar").attr("width", barScale(Math.max(0.01, logX)))
        g.select(".logy-bar").attr("width", barScale(Math.max(0.01, logY)))
        g.select(".logxy-bar").attr("width", barScale(Math.max(0.01, logXY)))

        // Divider line in combined bar
        const divX = barX0 + barScale(Math.max(0.01, logX))
        g.select(".logxy-divider").attr("x1", divX).attr("x2", divX)

        // Labels
        g.select(".logx-label").text(ultraCompact ? `${xv} \u2192 ${logX.toFixed(2)}` : compact ? `log ${xv} = ${logX.toFixed(2)}` : `log(${xv}) = ${logX.toFixed(3)}`)
        g.select(".logy-label").text(ultraCompact ? `${yv} \u2192 ${logY.toFixed(2)}` : compact ? `log ${yv} = ${logY.toFixed(2)}` : `log(${yv}) = ${logY.toFixed(3)}`)
        g.select(".logxy-label").text(ultraCompact ? `${xv * yv} \u2192 ${logXY.toFixed(2)}` : compact ? `log ${xv * yv} = ${logXY.toFixed(2)}` : `log(${xv * yv}) = ${logXY.toFixed(3)}`)
        g.select(".verify-label").text(ultraCompact ? `${logX.toFixed(2)}+${logY.toFixed(2)}=${(logX + logY).toFixed(2)}` : compact ? `${logX.toFixed(2)} + ${logY.toFixed(2)} = ${(logX + logY).toFixed(2)}` : `${logX.toFixed(3)} + ${logY.toFixed(3)} = ${(logX + logY).toFixed(3)} (verified)`)

        // Curve dot + vertical line
        const dotCx = cxScale(Math.min(xv, 100))
        const dotCy = cyScale(logX)
        g.select(".curve-dot-group")
          .attr("transform", `translate(${dotCx},${dotCy})`)
        g.select(".curve-vline")
          .attr("x1", dotCx).attr("y1", dotCy)
          .attr("x2", dotCx).attr("y2", cyScale(0))

        // Position x and y drag handles at end of their bars
        const xHandlePos = barX0 + barScale(Math.max(0.01, logX))
        g.select(".x-drag-handle")
          .attr("transform", `translate(${xHandlePos},0)`)
        const yHandlePos = barX0 + barScale(Math.max(0.01, logY))
        g.select(".y-drag-handle")
          .attr("transform", `translate(${yHandlePos},0)`)

        // Values panel text
        g.select(".val-logx").text(ultraCompact ? `x${xv}: ${logX.toFixed(2)}` : compact ? `x ${xv} -> ${logX.toFixed(3)}` : `log\u2081\u2080(${xv}) = ${logX.toFixed(4)}`)
        g.select(".val-logy").text(ultraCompact ? `y${yv}: ${logY.toFixed(2)}` : compact ? `y ${yv} -> ${logY.toFixed(3)}` : `log\u2081\u2080(${yv}) = ${logY.toFixed(4)}`)
        g.select(".val-logxy").text(ultraCompact ? `xy${xv * yv}: ${logXY.toFixed(2)}` : compact ? `xy ${xv * yv} -> ${logXY.toFixed(3)}` : `log\u2081\u2080(${xv * yv}) = ${logXY.toFixed(4)}`)
      }

      // Expose for external sync
      updateRef.current = updateGeometry

      // Initial render
      updateGeometry(liveRef.current.x, liveRef.current.y)

      // ── D3 drag -- updates SVG directly, syncs React only on end ──

      const xDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select("circle").transition().duration(100).attr("r", 9)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newX = xValueScale.invert(event.x)
          const clamped = Math.max(1, Math.min(100, Math.round(newX)))
          liveRef.current.x = clamped
          updateGeometry(clamped, liveRef.current.y)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "ew-resize")
          select(this).select("circle").transition().duration(100).attr("r", 7)
          onVarChangeRef.current('x', liveRef.current.x)
        })
      xDragHandle.call(xDragBehavior)

      const yDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select("circle").transition().duration(100).attr("r", 9)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newY = yValueScale.invert(event.x)
          const clamped = Math.max(1, Math.min(100, Math.round(newY)))
          liveRef.current.y = clamped
          updateGeometry(liveRef.current.x, clamped)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "ew-resize")
          select(this).select("circle").transition().duration(100).attr("r", 7)
          onVarChangeRef.current('y', liveRef.current.y)
        })
      yDragHandle.call(yDragBehavior)

      const curveDotDrag = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select(".curve-dot").transition().duration(100).attr("r", 8)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newX = cxScale.invert(event.x)
          const clamped = Math.max(1, Math.min(100, Math.round(newX)))
          liveRef.current.x = clamped
          updateGeometry(clamped, liveRef.current.y)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          select(this).select(".curve-dot").transition().duration(100).attr("r", 6)
          onVarChangeRef.current('x', liveRef.current.x)
        })
      curveDotGroup.call(curveDotDrag)
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
