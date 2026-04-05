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

const NUM_PARTICLES = 25
const PARTICLE_COLORS = ["#3b82f6", "#10b981"]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

interface ParticleData {
  baseX: number
  baseY: number
  type: number
}

function computeOrderedPositions(startX: number, startY: number, spacing: number): ParticleData[] {
  const particles: ParticleData[] = []
  const cols = 5
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push({
      baseX: startX + (i % cols) * spacing,
      baseY: startY + Math.floor(i / cols) * spacing,
      type: i < 13 ? 0 : 1,
    })
  }
  return particles
}

function computeDisorderedPositions(
  ordered: ParticleData[],
  temperature: number,
  centerX: number,
  centerY: number,
  spacing: number
): Array<{ x: number; y: number; type: number }> {
  const rng = seededRandom(42)
  const t = temperature / 100
  const cols = 5
  const rows = 5
  const startX = centerX - ((cols - 1) * spacing) / 2
  const startY = centerY - ((rows - 1) * spacing) / 2
  const maxDisplace = 70

  return ordered.map((p, i) => {
    const bx = startX + (i % cols) * spacing
    const by = startY + Math.floor(i / cols) * spacing
    const angle = rng() * Math.PI * 2
    const dist = rng() * maxDisplace * t
    return {
      x: bx + Math.cos(angle) * dist,
      y: by + Math.sin(angle) * dist,
      type: p.type,
    }
  })
}

const variables: Variable[] = [
  { name: 'temperature', symbol: 'T', latex: 'T', value: 20, min: 0, max: 100, step: 1, color: VAR_COLORS.primary, description: 'Temperature (drives disorder)' },
]

const lessons: LessonStep[] = [
  {
    id: 'low-temp',
    instruction: "Start with a low temperature. Notice how the particles on the right are still mostly organized, like a crystal.",
    hint: "Keep the temperature near 20 and observe the ordered vs disordered panels.",
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'time_elapsed', duration: 8000 },
    celebration: 'subtle',
    insight: "At low temperatures, particles don't have enough energy to move around much. They stay in their orderly positions. The number of possible arrangements (W) is small, so entropy (S = k ln W) is low.",
  },
  {
    id: 'increase-temp',
    instruction: "Now drag the temperature up to about 70. Watch the particles on the right scatter into disorder.",
    hint: "Drag the blue T in the formula upward to increase temperature.",
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'value_reached', target: 'temperature', value: 70, tolerance: 15 },
    celebration: 'subtle',
    insight: "Higher temperature means more energy, so particles explore more arrangements. The number of microstates W grows exponentially, and entropy climbs rapidly. This is the direction nature always goes -- toward more disorder.",
  },
  {
    id: 'max-entropy',
    instruction: "Push temperature to maximum (100). Can you imagine putting all those particles back in order? That's the Second Law.",
    hint: "Drag temperature all the way to 100.",
    highlightElements: ['temperature'],
    unlockedVariables: ['temperature'],
    successCondition: { type: 'value_reached', target: 'temperature', value: 95, tolerance: 10 },
    celebration: 'big',
    insight: "The Second Law says entropy never decreases spontaneously (dS >= 0). At maximum disorder there are astronomically more ways to be disordered than ordered. Unscrambling an egg is not forbidden by physics -- it's just so unlikely that it will never happen in the lifetime of the universe.",
  },
]

