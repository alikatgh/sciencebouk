import type { ReactElement } from "react"
import { useEffect, useRef, useState } from "react"
import {
  select,
  scaleLinear,
  drag,
  type D3DragEvent,
  type Selection,
} from "d3"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useContainerSize } from "../../hooks/useContainerSize"

const F = "Manrope, sans-serif"

const variables: Variable[] = [
  { name: 'a', symbol: 'a', latex: 'a', value: 1, min: -2.5, max: 2.5, step: 0.1, color: VAR_COLORS.primary, description: 'Real part Re(z)' },
  { name: 'b', symbol: 'b', latex: 'b', value: 0.5, min: -2.5, max: 2.5, step: 0.1, color: VAR_COLORS.secondary, description: 'Imaginary part Im(z)' },
]

const lessons: LessonStep[] = [
  {
    id: 'explore-real',
    instruction: "Drag the blue a (the real part) to move the point left and right along the real axis.",
    hint: "Find the blue a in the formula and drag it.",
    highlightElements: ['a'],
    unlockedVariables: ['a'],
    lockedVariables: ['b'],
    successCondition: { type: 'variable_changed', target: 'a' },
    celebration: 'subtle',
    insight: "The real part moves the point horizontally, just like a regular number line. Complex numbers extend math into two dimensions.",
  },
  {
    id: 'explore-imaginary',
    instruction: "Now drag the yellow b (the imaginary part) to move the point up and down.",
    hint: "Drag the yellow b value in the formula.",
    highlightElements: ['b'],
    unlockedVariables: ['b'],
    lockedVariables: ['a'],
    successCondition: { type: 'variable_changed', target: 'b' },
    celebration: 'subtle',
    insight: "The imaginary axis is perpendicular to the real axis. Together they form the complex plane, where every point represents a complex number a + bi.",
  },
  {
    id: 'multiply-by-i',
    instruction: "Set a to about 1 and b to 0, then use the 'Multiply by i' button below the visualization. Watch what happens to the point.",
    hint: "Set a=1, b=0 to put the point on the real axis, then click the multiply-by-i button.",
    highlightElements: ['a', 'b'],
    unlockedVariables: ['a', 'b'],
    successCondition: { type: 'variable_changed', target: 'b' },
    celebration: 'big',
    insight: "Multiplying by i rotates the point exactly 90 degrees counterclockwise. Do it twice (i x i) and you've rotated 180 degrees, which is the same as multiplying by -1. That's why i squared equals -1!",
  },
]

