import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import "d3-transition"
import { range } from "d3-array"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { area as d3area, line } from "d3-shape"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { interpolateSceneCopy, useSceneCopy } from "../../data/sceneCopy"

const F = "Manrope, sans-serif"

const variables: Variable[] = [
  { name: 'n', symbol: 'n', latex: 'n', value: 1, min: 1, max: 5, step: 1, color: VAR_COLORS.primary, description: 'Quantum number (energy level)' },
  { name: 'L', symbol: 'L', latex: 'L', value: 1.0, min: 0.5, max: 2.0, step: 0.1, color: VAR_COLORS.secondary, description: 'Box width' },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'ground-state',
    instruction: lessonCopy["ground-state"].instruction,
    hint: lessonCopy["ground-state"].hint,
    highlightElements: ['n'],
    unlockedVariables: ['n'],
    lockedVariables: ['L'],
    successCondition: { type: 'time_elapsed', duration: 8000 },
    celebration: 'subtle',
    insight: lessonCopy["ground-state"].insight,
  },
  {
    id: 'increase-n',
    instruction: lessonCopy["increase-n"].instruction,
    hint: lessonCopy["increase-n"].hint,
    highlightElements: ['n'],
    unlockedVariables: ['n'],
    lockedVariables: ['L'],
    successCondition: { type: 'variable_changed', target: 'n' },
    celebration: 'subtle',
    insight: lessonCopy["increase-n"].insight,
  },
  {
    id: 'shrink-box',
    instruction: lessonCopy["shrink-box"].instruction,
    hint: lessonCopy["shrink-box"].hint,
    highlightElements: ['L'],
    unlockedVariables: ['n', 'L'],
    successCondition: { type: 'variable_changed', target: 'L' },
    celebration: 'big',
    insight: lessonCopy["shrink-box"].insight,
  },
  ]
}

