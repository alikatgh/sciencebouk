import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import "d3-transition"
import { range } from "d3-array"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { line } from "d3-shape"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const F = "Manrope, sans-serif"

const variables: Variable[] = [
  { name: 'v', symbol: 'v', latex: 'v', value: 0.5, min: 0, max: 0.99, step: 0.01, color: VAR_COLORS.primary, unit: 'c', description: 'Velocity as fraction of light speed' },
  { name: 'c', symbol: 'c', latex: 'c', value: 1, min: 1, max: 1, step: 1, color: VAR_COLORS.constant, constant: true, unit: 'c', description: 'Speed of light' },
  { name: 'gamma', symbol: '\u03B3', latex: '\\gamma', value: 1.15, min: 1, max: 100, step: 0.01, color: VAR_COLORS.result, constant: true, description: 'Lorentz factor' },
]

const lessons: LessonStep[] = [
  {
    id: 'touch-v',
    instruction: "See the blue v in the formula? Drag it upward to increase the velocity.",
    hint: "Find the blue v above and drag up to increase it.",
    highlightElements: ['v'],
    unlockedVariables: ['v'],
    successCondition: { type: 'variable_changed', target: 'v' },
    celebration: 'subtle',
    insight: "As velocity increases, the Lorentz factor gamma grows. At half the speed of light, time only slows by about 15%. Not much yet.",
  },
  {
    id: 'high-speed',
    instruction: "Now push v up to 0.90 -- that's 90% of light speed.",
    hint: "Drag v until it reads 0.90.",
    highlightElements: ['v'],
    unlockedVariables: ['v'],
    successCondition: { type: 'value_reached', target: 'v', value: 0.90, tolerance: 0.03 },
    celebration: 'medium',
    insight: "At 90% light speed, gamma is about 2.3. A clock on the spaceship ticks at less than half speed. GPS satellites experience a version of this -- their clocks drift by 38 microseconds per day.",
  },
  {
    id: 'near-light',
    instruction: "Try to push v as close to 1.0 as you can. Watch what happens to gamma.",
    hint: "Push v to the maximum value (0.99).",
    highlightElements: ['v', 'gamma'],
    unlockedVariables: ['v'],
    successCondition: { type: 'value_reached', target: 'v', value: 0.99, tolerance: 0.02 },
    celebration: 'big',
    insight: "Gamma shoots toward infinity as v approaches c. This is why nothing with mass can reach light speed -- it would require infinite energy. The universe has a speed limit baked into spacetime itself.",
  },
]

export function RelativityScene(): ReactElement {
  return (
    <TeachableEquation
      hook="GPS satellites move fast and sit in weaker gravity. Without Einstein's corrections, your phone's location would drift by 10 km per day. Time itself runs at different speeds."
      hookAction="Drag the speed slider to see time slow down and objects shrink."
      formula="{\u03B3} = 1 / \u221A(1 - {v}\u00B2/{c}\u00B2)"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const safeV = Math.min(v.v, 0.999)
        const gamma = 1 / Math.sqrt(1 - safeV * safeV)
        return `{\\color{#ef4444}\\gamma} = \\frac{1}{\\sqrt{1 - {\\color{#3b82f6}${v.v.toFixed(2)}}^2}} = {\\color{#ef4444}${gamma.toFixed(2)}}`
      }}
      buildResultLine={(v) => {
        const safeV = Math.min(v.v, 0.999)
        const gamma = 1 / Math.sqrt(1 - safeV * safeV)
        return `\\gamma = ${gamma.toFixed(4)}`
      }}
      describeResult={(v) => {
        const safeV = Math.min(v.v, 0.999)
        const gamma = 1 / Math.sqrt(1 - safeV * safeV)
        const pct = ((1 - 1 / gamma) * 100)
        if (v.v < 0.01) return "At rest -- no relativistic effects"
        if (v.v < 0.1) return "Everyday speed -- effects negligible"
        if (gamma > 7) return `Time slows by ${pct.toFixed(0)}% -- extreme relativistic regime`
        return `Time slows by ${pct.toFixed(1)}% for the traveler`
      }}
      presets={[
        { label: "Everyday", values: { v: 0 } },
        { label: "Half light", values: { v: 0.50 } },
        { label: "90% light speed", values: { v: 0.90 } },
      ]}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar }) => (
        <RelativityBridge vars={vars} setVar={setVar} highlightedVar={highlightedVar} setHighlightedVar={setHighlightedVar} />
      )}
    </TeachableEquation>
  )
}

