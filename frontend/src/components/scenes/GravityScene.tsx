import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
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
  { name: 'F', symbol: 'F', latex: 'F', value: 0, min: 0, max: 100, step: 0.01, color: VAR_COLORS.result, constant: true, description: 'Gravitational force' },
  { name: 'm1', symbol: 'm\u2081', latex: 'm_1', value: 3, min: 1, max: 10, step: 0.5, color: VAR_COLORS.primary, unit: 'kg', description: 'Mass of first object' },
  { name: 'm2', symbol: 'm\u2082', latex: 'm_2', value: 7, min: 1, max: 10, step: 0.5, color: VAR_COLORS.secondary, unit: 'kg', description: 'Mass of second object' },
  { name: 'r', symbol: 'r', latex: 'r', value: 5, min: 1.5, max: 10, step: 0.1, color: VAR_COLORS.tertiary, unit: 'm', description: 'Distance between centers' },
  { name: 'G', symbol: 'G', latex: 'G', value: 1, min: 1, max: 1, step: 1, color: VAR_COLORS.constant, constant: true, description: 'Gravitational constant' },
]

const lessons: LessonStep[] = [
  {
    id: 'touch',
    instruction: "Grab the blue mass and drag it left/right to change the distance.",
    highlightElements: ['m1'],
    unlockedVariables: ['m1'],
    lockedVariables: ['m2', 'r'],
    successCondition: { type: 'variable_changed', target: 'm1' },
    celebration: 'subtle',
    insight: "See the force arrow grow? More mass means more gravitational pull.",
  },
  {
    id: 'distance',
    instruction: "Now drag the masses closer together. Watch the force arrow.",
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['m1', 'm2'],
    successCondition: { type: 'variable_changed', target: 'r' },
    celebration: 'subtle',
    insight: "Halve the distance, quadruple the force. The r\u00B2 in the formula is what makes gravity so strong up close.",
  },
  {
    id: 'break-it',
    instruction: "Everything unlocked. Maximize the force.",
    highlightElements: ['m1', 'm2', 'r'],
    unlockedVariables: ['m1', 'm2', 'r'],
    successCondition: { type: 'value_reached', target: 'r', value: 1.5, tolerance: 0.2 },
    celebration: 'medium',
    insight: "Huge masses + tiny distance = enormous force. This is black-hole territory.",
  },
]

export function GravityScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Astronauts don't escape gravity — they fall sideways. The force barely changes at space-station altitude."
      hookAction="Drag the masses to see how gravity changes."
      formula="{F} = {G} \u00D7 {m1} \u00D7 {m2} / {r}\u00B2"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const F = (v.m1 * v.m2) / (v.r * v.r)
        return `{\\color{#ef4444}${F.toFixed(2)}} = G \\times \\frac{{\\color{#3b82f6}${v.m1.toFixed(1)}} \\times {\\color{#f59e0b}${v.m2.toFixed(1)}}}{{\\color{#10b981}${v.r.toFixed(1)}}^2}`
      }}
      buildResultLine={(v) => {
        const F = (v.m1 * v.m2) / (v.r * v.r)
        return `F = \\frac{${v.m1.toFixed(1)} \\times ${v.m2.toFixed(1)}}{${v.r.toFixed(1)}^2} = ${F.toFixed(2)}\\text{ N}`
      }}
      describeResult={(v) => {
        const F = (v.m1 * v.m2) / (v.r * v.r)
        if (F < 0.05) return "Barely any pull — like two pebbles in a field"
        if (F < 1) return "About the weight of a small coin"
        if (F < 5) return "Like holding an apple"
        if (F > 20) return "Black-hole territory!"
        return `${F.toFixed(1)} newtons of gravitational pull`
      }}
      presets={[
        { label: "Two balls", values: { m1: 3, m2: 7, r: 5 } },
        { label: "Close up", values: { m1: 8, m2: 8, r: 2 } },
        { label: "Far apart", values: { m1: 5, m2: 5, r: 9 } },
      ]}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar }) => {
        const force = (vars.m1 * vars.m2) / (vars.r * vars.r)
        return (
          <D3GravityVisual
            m1={vars.m1} m2={vars.m2} r={vars.r} force={force}
            onVarChange={setVar} highlightedVar={highlightedVar} onHighlight={setHighlightedVar}
          />
        )
      }}
    </TeachableEquation>
  )
}

interface Props {
  m1: number; m2: number; r: number; force: number
  onVarChange: (name: string, value: number) => void
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
}