export function SchrodingerScene(): ReactElement {
  const lessonCopy = useLessonCopy("schrodinger")
  const sceneCopy = useSceneCopy("schrodinger")
  const lessons = buildLessons(lessonCopy)
  return (
    <TeachableEquation
      hook="An electron isn't a tiny ball -- it's a cloud of probability. Confine it more, and it gets MORE energetic."
      hookAction="Change the quantum number and box width to see the wave function change."
      formula="i\\hbar\\frac{\\partial}{\\partial t}\\Psi = H\\Psi,\\; E_{n} = \\frac{{n}^2\\pi^2\\hbar^2}{2m{L}^2}"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const energy = (v.n * v.n * Math.PI * Math.PI) / (2 * v.L * v.L)
        return `E_{{\\color{#3b82f6}${v.n}}} = \\frac{{\\color{#3b82f6}${v.n}}^2 \\pi^2 \\hbar^2}{2m \\cdot {\\color{#f59e0b}${v.L.toFixed(1)}}^2} = {\\color{#ef4444}${energy.toFixed(2)}}`
      }}
      buildResultLine={(v) => {
        const energy = (v.n * v.n * Math.PI * Math.PI) / (2 * v.L * v.L)
        return interpolateSceneCopy(sceneCopy.resultLine.energy, {
          n: v.n,
          energy: energy.toFixed(2),
        })
      }}
      describeResult={(v) => {
        if (v.n === 1) return sceneCopy.description.groundState
        if (v.n >= 4) {
          return interpolateSceneCopy(sceneCopy.description.highlyExcited, { nodes: v.n })
        }
        return interpolateSceneCopy(
          v.n > 2 ? sceneCopy.description.defaultMany : sceneCopy.description.defaultOne,
          { n: v.n, nodes: v.n - 1 },
        )
      }}
      presets={[
        { label: "Ground state", values: { n: 1, L: 1.0 } },
        { label: "Excited (n=3)", values: { n: 3, L: 1.0 } },
        { label: "Tight box", values: { n: 1, L: 0.5 } },
      ]}
    >
      {({ vars, setVar }) => (
        <D3SchrodingerVisual
          quantumN={vars.n}
          wellWidth={vars.L}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface D3SchrodingerVisualProps {
  quantumN: number
  wellWidth: number
  onVarChange: (name: string, value: number) => void
}

function D3SchrodingerVisual({ quantumN, wellWidth, onVarChange }: D3SchrodingerVisualProps): ReactElement {
  const sceneCopy = useSceneCopy("schrodinger")
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  // Live values during drag — bypasses React render cycle for 60fps SVG
  const liveRef = useRef({ n: quantumN, L: wellWidth })
  const draggingRef = useRef(false)

  // Store the geometry update function so external effects can call it
  const updateRef = useRef<((n: number, L: number) => void) | null>(null)

  // Animation state — all in refs so the animation loop never needs React deps
  const playingRef = useRef(true)
  const timeRef = useRef(0)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Store the wave-only update function for the animation loop
  const updateWaveRef = useRef<((time: number) => void) | null>(null)

  // Store the play/pause visual update function
  const updatePlayBtnRef = useRef<((isPlaying: boolean) => void) | null>(null)

  // yScale invert ref so the drag handler can use accurate energy→n mapping
  // Updated inside updateGeometry on every geometry rebuild
  const yScaleInvertRef = useRef<((y: number) => number) | null>(null)

  // Sync React props -> SVG when not dragging (handles presets, lesson steps)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = { n: quantumN, L: wellWidth }
    updateRef.current?.(quantumN, wellWidth)
  }, [quantumN, wellWidth])

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
      if (H < 100) return
      currentW = W
      currentH = H

      // Wave plot dimensions — proportional to container W/H
      const wavePlotLeft = W * 0.07
      const wavePlotRight = W * 0.58
      const wavePlotTop = H * 0.19
      const wavePlotBottom = H * 0.72
      const wavePlotMidY = (wavePlotTop + wavePlotBottom) / 2

      // Energy diagram dimensions — proportional to container W/H
      const energyLeft = W * 0.63
      const energyRight = W * 0.93
      const energyTop = H * 0.19
      const energyBottom = H * 0.72

      const compact = W < 500 || H < 430
      const ultraCompact = W < 410 || H < 380
      const fontSize = Math.max(12, Math.min(18, H / 28))
      const fontSizeSm = Math.max(10, Math.min(15, H / 32))

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Particle in a Box -- Schrodinger equation visualization")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#f8fbff")

      const g = svg.append("g")

      // Title
      g.append("text").attr("x", W / 2).attr("y", H * 0.07).attr("text-anchor", "middle")
        .attr("font-size", Math.max(14, Math.min(22, H / 22))).attr("fill", "#1e293b").attr("font-family", "Newsreader, serif").attr("font-weight", 700)
        .text(compact ? "Quantum Box" : "Particle in a Box")

      // Wave function plot background
      const wavePad = W * 0.012
      g.append("rect").attr("class", "wave-bg")
        .attr("x", wavePlotLeft - wavePad).attr("y", wavePlotTop - wavePad * 1.6).attr("width", wavePlotRight - wavePlotLeft + wavePad * 2).attr("height", wavePlotBottom - wavePlotTop + wavePad * 3.2)
        .attr("rx", 16).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)

      // Potential walls
      g.append("line").attr("class", "wall-left")
        .attr("x1", wavePlotLeft).attr("y1", wavePlotTop).attr("x2", wavePlotLeft).attr("y2", wavePlotBottom)
        .attr("stroke", "#1e293b").attr("stroke-width", 4)
      g.append("line").attr("class", "wall-right")
        .attr("x1", wavePlotRight).attr("y1", wavePlotTop).attr("x2", wavePlotRight).attr("y2", wavePlotBottom)
        .attr("stroke", "#1e293b").attr("stroke-width", 4)

      // Draggable right wall handle
      const wallHandle = g.append("g").attr("class", "wall-drag-handle").style("cursor", "ew-resize").style("touch-action", "none")
      wallHandle.append("rect")
        .attr("x", -15).attr("y", wavePlotTop)
        .attr("width", 30).attr("height", wavePlotBottom - wavePlotTop)
        .attr("fill", "transparent")
      wallHandle.append("line")
        .attr("y1", wavePlotTop).attr("y2", wavePlotBottom)
        .attr("stroke", "#f59e0b").attr("stroke-width", 6).attr("stroke-linecap", "round").attr("opacity", 0.5)
      wallHandle.append("text").attr("class", "wall-drag-label")
        .attr("y", wavePlotTop - 8).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#f59e0b")
        .text(ultraCompact ? "L" : "drag L")

      const wallXScale = scaleLinear().domain([0.5, 2.0]).range([
        wavePlotLeft + (wavePlotRight - wavePlotLeft) * 0.25,
        wavePlotLeft + (wavePlotRight - wavePlotLeft) * 1.0,
      ])
      const waveXScale = scaleLinear().range([wavePlotLeft, wavePlotRight])
      const psiYScale = scaleLinear().range([wavePlotBottom, wavePlotTop])
      const probYScale = scaleLinear().range([wavePlotBottom, wavePlotTop])
      const psiPathGen = line<number>().x((point) => waveXScale(point))
      const probAreaGen = d3area<number>().x((point) => waveXScale(point)).y0(wavePlotBottom)
      const probLineGen = line<number>().x((point) => waveXScale(point))
      let waveXs = range(0, liveRef.current.L + 0.001, liveRef.current.L / 200)

      // Draggable quantum number handle on energy diagram
      const nHandle = g.append("g").attr("class", "n-drag-handle").style("cursor", "ns-resize").style("touch-action", "none")
      nHandle.append("rect")
        .attr("x", -20).attr("y", -15).attr("width", 40).attr("height", 30)
        .attr("fill", "transparent")
      nHandle.append("circle").attr("r", 8)
        .attr("fill", "#3b82f6").attr("stroke", "white").attr("stroke-width", 2)
      nHandle.append("text").attr("class", "n-handle-label")
        .attr("x", 16).attr("y", 4)
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 700).attr("fill", "#3b82f6")

      // Wall labels
      g.append("text").attr("x", wavePlotLeft).attr("y", wavePlotBottom + H * 0.047)
        .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("fill", "#64748b").attr("font-family", F).text(ultraCompact ? "0" : "x=0")
      g.append("text").attr("class", "wall-right-label").attr("y", wavePlotBottom + H * 0.047)
        .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("fill", "#64748b").attr("font-family", F).text(ultraCompact ? "L" : "x=L")

      // Midline
      g.append("line").attr("class", "midline")
        .attr("x1", wavePlotLeft).attr("y1", wavePlotMidY).attr("x2", wavePlotRight).attr("y2", wavePlotMidY)
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1).attr("stroke-dasharray", "4 4")

      // Probability area
      g.append("path").attr("class", "prob-area").attr("fill", "#10b981").attr("opacity", 0.15)

      // Probability line
      g.append("path").attr("class", "prob-line").attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 2)

      // Wave function path
      g.append("path").attr("class", "psi-path").attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 3)

      // Legend
      const legendOff1 = W * 0.012
      const legendOff2 = W * 0.045
      const legendOff3 = W * 0.05
      const legendOff4 = W * 0.135
      const legendOff5 = W * 0.17
      const legendOff6 = W * 0.175
      g.append("line").attr("x1", wavePlotLeft + legendOff1).attr("y1", wavePlotTop - 6).attr("x2", wavePlotLeft + legendOff2).attr("y2", wavePlotTop - 6)
        .attr("stroke", "#3b82f6").attr("stroke-width", 3)
      g.append("text").attr("x", wavePlotLeft + legendOff3).attr("y", wavePlotTop - 2)
        .attr("font-size", fontSizeSm).attr("fill", "#3b82f6").attr("font-family", F).attr("font-weight", 600).text(compact ? "\u03C8" : "\u03C8(x,t)")
      g.append("line").attr("x1", wavePlotLeft + legendOff4).attr("y1", wavePlotTop - 6).attr("x2", wavePlotLeft + legendOff5).attr("y2", wavePlotTop - 6)
        .attr("stroke", "#10b981").attr("stroke-width", 2)
      g.append("text").attr("x", wavePlotLeft + legendOff6).attr("y", wavePlotTop - 2)
        .attr("font-size", fontSizeSm).attr("fill", "#10b981").attr("font-family", F).attr("font-weight", 600).text(ultraCompact ? "P" : compact ? "|\u03C8|\u00B2" : "|\u03C8(x)|\u00B2")

      // Energy level diagram background
      const ePad = W * 0.012
      g.append("rect")
        .attr("x", energyLeft - ePad).attr("y", energyTop - ePad * 1.6).attr("width", energyRight - energyLeft + ePad * 2).attr("height", energyBottom - energyTop + ePad * 3.2)
        .attr("rx", 16).attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)

      g.append("text").attr("x", (energyLeft + energyRight) / 2).attr("y", energyTop - 2)
        .attr("text-anchor", "middle").attr("font-size", fontSize).attr("fill", "#1e293b").attr("font-family", F).attr("font-weight", 700)
        .text(ultraCompact ? "E" : compact ? "Levels" : "Energy Levels")

      // Energy axis
      const eAxisOff = W * 0.012
      g.append("line").attr("class", "energy-axis")
        .attr("x1", energyLeft + eAxisOff).attr("y1", energyBottom).attr("x2", energyLeft + eAxisOff).attr("y2", energyTop + H * 0.023)
        .attr("stroke", "#cbd5e1").attr("stroke-width", 1.5)

      // Energy level lines + labels (5 levels)
      for (let n = 1; n <= 5; n++) {
        g.append("line").attr("class", `elevel-line-${n}`)
          .attr("stroke", "#94a3b8").attr("stroke-width", 1.5)
        g.append("text").attr("class", `elevel-n-${n}`)
          .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 500).attr("fill", "#64748b")
        g.append("text").attr("class", `elevel-val-${n}`)
          .attr("text-anchor", "end").attr("font-size", fontSizeSm).attr("font-family", F).attr("fill", "#94a3b8")
        g.append("circle").attr("class", `elevel-dot-${n}`)
          .attr("r", Math.max(3, W * 0.006)).attr("fill", "#ef4444").attr("opacity", 0)
      }

      // Values panel
      const vpX = W * 0.47
      const vpY = H * 0.81
      const vpW = W * 0.51
      const vpH = H * 0.19
      g.append("rect").attr("class", "values-bg")
        .attr("x", vpX).attr("y", vpY).attr("width", vpW).attr("height", vpH).attr("rx", 14)
        .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      g.append("text").attr("class", "val-n-label")
        .attr("x", vpX + vpW * 0.04).attr("y", vpY + vpH * 0.32).attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#1e293b")
      g.append("text").attr("class", "val-L-label")
        .attr("x", vpX + vpW * 0.39).attr("y", vpY + vpH * 0.32).attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 600).attr("fill", "#1e293b")
      g.append("text").attr("class", "val-energy-label")
        .attr("x", vpX + vpW * 0.04).attr("y", vpY + vpH * 0.75).attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#ef4444")

      // D3 buttons inside SVG: quantum number selector + play/pause
      const btnStep = ultraCompact ? 29 : compact ? 32 : 36
      const btnWidth = ultraCompact ? 24 : compact ? 26 : 30
      const playButtonWidth = ultraCompact ? 50 : compact ? 58 : 70
      const btnBaseY = H - 38
      for (let n = 1; n <= 5; n++) {
        const nbg = g.append("g").attr("class", `n-btn-${n}`).style("cursor", "pointer")
          .attr("transform", `translate(${14 + (n - 1) * btnStep}, ${btnBaseY})`)
        nbg.append("rect").attr("class", `n-btn-bg-${n}`).attr("width", btnWidth).attr("height", 26).attr("rx", 8)
          .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
        nbg.append("text").attr("x", btnWidth / 2).attr("y", 17).attr("text-anchor", "middle")
          .attr("font-size", 12).attr("font-family", F).attr("font-weight", 700).attr("fill", "#64748b")
          .text(String(n))
        nbg.on("click", () => {
          liveRef.current.n = n
          updateGeometry(n, liveRef.current.L)
          onVarChangeRef.current('n', n)
        })
      }

      // n label
      g.append("text").attr("x", 14).attr("y", btnBaseY - 6)
        .attr("font-size", 11).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text(ultraCompact ? "n" : "n:")

      // Play/pause button
      const playBtnG = g.append("g").attr("class", "play-btn").style("cursor", "pointer")
        .attr("transform", `translate(${14 + 5 * btnStep + 10}, ${btnBaseY})`)
      playBtnG.append("rect").attr("class", "play-btn-bg").attr("width", playButtonWidth).attr("height", 26).attr("rx", 13)
        .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      playBtnG.append("text").attr("class", "play-btn-text").attr("x", playButtonWidth / 2).attr("y", 17).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text(
          ultraCompact
            ? sceneCopy.ui.playButton.ultraCompactPaused
            : compact
              ? sceneCopy.ui.playButton.compactPlaying
              : sceneCopy.ui.playButton.fullPlaying,
        )
      playBtnG.on("click", () => {
        playingRef.current = !playingRef.current
        if (playingRef.current) {
          // Cancel any previous loop before starting a new one
          cancelAnimationFrame(rafRef.current)
          lastTimeRef.current = 0
          rafRef.current = requestAnimationFrame(animateLoop)
        }
        updatePlayBtn(playingRef.current)
      })

      // ── updateWaveFunction: updates wave paths from current n, L, time ──
      function updateWaveFunction(time: number) {
        const n = liveRef.current.n
        const L = liveRef.current.L

        const norm = Math.sqrt(2 / L)
        const energy = (n * n * Math.PI * Math.PI) / (2 * L * L)
        const omega = energy * 2

        const psiMax = norm
        waveXScale.domain([0, L])
        psiYScale.domain([-psiMax * 1.1, psiMax * 1.1])
        probYScale.domain([0, psiMax * psiMax * 1.1])

        // Wave function path (time-dependent)
        const psiPath = psiPathGen
          .y((point) => {
            const spatial = norm * Math.sin((n * Math.PI * point) / L)
            const temporal = Math.cos(omega * time)
            return psiYScale(spatial * temporal)
          })(waveXs) ?? ""

        g.select(".psi-path").attr("d", psiPath)

        // Probability density (time-independent)
        const probAreaPath = probAreaGen
          .y1((point) => {
            const spatial = norm * Math.sin((n * Math.PI * point) / L)
            return probYScale(spatial * spatial)
          })(waveXs) ?? ""

        g.select(".prob-area").attr("d", probAreaPath)

        const probLinePath = probLineGen
          .y((point) => {
            const spatial = norm * Math.sin((n * Math.PI * point) / L)
            return probYScale(spatial * spatial)
          })(waveXs) ?? ""

        g.select(".prob-line").attr("d", probLinePath)
      }

      // ── updateGeometry: repositions all static elements from n, L WITHOUT React ──
      function updateGeometry(nVal: number, LVal: number) {
        const dur = 160
        waveXs = range(0, LVal + 0.001, LVal / 200)

        const energyLevels = range(1, 6).map(n => ({
          n,
          energy: (n * n * Math.PI * Math.PI) / (2 * LVal * LVal),
        }))

        const maxE = energyLevels[4].energy
        const yScale = scaleLinear().domain([0, maxE * 1.1]).range([energyBottom, energyTop + H * 0.023])
        yScaleInvertRef.current = (y: number) => yScale.invert(y)

        const currentEnergy = (nVal * nVal * Math.PI * Math.PI) / (2 * LVal * LVal)

        // Update wall-right label position
        g.select(".wall-right-label").attr("x", wavePlotRight)

        // Energy levels
        for (const { n, energy } of energyLevels) {
          const y = yScale(energy)
          const isSelected = n === nVal

          const eW = energyRight - energyLeft
          g.select(`.elevel-line-${n}`)
            .transition().duration(dur)
            .attr("x1", energyLeft + eW * 0.077).attr("y1", y)
            .attr("x2", energyRight - eW * 0.077).attr("y2", y)
            .attr("stroke", isSelected ? "#ef4444" : "#94a3b8")
            .attr("stroke-width", isSelected ? 3 : 1.5)

          g.select(`.elevel-n-${n}`)
            .transition().duration(dur)
            .attr("x", energyLeft + eW * 0.038).attr("y", y - 6)
            .attr("fill", isSelected ? "#ef4444" : "#64748b")
            .attr("font-weight", isSelected ? 700 : 500)
            .text(ultraCompact ? `n${n}` : `n=${n}`)

          g.select(`.elevel-val-${n}`)
            .transition().duration(dur)
            .attr("x", energyRight - eW * 0.038).attr("y", y - 6)
            .attr("fill", isSelected ? "#ef4444" : "#94a3b8")
            .attr("opacity", (compact || ultraCompact) && !isSelected ? 0 : 1)
            .text(energy.toFixed(1))

          g.select(`.elevel-dot-${n}`)
            .transition().duration(dur)
            .attr("cx", energyLeft + eW * 0.062).attr("cy", y)
            .attr("opacity", isSelected ? 1 : 0)
        }

        // Position wall drag handle at the right wall
        const wallX = wallXScale(LVal)
        g.select(".wall-drag-handle").transition().duration(dur)
          .attr("transform", `translate(${wallX},0)`)
        g.select(".wall-drag-label").text(ultraCompact ? `L ${LVal.toFixed(1)}` : `L=${LVal.toFixed(1)}`)

        // Position n drag handle at current energy level
        const currentY = yScale(currentEnergy)
        g.select(".n-drag-handle").transition().duration(dur)
          .attr("transform", `translate(${energyLeft + (energyRight - energyLeft) * 0.062},${currentY})`)
        g.select(".n-handle-label").text(ultraCompact ? `n${nVal}` : `n=${nVal}`)

        // Values panel
        g.select(".val-n-label").text(ultraCompact ? `n ${nVal}` : `n = ${nVal}`)
        g.select(".val-L-label").text(ultraCompact ? `L ${LVal.toFixed(1)}` : `L = ${LVal.toFixed(1)}`)
        g.select(".val-energy-label").text(
          ultraCompact || compact
            ? interpolateSceneCopy(sceneCopy.ui.energyLabel.compact, { n: nVal, energy: currentEnergy.toFixed(2) })
            : interpolateSceneCopy(sceneCopy.ui.energyLabel.full, { n: nVal, energy: currentEnergy.toFixed(2) }),
        )

        // Update D3 quantum number button appearances
        for (let n = 1; n <= 5; n++) {
          g.select(`.n-btn-bg-${n}`)
            .attr("fill", n === nVal ? "#4f73ff" : "white")
            .attr("stroke", n === nVal ? "#4f73ff" : "#e2e8f0")
          g.select(`.n-btn-${n} text`)
            .attr("fill", n === nVal ? "white" : "#64748b")
        }

        // Also update wave immediately (for static/paused state)
        updateWaveFunction(timeRef.current)
      }

      // ── updatePlayBtn: toggles play/pause button visuals ──
      function updatePlayBtn(isPlaying: boolean) {
        g.select(".play-btn-bg")
          .attr("fill", isPlaying ? "#059669" : "white")
          .attr("stroke", isPlaying ? "#059669" : "#e2e8f0")
        g.select(".play-btn-text")
          .attr("fill", isPlaying ? "white" : "#64748b")
          .text(
            ultraCompact
              ? (isPlaying ? sceneCopy.ui.playButton.ultraCompactPlaying : sceneCopy.ui.playButton.ultraCompactPaused)
              : compact
                ? (isPlaying ? sceneCopy.ui.playButton.compactPlaying : sceneCopy.ui.playButton.compactPaused)
                : (isPlaying ? sceneCopy.ui.playButton.fullPlaying : sceneCopy.ui.playButton.fullPaused),
          )
      }

      // ── D3 drag — updates SVG directly, syncs React only on end ──

      const wallDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).select("line").transition().duration(100).attr("opacity", 0.8).attr("stroke-width", 8)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newL = wallXScale.invert(event.x)
          const clamped = Math.round(Math.max(0.5, Math.min(2.0, newL)) * 10) / 10
          liveRef.current.L = clamped
          updateGeometry(liveRef.current.n, clamped)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).select("line").transition().duration(100).attr("opacity", 0.5).attr("stroke-width", 6)
          onVarChangeRef.current('L', liveRef.current.L)
        })

      wallHandle.call(wallDragBehavior)

      const nDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).select("circle").transition().duration(100).attr("r", 10)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          // Map y position to energy via yScale.invert, then compute n = round(sqrt(E / E1))
          const baseEnergy = (Math.PI * Math.PI) / (2 * liveRef.current.L * liveRef.current.L)
          const energy = yScaleInvertRef.current ? yScaleInvertRef.current(event.y) : 0
          const rawN = Math.round(Math.sqrt(Math.max(0, energy) / baseEnergy))
          const clamped = Math.max(1, Math.min(5, rawN))
          liveRef.current.n = clamped
          updateGeometry(clamped, liveRef.current.L)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).select("circle").transition().duration(100).attr("r", 8)
          onVarChangeRef.current('n', liveRef.current.n)
        })

      nHandle.call(nDragBehavior)

      // ── Animation loop — reads from refs, never torn down by React state ──
      function animateLoop(t: number) {
        if (!playingRef.current) return
        if (lastTimeRef.current === 0) lastTimeRef.current = t
        const dt = (t - lastTimeRef.current) / 1000
        lastTimeRef.current = t
        timeRef.current += dt
        updateWaveFunction(timeRef.current)
        rafRef.current = requestAnimationFrame(animateLoop)
      }

      // Expose functions via refs for external access
      updateRef.current = updateGeometry
      updateWaveRef.current = updateWaveFunction
      updatePlayBtnRef.current = updatePlayBtn

      // Initial render
      updateGeometry(liveRef.current.n, liveRef.current.L)
      updatePlayBtn(playingRef.current)

      // Start animation
      if (playingRef.current) {
        lastTimeRef.current = 0
        rafRef.current = requestAnimationFrame(animateLoop)
      }
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
          requestAnimationFrame(() => { rebuildScheduled = false; buildSVG() })
        }
      }
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
      select(el).select("svg").remove()
      updateRef.current = null
      updateWaveRef.current = null
      updatePlayBtnRef.current = null
    }
  }, [sceneCopy]) // Rebuild SVG labels when localized scene copy changes.

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