interface Props {
  velocity: number
  gamma: number
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
  onVarChange: (name: string, value: number) => void
}

function RelativityBridge({ vars, setVar, highlightedVar, setHighlightedVar }: {
  vars: Record<string, number>
  setVar: (name: string, value: number) => void
  highlightedVar: string | null
  setHighlightedVar: (name: string | null) => void
}): ReactElement {
  const safeV = Math.min(vars.v, 0.999)
  const gamma = 1 / Math.sqrt(1 - safeV * safeV)

  useEffect(() => {
    if (Math.abs(vars.gamma - gamma) > 0.01) {
      setVar('gamma', gamma)
    }
  }, [vars.v, vars.gamma, gamma, setVar])

  return (
    <D3RelativityVisual
      velocity={vars.v}
      gamma={gamma}
      highlightedVar={highlightedVar}
      onHighlight={setHighlightedVar}
      onVarChange={setVar}
    />
  )
}

function D3RelativityVisual({ velocity, gamma, highlightedVar, onHighlight, onVarChange }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  // Live velocity during drag -- bypasses React render cycle for 60fps SVG
  const liveRef = useRef(velocity)
  const draggingRef = useRef(false)
  // Store the update function so external effects can call it
  const updateRef = useRef<((v: number) => void) | null>(null)

  // Clock animation state
  const clockAngle1Ref = useRef(0)
  const clockAngle2Ref = useRef(0)
  const gammaRef = useRef(gamma)
  gammaRef.current = gamma
  const lastTimeRef = useRef(0)
  const rafRef = useRef(0)
  const resizeRafRef = useRef(0)

  // Sync React props into SVG when not dragging (handles presets, lesson steps)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = velocity
    updateRef.current?.(velocity)
  }, [velocity, gamma])

  // Highlight effect (lightweight attr toggle, no SVG rebuild)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const svg = select(el).select("svg")
    if (svg.empty()) return

    const vActive = highlightedVar === 'v'
    const gammaActive = highlightedVar === 'gamma'

    svg.select(".curve-dot")
      .attr("fill", gammaActive ? VAR_COLORS.result : '#ef4444')
    svg.select(".curve-drop")
      .attr("stroke", vActive ? VAR_COLORS.primary : '#ef4444')
  }, [highlightedVar])

  // ===============================================================
  // Main SVG -- created ONCE, rebuilt only on container resize.
  // Drag updates go through updateScene() directly, not React.
  // ===============================================================
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let currentW = 0
    let currentH = 0
    let clockRunning = true

    function buildSVG() {
      if (!el) return
      // Cancel any previous animation loop before rebuilding
      clockRunning = false
      cancelAnimationFrame(rafRef.current)
      clockRunning = true

      select(el).select("svg").remove()
      lastTimeRef.current = 0

      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      currentW = W
      currentH = H

      if (W < 100 || H < 100) return

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Lorentz factor curve, clocks, and length contraction")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")

      const fs = Math.max(12, Math.min(18, H / 28))

      // Curve panel geometry
      const leftPanelLeft = Math.round(W * 0.05)
      const leftPanelRight = Math.round(W * 0.42)
      const leftPanelTop = Math.round(H * 0.14)
      const leftPanelBottom = Math.round(H * 0.78)
      const xScale = scaleLinear().domain([0, 1]).range([leftPanelLeft + Math.round(W * 0.02), leftPanelRight - Math.round(W * 0.02)])
      const yScale = scaleLinear().domain([0, 12]).range([leftPanelBottom, leftPanelTop])

      // Right panel geometry
      const rpLeft = Math.round(W * 0.48)
      const rpWidth = Math.round(W * 0.5)
      const rpCenter = rpLeft + Math.round(rpWidth / 2)

      // --- Gamma curve panel ---
      const lpLeft = Math.round(W * 0.022)
      const lpWidth = Math.round(W * 0.433)
      const lpTop = Math.round(H * 0.037)
      const lpHeight = Math.round(H * 0.88)
      g.append("rect").attr("x", lpLeft).attr("y", lpTop).attr("width", lpWidth).attr("height", lpHeight)
        .attr("rx", 14).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("x", lpLeft + lpWidth / 2).attr("y", lpTop + 24).attr("text-anchor", "middle")
        .attr("font-size", fs * 1.2).attr("fill", "#1e293b").attr("font-family", F).attr("font-weight", 700)
        .text("Lorentz Factor")

      // Axes
      const axLeft = xScale(0)
      const axRight = xScale(1)
      const axBottom = yScale(0)
      const axTop = yScale(12)
      g.append("line").attr("x1", axLeft).attr("y1", axBottom).attr("x2", axRight).attr("y2", axBottom)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("line").attr("x1", axLeft).attr("y1", axBottom).attr("x2", axLeft).attr("y2", axTop)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("text").attr("x", (axLeft + axRight) / 2).attr("y", axBottom + Math.round(H * 0.042)).attr("text-anchor", "middle")
        .attr("font-size", fs * 0.85).attr("fill", "#94a3b8").attr("font-family", F).text("v/c")
      g.append("text").attr("x", axLeft - 12).attr("y", axTop + 8).attr("font-size", fs * 0.85)
        .attr("fill", "#94a3b8").attr("font-family", F).text("\u03B3")

      // X axis ticks
      for (const v of [0, 0.25, 0.5, 0.75, 1.0]) {
        g.append("line").attr("x1", xScale(v)).attr("y1", axBottom - 2).attr("x2", xScale(v)).attr("y2", axBottom + 4)
          .attr("stroke", "#94a3b8").attr("stroke-width", 1)
        g.append("text").attr("x", xScale(v)).attr("y", axBottom + Math.round(H * 0.037)).attr("text-anchor", "middle")
          .attr("font-size", fs * 0.8).attr("fill", "#94a3b8").attr("font-family", F).text(v.toFixed(2))
      }
      // Y axis ticks
      for (const gv of [1, 2, 4, 6, 8, 10, 12]) {
        const yp = yScale(gv)
        if (yp >= axTop && yp <= axBottom) {
          g.append("line").attr("x1", axLeft - 4).attr("y1", yp).attr("x2", axLeft + 2).attr("y2", yp)
            .attr("stroke", "#94a3b8").attr("stroke-width", 1)
          g.append("text").attr("x", axLeft - 8).attr("y", yp + 4).attr("text-anchor", "end")
            .attr("font-size", fs * 0.8).attr("fill", "#94a3b8").attr("font-family", F).text(String(gv))
        }
      }

      // gamma=1 reference
      g.append("line").attr("x1", axLeft).attr("y1", yScale(1)).attr("x2", axRight).attr("y2", yScale(1))
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1).attr("stroke-dasharray", "4 4")

      // Gamma curve
      const vs = range(0, 0.995, 0.005)
      const pathGen = line<number>()
        .x(d => xScale(d))
        .y(d => yScale(1 / Math.sqrt(1 - d * d)))
      g.append("path").attr("d", pathGen(vs) ?? "").attr("fill", "none")
        .attr("stroke", "#1e40af").attr("stroke-width", 3)

      // Current point + drop line (will update)
      g.append("line").attr("class", "curve-drop")
        .attr("stroke", "#ef4444").attr("stroke-width", 1).attr("stroke-dasharray", "4 3")

      // Draggable velocity handle on the curve
      const dotG = g.append("g").attr("class", "curve-dot-group").style("cursor", "grab").style("touch-action", "none")
      // Invisible hit area (min 30px)
      dotG.append("circle").attr("class", "curve-hit").attr("r", 18).attr("fill", "transparent")
      // Visible dot
      dotG.append("circle").attr("class", "curve-dot").attr("r", 6)
        .attr("fill", "#ef4444").attr("stroke", "white").attr("stroke-width", 2)

      const velocityDrag = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select(".curve-dot").transition().duration(100)
            .attr("r", 9).attr("stroke-width", 3)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newV = Math.max(0, Math.min(0.99, xScale.invert(event.x)))
          const snapped = Math.round(newV * 100) / 100
          liveRef.current = snapped
          updateScene(snapped)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          select(this).select(".curve-dot").transition().duration(100)
            .attr("r", 6).attr("stroke-width", 2)
          onVarChangeRef.current('v', liveRef.current)
        })
      dotG.call(velocityDrag)

      // Velocity label on curve
      g.append("text").attr("class", "v-curve-label").attr("y", axBottom + Math.round(H * 0.042))
        .attr("text-anchor", "middle").attr("font-size", fs).attr("font-weight", 600)
        .attr("font-family", F).attr("fill", VAR_COLORS.primary).style("cursor", "pointer")
      g.select(".v-curve-label")
        .on("pointerenter", () => onHighlightRef.current('v'))
        .on("pointerleave", () => onHighlightRef.current(null))

      // --- Time Dilation panel ---
      const tdTop = lpTop
      const tdHeight = Math.round(H * 0.52)
      g.append("rect").attr("x", rpLeft).attr("y", tdTop).attr("width", rpWidth).attr("height", tdHeight)
        .attr("rx", 14).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("x", rpCenter).attr("y", tdTop + 24).attr("text-anchor", "middle")
        .attr("font-size", fs * 1.2).attr("fill", "#1e293b").attr("font-family", F).attr("font-weight", 700)
        .text("Time Dilation")

      // Clock 1 (stationary)
      const cr = Math.round(Math.min(rpWidth * 0.1, tdHeight * 0.2))
      const c1x = Math.round(rpLeft + rpWidth * 0.22)
      const c1y = Math.round(tdTop + tdHeight * 0.55)
      g.append("circle").attr("cx", c1x).attr("cy", c1y).attr("r", cr)
        .attr("fill", "white").attr("stroke", "#334155").attr("stroke-width", 2.5)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.append("line")
          .attr("x1", c1x + Math.sin(a) * cr * 0.82).attr("y1", c1y - Math.cos(a) * cr * 0.82)
          .attr("x2", c1x + Math.sin(a) * cr * 0.95).attr("y2", c1y - Math.cos(a) * cr * 0.95)
          .attr("stroke", "#64748b").attr("stroke-width", 2)
      }
      g.append("line").attr("class", "clock1-hand").attr("x1", c1x).attr("y1", c1y)
        .attr("stroke", "#1e293b").attr("stroke-width", 3).attr("stroke-linecap", "round")
      g.append("circle").attr("cx", c1x).attr("cy", c1y).attr("r", 3).attr("fill", "#1e293b")
      g.append("text").attr("x", c1x).attr("y", c1y + cr + 20).attr("text-anchor", "middle")
        .attr("font-size", fs).attr("fill", "#475569").attr("font-family", F).attr("font-weight", 600)
        .text("Stationary")

      // Clock 2 (moving)
      const c2x = Math.round(rpLeft + rpWidth * 0.64)
      const c2y = c1y
      g.append("circle").attr("cx", c2x).attr("cy", c2y).attr("r", cr)
        .attr("fill", "white").attr("stroke", "#334155").attr("stroke-width", 2.5)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.append("line")
          .attr("x1", c2x + Math.sin(a) * cr * 0.82).attr("y1", c2y - Math.cos(a) * cr * 0.82)
          .attr("x2", c2x + Math.sin(a) * cr * 0.95).attr("y2", c2y - Math.cos(a) * cr * 0.95)
          .attr("stroke", "#64748b").attr("stroke-width", 2)
      }
      g.append("line").attr("class", "clock2-hand").attr("x1", c2x).attr("y1", c2y)
        .attr("stroke", "#1e293b").attr("stroke-width", 3).attr("stroke-linecap", "round")
      g.append("circle").attr("cx", c2x).attr("cy", c2y).attr("r", 3).attr("fill", "#1e293b")
      g.append("text").attr("class", "clock2-label").attr("x", c2x).attr("y", c2y + cr + 20)
        .attr("text-anchor", "middle").attr("font-size", fs).attr("fill", "#475569")
        .attr("font-family", F).attr("font-weight", 600)

      // --- Length Contraction panel ---
      const lcTop = tdTop + tdHeight + Math.round(H * 0.023)
      const lcHeight = Math.round(H * 0.30)
      g.append("rect").attr("x", rpLeft).attr("y", lcTop).attr("width", rpWidth).attr("height", lcHeight)
        .attr("rx", 14).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("x", rpCenter).attr("y", lcTop + 24).attr("text-anchor", "middle")
        .attr("font-size", fs * 1.2).attr("fill", "#1e293b").attr("font-family", F).attr("font-weight", 700)
        .text("Length Contraction")

      // Rest length bar
      const barX = Math.round(rpLeft + rpWidth * 0.16)
      const barW = Math.round(rpWidth * 0.33)
      const barY1 = lcTop + Math.round(lcHeight * 0.38)
      const barH = Math.round(lcHeight * 0.22)
      g.append("rect").attr("x", barX).attr("y", barY1).attr("width", barW).attr("height", barH)
        .attr("rx", 5).attr("fill", "#dbeafe").attr("stroke", "#3b82f6").attr("stroke-width", 1.5)
      g.append("text").attr("x", barX + barW / 2).attr("y", barY1 + barH * 0.73).attr("text-anchor", "middle")
        .attr("font-size", fs * 0.9).attr("fill", "#1e40af").attr("font-family", F).attr("font-weight", 600)
        .text("Rest: L = 1.00")

      // Contracted bar (will update)
      const barY2 = barY1 + barH + 8
      g.append("rect").attr("class", "contract-bar").attr("y", barY2).attr("height", barH)
        .attr("rx", 5).attr("fill", "#fef3c7").attr("stroke", "#f59e0b").attr("stroke-width", 1.5)
      g.append("text").attr("class", "contract-label").attr("y", barY2 + barH * 0.73)
        .attr("text-anchor", "middle").attr("font-size", fs * 0.9).attr("fill", "#92400e")
        .attr("font-family", F).attr("font-weight", 600)

      // Extreme annotation (below contraction panel)
      g.append("text").attr("class", "extreme-label")
        .attr("x", rpCenter).attr("y", lcTop + lcHeight + Math.round(H * 0.05))
        .attr("text-anchor", "middle").attr("font-size", fs * 0.85).attr("font-family", F).attr("font-weight", 600)

      // ── updateScene: repositions all dynamic elements from velocity WITHOUT React ──
      function updateScene(vel: number) {
        const safeVel = Math.min(vel, 0.999)
        const gam = 1 / Math.sqrt(1 - safeVel * safeVel)

        // Update gammaRef so the clock animation picks up the new value immediately
        gammaRef.current = gam

        // Curve dot + drop line (no transition during drag for smoothness)
        const cx = xScale(vel)
        const cy = yScale(Math.min(gam, 12))
        g.select(".curve-dot-group")
          .attr("transform", `translate(${cx}, ${cy})`)
        g.select(".curve-drop")
          .attr("x1", cx).attr("y1", cy).attr("x2", cx).attr("y2", leftPanelBottom)

        // Velocity label on curve
        g.select(".v-curve-label")
          .attr("x", cx).text(`v = ${vel.toFixed(2)}c`)

        // Clock 2 label
        g.select(".clock2-label").text(`Moving (${(1 / gam).toFixed(2)}x)`)

        // Length contraction
        const contractedWidth = barW / gam
        g.select(".contract-bar")
          .attr("x", barX).attr("width", contractedWidth)
        g.select(".contract-label")
          .attr("x", barX + contractedWidth / 2)
          .text(`L' = ${(1 / gam).toFixed(3)}`)

        // Extreme annotations
        if (gam > 7) {
          g.select(".extreme-label").attr("fill", "#ef4444")
            .text("Extreme relativistic regime -- time nearly stops for the traveler.")
        } else if (vel < 0.1) {
          g.select(".extreme-label").attr("fill", "#94a3b8")
            .text("At everyday speeds, relativity effects are negligible.")
        } else {
          g.select(".extreme-label").text("")
        }
      }

      // Expose for external sync
      updateRef.current = updateScene

      // Initial render
      updateScene(liveRef.current)

      // Clock animation loop
      const handLen = cr * 0.7
      const animateClocks = (ts: number) => {
        if (!clockRunning) return
        if (lastTimeRef.current === 0) lastTimeRef.current = ts
        const dt = (ts - lastTimeRef.current) / 1000
        lastTimeRef.current = ts

        clockAngle1Ref.current = (clockAngle1Ref.current + dt * 60) % 360
        clockAngle2Ref.current = (clockAngle2Ref.current + dt * 60 / gammaRef.current) % 360

        const rad1 = (clockAngle1Ref.current * Math.PI) / 180
        const rad2 = (clockAngle2Ref.current * Math.PI) / 180

        g.select(".clock1-hand")
          .attr("x2", c1x + Math.sin(rad1) * handLen)
          .attr("y2", c1y - Math.cos(rad1) * handLen)

        g.select(".clock2-hand")
          .attr("x2", c2x + Math.sin(rad2) * handLen)
          .attr("y2", c2y - Math.cos(rad2) * handLen)

        rafRef.current = requestAnimationFrame(animateClocks)
      }
      rafRef.current = requestAnimationFrame(animateClocks)
    }

    buildSVG()

    let rebuildScheduled = false
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w !== currentW || h !== currentH) {
        cancelAnimationFrame(rafRef.current)
        if (!rebuildScheduled) {
          rebuildScheduled = true
          resizeRafRef.current = requestAnimationFrame(() => {
            rebuildScheduled = false
            buildSVG()
          })
        }
      }
    })
    observer.observe(el)

    return () => {
      clockRunning = false
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(resizeRafRef.current)
      observer.disconnect()
      select(el).select("svg").remove()
      updateRef.current = null
    }
  }, []) // empty deps: SVG created once, rebuilt only on resize

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