export function EntropyScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Why can't you unscramble an egg? Technically possible, but the odds are 1 in a number with more digits than atoms in the universe."
      hookAction="Drag the temperature slider and watch order dissolve into chaos."
      formula="S = k_B \ln W,\; d S \ge 0"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const t = v.temperature / 100
        const W = Math.max(1, Math.round(Math.exp(t * 8)))
        const S = Math.log(W)
        return `S = k_B \\ln({\\color{#3b82f6}${W.toLocaleString()}}) = {\\color{#ef4444}${S.toFixed(3)}} \\, k_B`
      }}
      buildResultLine={(v) => {
        const t = v.temperature / 100
        const W = Math.max(1, Math.round(Math.exp(t * 8)))
        const S = Math.log(W)
        return `S = ${S.toFixed(3)} \\, k_B`
      }}
      describeResult={(v) => {
        if (v.temperature < 15) return "Ordered -- like a crystal lattice"
        if (v.temperature < 50) return "Some disorder -- particles starting to wander"
        if (v.temperature < 80) return "Messy -- high entropy, many possible arrangements"
        return "Total chaos -- maximum disorder"
      }}
      presets={[
        { label: "Frozen (T=5)", values: { temperature: 5 } },
        { label: "Room temp (T=50)", values: { temperature: 50 } },
        { label: "Max entropy (T=100)", values: { temperature: 100 } },
      ]}
    >
      {({ vars, setVar }) => (
        <D3EntropyVisual
          temperature={vars.temperature}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface Props {
  temperature: number
  onVarChange: (name: string, value: number) => void
}

function D3EntropyVisual({ temperature, onVarChange }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  const liveRef = useRef({ temperature })
  const draggingRef = useRef(false)
  const updateRef = useRef<((temp: number) => void) | null>(null)

  // Sync React props → SVG when not dragging
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current.temperature = temperature
    updateRef.current?.(temperature)
  }, [temperature])

  // Main SVG — created once, rebuilt only on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let currentW = 0
    let currentH = 0

    function buildSVG() {
      if (!container) return
      select(container).select("svg").remove()

      const rect = container.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      if (W < 100 || H < 100) return
      currentW = W
      currentH = H

      const svg = select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .style("touch-action", "none")
        .attr("role", "img")
        .attr("aria-label", "Entropy visualization -- ordered vs disordered particles")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")

      // Layout proportions
      const panelW = W * 0.27
      const panelH = H * 0.55
      const panelY = H * 0.11
      const ordPanelX = W * 0.02
      const disPanelX = W * 0.42
      const spacing = H * 0.087
      const startX = ordPanelX + W * 0.07
      const startY = panelY + H * 0.12
      const centerX = disPanelX + panelW / 2
      const centerY = panelY + panelH / 2

      const ORDERED = computeOrderedPositions(startX, startY, spacing)

      // Ordered panel
      g.append("rect").attr("x", ordPanelX).attr("y", panelY).attr("width", panelW).attr("height", panelH)
        .attr("rx", 14).attr("fill", "#f8fafc").attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("text").attr("x", ordPanelX + panelW / 2).attr("y", panelY + 28).attr("text-anchor", "middle")
        .attr("font-size", 15).attr("fill", "#1e40af").attr("font-family", F).attr("font-weight", 700)
        .text("Ordered (Low S)")

      // Ordered particles (static)
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const p = ORDERED[i]
        g.append("circle")
          .attr("cx", p.baseX + W * 0.03)
          .attr("cy", p.baseY)
          .attr("r", 12)
          .attr("fill", PARTICLE_COLORS[p.type])
          .attr("opacity", 0.85)
      }

      // Arrow between panels
      const arrowX1 = ordPanelX + panelW + W * 0.01
      const arrowX2 = disPanelX - W * 0.01
      const arrowY = panelY + panelH / 2
      g.append("line").attr("x1", arrowX1).attr("y1", arrowY).attr("x2", arrowX2).attr("y2", arrowY)
        .attr("stroke", "#0f172a").attr("stroke-width", 3)
      g.append("polygon").attr("points", `${arrowX2 - 5},${arrowY - 12} ${arrowX2 + 20},${arrowY} ${arrowX2 - 5},${arrowY + 12}`).attr("fill", "#0f172a")
      g.append("text").attr("x", (arrowX1 + arrowX2) / 2).attr("y", arrowY - 15).attr("text-anchor", "middle")
        .attr("font-size", 14).attr("fill", "#64748b").attr("font-family", F).attr("font-weight", 600)
        .text("+Heat")

      // Disordered panel
      g.append("rect").attr("x", disPanelX).attr("y", panelY).attr("width", panelW).attr("height", panelH)
        .attr("rx", 14).attr("fill", "#f8fafc").attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("text").attr("x", disPanelX + panelW / 2).attr("y", panelY + 28).attr("text-anchor", "middle")
        .attr("font-size", 15).attr("fill", "#059669").attr("font-family", F).attr("font-weight", 700)
        .text("Disordered (High S)")

      // Disordered particles (positions set by updateScene)
      for (let i = 0; i < NUM_PARTICLES; i++) {
        g.append("circle")
          .attr("class", `dp-${i}`)
          .attr("r", 12)
          .attr("fill", PARTICLE_COLORS[ORDERED[i].type])
          .attr("opacity", 0.85)
      }

      // Values panel
      const valsPanelY = panelY + panelH + H * 0.03
      g.append("rect").attr("class", "vals-bg").attr("x", ordPanelX).attr("y", valsPanelY).attr("width", W * 0.67)
        .attr("height", H * 0.1).attr("rx", 12).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("class", "w-label").attr("x", ordPanelX + 20).attr("y", valsPanelY + H * 0.065)
        .attr("font-size", 17).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
      g.append("text").attr("class", "s-label").attr("x", W * 0.29).attr("y", valsPanelY + H * 0.065)
        .attr("font-size", 17).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")

      // Entropy graph panel
      const graphPanelX = W * 0.72
      const graphPanelW = W * 0.26
      const graphPanelH = H * 0.64
      g.append("rect").attr("x", graphPanelX).attr("y", H * 0.05).attr("width", graphPanelW).attr("height", graphPanelH)
        .attr("rx", 14).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("x", graphPanelX + graphPanelW / 2).attr("y", H * 0.1).attr("text-anchor", "middle")
        .attr("font-size", 15).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
        .text("Entropy vs Temperature")

      // Graph axes
      const gxL = graphPanelX + W * 0.02, gxR = graphPanelX + graphPanelW - W * 0.02, gyT = H * 0.14, gyB = H * 0.64
      g.append("line").attr("x1", gxL).attr("y1", gyT).attr("x2", gxL).attr("y2", gyB)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("line").attr("x1", gxL).attr("y1", gyB).attr("x2", gxR).attr("y2", gyB)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)
      g.append("text").attr("x", gxR).attr("y", gyB + 16).attr("text-anchor", "end")
        .attr("font-size", 13).attr("fill", "#94a3b8").attr("font-family", F).text("T")
      g.append("text").attr("x", gxL - 8).attr("y", gyT + 4).attr("text-anchor", "end")
        .attr("font-size", 13).attr("fill", "#94a3b8").attr("font-family", F).text("S")

      // Graph curve (static)
      const gxScale = scaleLinear().domain([0, 100]).range([gxL, gxR])
      const gyScale = scaleLinear().domain([0, 8.5]).range([gyB, gyT])
      const temps = range(0, 101, 2)
      const pathGen = line<number>()
        .x(d => gxScale(d))
        .y(d => {
          const t = d / 100
          const wVal = Math.max(1, Math.exp(t * 8))
          return gyScale(Math.log(wVal))
        })
      g.append("path").attr("d", pathGen(temps) ?? "").attr("fill", "none")
        .attr("stroke", "#1e40af").attr("stroke-width", 2.5)

      // Graph tick labels
      for (const t of [0, 25, 50, 75, 100]) {
        g.append("text").attr("x", gxScale(t)).attr("y", gyB + 16).attr("text-anchor", "middle")
          .attr("font-size", 12).attr("fill", "#94a3b8").attr("font-family", F).text(String(t))
      }

      // Graph dot + drop line (positions set by updateScene)
      g.append("line").attr("class", "graph-drop")
        .attr("stroke", "#ef4444").attr("stroke-width", 1).attr("stroke-dasharray", "4 3")

      const dotGroup = g.append("g").attr("class", "graph-dot-group").style("cursor", "grab")
      dotGroup.append("circle").attr("class", "graph-dot-hit").attr("r", 18).attr("fill", "transparent")
      dotGroup.append("circle").attr("class", "graph-dot").attr("r", 6)
        .attr("fill", "#ef4444").attr("stroke", "white").attr("stroke-width", 2)

      // Temperature slider bar beneath the graph
      const sliderY = H * 0.72
      g.append("line").attr("x1", gxL).attr("y1", sliderY).attr("x2", gxR).attr("y2", sliderY)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 4).attr("stroke-linecap", "round")

      const sliderHandle = g.append("g").attr("class", "temp-slider-handle").style("cursor", "grab")
      sliderHandle.append("rect")
        .attr("x", -15).attr("y", -15).attr("width", 30).attr("height", 30)
        .attr("fill", "transparent")
      sliderHandle.append("circle").attr("class", "slider-thumb").attr("r", 8)
        .attr("fill", "#3b82f6").attr("stroke", "white").attr("stroke-width", 2)
      sliderHandle.append("text").attr("class", "slider-label").attr("y", -14).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#3b82f6")

      // Drag hint
      g.append("text").attr("x", W / 2).attr("y", H - 12).attr("text-anchor", "middle")
        .attr("font-size", 13).attr("font-family", F).attr("fill", "#94a3b8").attr("opacity", 0.6)
        .text("Drag the dot on the graph or the slider to change temperature")

      // ── updateScene: repositions everything from temperature, no React ──
      function updateScene(temp: number) {
        const disordered = computeDisorderedPositions(ORDERED, temp, centerX, centerY, spacing)
        for (let i = 0; i < NUM_PARTICLES; i++) {
          g.select(`.dp-${i}`)
            .attr("cx", disordered[i].x)
            .attr("cy", disordered[i].y)
        }

        const t = temp / 100
        const microstateCount = Math.max(1, Math.round(Math.exp(t * 8)))
        const entropyNorm = Math.log(microstateCount)

        g.select(".w-label").text(`W = ${microstateCount.toLocaleString()}`)
        g.select(".s-label").text(`S = ${entropyNorm.toFixed(3)} kB`)

        const cx = gxScale(temp)
        const cy = gyScale(entropyNorm)

        g.select(".graph-dot-group").attr("transform", `translate(${cx},${cy})`)
        g.select(".graph-drop")
          .attr("x1", cx).attr("y1", cy).attr("x2", cx).attr("y2", gyB)

        const sliderX = gxScale(temp)
        g.select(".temp-slider-handle").attr("transform", `translate(${sliderX},${sliderY})`)
        g.select(".slider-label").text(`T=${temp}`)
      }

      // Expose for external sync
      updateRef.current = updateScene

      // Initial render
      updateScene(liveRef.current.temperature)

      // ── D3 drag — updates SVG directly, syncs React only on end ──

      const tempDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select(".graph-dot").transition().duration(100).attr("r", 8)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newTemp = gxScale.invert(event.x)
          const clamped = Math.max(0, Math.min(100, Math.round(newTemp)))
          liveRef.current.temperature = clamped
          updateScene(clamped)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          select(this).select(".graph-dot").transition().duration(100).attr("r", 6)
          onVarChangeRef.current('temperature', liveRef.current.temperature)
        })

      dotGroup.call(tempDragBehavior)

      const sliderDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select(".slider-thumb").transition().duration(100).attr("r", 10)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newTemp = gxScale.invert(event.x)
          const clamped = Math.max(0, Math.min(100, Math.round(newTemp)))
          liveRef.current.temperature = clamped
          updateScene(clamped)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          select(this).select(".slider-thumb").transition().duration(100).attr("r", 8)
          onVarChangeRef.current('temperature', liveRef.current.temperature)
        })

      sliderHandle.call(sliderDragBehavior)
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
    observer.observe(container)

    return () => {
      observer.disconnect()
      select(container).select("svg").remove()
      updateRef.current = null
    }
  }, []) // ← empty deps: SVG created once, rebuilt only on resize

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}
    />
  )
}