export function ComplexScene(): ReactElement {
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

function D3ComplexVisual({ a, b, onVarChange, highlightedVar, onHighlight }: D3ComplexVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)
  const CX = W * 0.42
  const CY = H * 0.5
  const RADIUS = Math.min(W, H) * 0.32
  const gRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setTick] = useState(0)

  const xScale = scaleLinear().domain([-3, 3]).range([CX - RADIUS * 1.5, CX + RADIUS * 1.5])
  const yScale = scaleLinear().domain([-3, 3]).range([CY + RADIUS * 1.5, CY - RADIUS * 1.5])

  function formatComplex(re: number, im: number): string {
    const rStr = re.toFixed(2)
    const iAbs = Math.abs(im).toFixed(2)
    if (Math.abs(im) < 0.005) return `${rStr}`
    if (Math.abs(re) < 0.005) return im > 0 ? `${iAbs}i` : `-${iAbs}i`
    return im > 0 ? `${rStr} + ${iAbs}i` : `${rStr} - ${iAbs}i`
  }

  // D3 setup — rebuilds on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container || W < 100 || H < 100) return
    select(container).select("svg").remove()

    const svg = select(container)
      .append("svg")
      .attr("width", W)
      .attr("height", H)
      .style("display", "block")
      .style("touch-action", "none")
      .attr("role", "img")
      .attr("aria-label", "Complex plane visualization showing i squared equals negative one")

    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#f8fbff")

    const g = svg.append("g")
    gRef.current = g

    // Grid lines
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue
      g.append("line").attr("x1", xScale(i)).attr("y1", yScale(-3)).attr("x2", xScale(i)).attr("y2", yScale(3))
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
      g.append("line").attr("x1", xScale(-3)).attr("y1", yScale(i)).attr("x2", xScale(3)).attr("y2", yScale(i))
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
      g.append("text").attr("x", xScale(i)).attr("y", CY + 18).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("fill", "#94a3b8").attr("font-family", F).text(String(i))
      g.append("text").attr("x", CX - 14).attr("y", yScale(i) + 4).attr("text-anchor", "end")
        .attr("font-size", 12).attr("fill", "#94a3b8").attr("font-family", F).text(`${i}i`)
    }

    // Axes
    g.append("line").attr("x1", xScale(-3)).attr("y1", CY).attr("x2", xScale(3)).attr("y2", CY)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
    g.append("line").attr("x1", CX).attr("y1", yScale(-3)).attr("x2", CX).attr("y2", yScale(3))
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2)
    g.append("text").attr("x", xScale(3) - 8).attr("y", CY - 10)
      .attr("font-size", 17).attr("fill", "#64748b").attr("font-weight", 700).attr("font-family", F).text("Re")
    g.append("text").attr("x", CX + 10).attr("y", yScale(3) + 14)
      .attr("font-size", 17).attr("fill", "#64748b").attr("font-weight", 700).attr("font-family", F).text("Im")

    // Unit circle
    g.append("circle").attr("cx", CX).attr("cy", CY).attr("r", xScale(1) - CX)
      .attr("fill", "none").attr("stroke", "#dbeafe").attr("stroke-width", 2).attr("stroke-dasharray", "6 4")

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
    const ptG = g.append("g").attr("class", "point-group").style("cursor", "grab")
    ptG.append("circle").attr("class", "point-hit").attr("r", 44).attr("fill", "transparent")
    ptG.append("circle").attr("class", "point-dot").attr("r", 10)
      .attr("fill", "#5a79ff").attr("stroke", "white").attr("stroke-width", 3)

    // Point label
    g.append("text").attr("class", "point-label")
      .attr("font-size", 15).attr("fill", "#1e293b").attr("font-weight", 600).attr("font-family", F)

    // Info panel
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

    // D3 action buttons inside SVG
    const btnLabels = ["x i", "x (-1)", "Conj", "Reset"]
    const btnClasses = ["btn-mult-i", "btn-mult-neg", "btn-conj", "btn-reset"]
    let bx = W * 0.015
    for (let i = 0; i < btnLabels.length; i++) {
      const bw = btnLabels[i].length * 9 + 20
      const bg = g.append("g").attr("class", btnClasses[i]).style("cursor", "pointer")
        .attr("transform", `translate(${bx}, ${H - 38})`)
      bg.append("rect").attr("width", bw).attr("height", 26).attr("rx", 13)
        .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      bg.append("text").attr("x", bw / 2).attr("y", 17).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#4f73ff")
        .text(btnLabels[i])
      bx += bw + 10
    }

    return () => { select(container).select("svg").remove() }
  }, [W, H])

  // D3 drag — rebuilds on resize
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    const ptG = g.select<SVGGElement>(".point-group")

    const dragBehavior = drag<SVGGElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
        g.select(".point-glow").attr("opacity", 0.5)
      })
      .on("drag", function (event: D3DragEvent<SVGGElement, unknown, unknown>) {
        const newA = Math.round(xScale.invert(event.x) * 10) / 10
        const newB = Math.round(yScale.invert(event.y) * 10) / 10
        onVarChangeRef.current('a', Math.max(-2.5, Math.min(2.5, newA)))
        onVarChangeRef.current('b', Math.max(-2.5, Math.min(2.5, newB)))
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
        g.select(".point-glow").attr("opacity", 0)
      })

    ptG.call(dragBehavior)
  }, [W, H])

  // Hover handlers
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select(".point-group")
      .on("mouseenter", () => { onHighlightRef.current('a') })
      .on("mouseleave", () => { onHighlightRef.current(null) })
  }, [W, H])

  // Wire D3 button click handlers (use refs for current a/b)
  const aRef = useRef(a)
  aRef.current = a
  const bRef = useRef(b)
  bRef.current = b

  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select(".btn-mult-i").on("click", () => {
      onVarChangeRef.current('a', -bRef.current)
      onVarChangeRef.current('b', aRef.current)
    })
    g.select(".btn-mult-neg").on("click", () => {
      onVarChangeRef.current('a', -aRef.current)
      onVarChangeRef.current('b', -bRef.current)
    })
    g.select(".btn-conj").on("click", () => {
      onVarChangeRef.current('b', -bRef.current)
    })
    g.select(".btn-reset").on("click", () => {
      onVarChangeRef.current('a', 1)
      onVarChangeRef.current('b', 0.5)
    })
  }, [W, H])

  // Update D3 elements on a, b, highlightedVar change
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    const dur = 160
    const px = xScale(a)
    const py = yScale(b)
    const magnitude = Math.sqrt(a * a + b * b)
    const angle = Math.atan2(b, a)
    const angleDeg = (angle * 180) / Math.PI

    const aActive = highlightedVar === 'a'
    const bActive = highlightedVar === 'b'
    const pointActive = aActive || bActive

    // Vector line
    g.select(".vector-line").transition().duration(dur)
      .attr("x1", CX).attr("y1", CY).attr("x2", px).attr("y2", py)

    // Projection lines
    g.select(".proj-a").transition().duration(dur)
      .attr("x1", px).attr("y1", py).attr("x2", px).attr("y2", CY)
      .attr("stroke", aActive ? VAR_COLORS.primary : "#5a79ff")
      .attr("stroke-width", aActive ? 2.5 : 1.5)
    g.select(".proj-b").transition().duration(dur)
      .attr("x1", px).attr("y1", py).attr("x2", CX).attr("y2", py)
      .attr("stroke", bActive ? VAR_COLORS.secondary : "#57b59a")
      .attr("stroke-width", bActive ? 2.5 : 1.5)

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
        .text(`${angleDeg.toFixed(0)}\u00B0`)
    } else {
      g.select(".angle-arc").attr("d", "")
      g.select(".angle-text").text("")
    }

    // Point
    g.select(".point-group").attr("transform", `translate(${px},${py})`)
    g.select(".point-glow").transition().duration(dur).attr("cx", px).attr("cy", py)
      .attr("opacity", pointActive ? 0.5 : 0)

    // Point label
    g.select(".point-label")
      .attr("x", px + 16).attr("y", py - 16)
      .text(`z = ${formatComplex(a, b)}`)

    // Info panel
    g.select(".info-rect").text(`z = ${formatComplex(a, b)}`)
    g.select(".info-polar").text(`|z| = ${magnitude.toFixed(3)}, \u03B8 = ${angleDeg.toFixed(1)}\u00B0`)
    g.select(".info-mag").text(`|z| = \u221A(${a.toFixed(2)}\u00B2 + ${b.toFixed(2)}\u00B2) = ${magnitude.toFixed(3)}`)

  }, [a, b, highlightedVar])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}
    />
  )
}