function D3GravityVisual({ m1, m2, r, force, onVarChange, highlightedVar, onHighlight }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)
  const gRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight

  // Setup — rebuilds on resize
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
      .attr("aria-label", "Two masses with gravitational force — drag to explore")

    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

    const g = svg.append("g")
    gRef.current = g

    const cy = H / 2

    // Distance line
    g.append("line").attr("class", "dist-line").attr("y1", cy).attr("y2", cy)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2).attr("stroke-dasharray", "8 6")

    // Distance label
    g.append("text").attr("class", "dist-label").attr("y", cy - 55)
      .attr("text-anchor", "middle").attr("font-size", 18).attr("font-weight", 700).attr("font-family", F).attr("fill", VAR_COLORS.tertiary)

    // Force arrows (right from m1)
    g.append("line").attr("class", "arrow-r").attr("y1", cy).attr("y2", cy)
      .attr("stroke", "#64748b").attr("stroke-width", 5).attr("stroke-linecap", "round")
    g.append("polygon").attr("class", "arrow-r-head").attr("fill", "#64748b")

    // Force arrows (left from m2)
    g.append("line").attr("class", "arrow-l").attr("y1", cy).attr("y2", cy)
      .attr("stroke", "#64748b").attr("stroke-width", 5).attr("stroke-linecap", "round")
    g.append("polygon").attr("class", "arrow-l-head").attr("fill", "#64748b")

    // Force result box
    g.append("rect").attr("class", "force-box").attr("y", cy + 55).attr("height", 40).attr("rx", 14)
      .attr("fill", "white").attr("stroke-width", 2.5)
    g.append("text").attr("class", "force-label").attr("y", cy + 81)
      .attr("text-anchor", "middle").attr("font-size", 20).attr("font-weight", 800).attr("font-family", F)

    // Extreme annotation
    g.append("text").attr("class", "extreme-label").attr("y", cy + 120)
      .attr("text-anchor", "middle").attr("font-size", 15).attr("font-weight", 600).attr("font-family", F)

    // Mass 1 glow ring
    g.append("circle").attr("class", "m1-glow").attr("cy", cy).attr("fill", "none")
      .attr("stroke", VAR_COLORS.primary).attr("stroke-width", 2.5).attr("stroke-dasharray", "6 4").attr("opacity", 0)

    // Mass 1 group — draggable
    const m1G = g.append("g").attr("class", "m1-group").style("cursor", "grab")
    m1G.append("circle").attr("class", "m1-hit").attr("cy", cy).attr("r", 50).attr("fill", "transparent")
    m1G.append("circle").attr("class", "m1-circle").attr("cy", cy)
      .attr("fill", "#93bbfd").attr("stroke", VAR_COLORS.primary).attr("stroke-width", 3)
    m1G.append("text").attr("class", "m1-sym").attr("y", cy + 6)
      .attr("text-anchor", "middle").attr("font-size", 20).attr("font-weight", 700).attr("font-family", F).attr("fill", "white")
      .style("pointer-events", "none").text("m\u2081")
    g.append("text").attr("class", "m1-val").attr("y", cy)
      .attr("text-anchor", "middle").attr("font-size", 16).attr("font-weight", 600).attr("font-family", F).attr("fill", VAR_COLORS.primary)

    // Mass 2 glow ring
    g.append("circle").attr("class", "m2-glow").attr("cy", cy).attr("fill", "none")
      .attr("stroke", VAR_COLORS.secondary).attr("stroke-width", 2.5).attr("stroke-dasharray", "6 4").attr("opacity", 0)

    // Mass 2 group — draggable
    const m2G = g.append("g").attr("class", "m2-group").style("cursor", "grab")
    m2G.append("circle").attr("class", "m2-hit").attr("cy", cy).attr("r", 50).attr("fill", "transparent")
    m2G.append("circle").attr("class", "m2-circle").attr("cy", cy)
      .attr("fill", "#fcd88e").attr("stroke", VAR_COLORS.secondary).attr("stroke-width", 3)
    m2G.append("text").attr("class", "m2-sym").attr("y", cy + 6)
      .attr("text-anchor", "middle").attr("font-size", 20).attr("font-weight", 700).attr("font-family", F).attr("fill", "white")
      .style("pointer-events", "none").text("m\u2082")
    g.append("text").attr("class", "m2-val").attr("y", cy)
      .attr("text-anchor", "middle").attr("font-size", 16).attr("font-weight", 600).attr("font-family", F).attr("fill", VAR_COLORS.secondary)

    // Drag hint
    g.append("text").attr("x", W / 2).attr("y", H - 18).attr("text-anchor", "middle")
      .attr("font-size", 13).attr("font-family", F).attr("fill", "#94a3b8").attr("opacity", 0.6)
      .text("\u2190 drag masses to change distance \u2192")

    // D3 drag on m1
    const m1Drag = drag<SVGGElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
        g.select(".m1-glow").attr("opacity", 0.5)
      })
      .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
        const availW = W - 280
        const gap = Math.abs(event.x - W / 2) * 2
        const newR = 1.5 + (gap / availW) * (10 - 1.5)
        onVarChangeRef.current('r', Math.round(Math.max(1.5, Math.min(10, newR)) * 10) / 10)
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
        g.select(".m1-glow").attr("opacity", 0)
      })
    m1G.call(m1Drag)

    // D3 drag on m2
    const m2Drag = drag<SVGGElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
        g.select(".m2-glow").attr("opacity", 0.5)
      })
      .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
        // Direct: x position of m2 maps to r
        const cx = W / 2
        const gap = Math.abs(event.x - cx) * 2
        const totalRange = W - 280
        const newR = 1.5 + (gap / totalRange) * (10 - 1.5)
        onVarChangeRef.current('r', Math.round(Math.max(1.5, Math.min(10, newR)) * 10) / 10)
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
        g.select(".m2-glow").attr("opacity", 0)
      })
    m2G.call(m2Drag)

    return () => { select(container).select("svg").remove() }
  }, [W, H])

  // Hover handlers
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select(".m1-group")
      .on("mouseenter", () => onHighlightRef.current('m1'))
      .on("mouseleave", () => onHighlightRef.current(null))
    g.select(".m2-group")
      .on("mouseenter", () => onHighlightRef.current('m2'))
      .on("mouseleave", () => onHighlightRef.current(null))
  }, [W, H])

  // Update positions on variable change
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    const cx = W / 2
    const cy = H / 2
    const dur = 160

    const rNorm = (r - 1.5) / (10 - 1.5)
    const gap = 140 + rNorm * (W - 420)
    const x1 = cx - gap / 2
    const x2 = cx + gap / 2
    const r1 = 24 + m1 * 5
    const r2 = 24 + m2 * 5

    const maxForce = (10 * 10) / (1.5 * 1.5)
    const forceNorm = Math.min(force / maxForce, 1)
    const arrowLen = 30 + forceNorm * 130
    const arrowColor = forceNorm > 0.7 ? '#ef4444' : forceNorm > 0.3 ? '#f59e0b' : '#64748b'

    // Distance line
    g.select(".dist-line").transition().duration(dur).attr("x1", x1).attr("x2", x2)
    g.select(".dist-label").transition().duration(dur).attr("x", cx).text(`r = ${r.toFixed(1)} m`)

    // Force arrows
    const ar = x1 + r1 + 10
    g.select(".arrow-r").transition().duration(dur).attr("x1", ar).attr("x2", ar + arrowLen).attr("stroke", arrowColor)
    g.select(".arrow-r-head").transition().duration(dur).attr("points", `${ar + arrowLen - 2},${cy - 8} ${ar + arrowLen + 14},${cy} ${ar + arrowLen - 2},${cy + 8}`).attr("fill", arrowColor)

    const al = x2 - r2 - 10
    g.select(".arrow-l").transition().duration(dur).attr("x1", al).attr("x2", al - arrowLen).attr("stroke", arrowColor)
    g.select(".arrow-l-head").transition().duration(dur).attr("points", `${al - arrowLen + 2},${cy - 8} ${al - arrowLen - 14},${cy} ${al - arrowLen + 2},${cy + 8}`).attr("fill", arrowColor)

    // Force label
    g.select(".force-box").transition().duration(dur).attr("x", cx - 80).attr("width", 160).attr("stroke", arrowColor)
    g.select(".force-label").transition().duration(dur).attr("x", cx).attr("fill", arrowColor).text(`F = ${force.toFixed(2)} N`)

    // Extreme labels
    if (force > 20) {
      g.select(".extreme-label").attr("x", cx).attr("fill", "#ef4444").text("Black-hole territory!")
    } else if (force < 0.05) {
      g.select(".extreme-label").attr("x", cx).attr("fill", "#94a3b8").text("Barely any pull.")
    } else {
      g.select(".extreme-label").text("")
    }

    // Mass 1 position
    g.select(".m1-group").transition().duration(dur).attr("transform", `translate(${x1}, 0)`)
    g.select(".m1-circle").transition().duration(dur).attr("r", r1)
    g.select(".m1-hit").attr("cx", 0)
    g.select(".m1-sym").attr("x", 0)
    g.select(".m1-glow").transition().duration(dur).attr("cx", x1).attr("r", r1 + 12)
    g.select(".m1-val").transition().duration(dur).attr("x", x1).attr("y", cy + r1 + 26).text(`${m1.toFixed(1)} kg`)

    // Mass 2 position
    g.select(".m2-group").transition().duration(dur).attr("transform", `translate(${x2}, 0)`)
    g.select(".m2-circle").transition().duration(dur).attr("r", r2)
    g.select(".m2-hit").attr("cx", 0)
    g.select(".m2-sym").attr("x", 0)
    g.select(".m2-glow").transition().duration(dur).attr("cx", x2).attr("r", r2 + 12)
    g.select(".m2-val").transition().duration(dur).attr("x", x2).attr("y", cy + r2 + 26).text(`${m2.toFixed(1)} kg`)

    // Cross-highlighting
    const m1Active = highlightedVar === 'm1'
    const m2Active = highlightedVar === 'm2'
    const rActive = highlightedVar === 'r'

    g.select(".m1-circle").attr("fill", m1Active ? VAR_COLORS.primary : "#93bbfd")
    g.select(".m2-circle").attr("fill", m2Active ? VAR_COLORS.secondary : "#fcd88e")
    g.select(".dist-line").attr("stroke", rActive ? VAR_COLORS.tertiary : "#cbd5e1").attr("stroke-width", rActive ? 4 : 2)

    if (m1Active) g.select(".m1-glow").attr("opacity", 0.5)
    if (m2Active) g.select(".m2-glow").attr("opacity", 0.5)

  }, [m1, m2, r, force, highlightedVar])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}
    />
  )
}
