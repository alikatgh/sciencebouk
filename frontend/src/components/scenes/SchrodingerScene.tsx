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
import { SCENE_STAGE_CLASS } from "./sceneTheme"


const F = "Manrope, sans-serif"
const L_MAX = 2
const OCEAN = "#4f73ff"
const PROB = "#10b981"

export function particleEnergy(n: number, L: number): number {
  return (n * n * Math.PI * Math.PI) / (2 * L * L)
}

/** Map box width L onto a plot whose domain is always [0, L_MAX]. */
export function wallX(L: number, plotLeft: number, plotRight: number): number {
  const t = Math.max(0, Math.min(1, L / L_MAX))
  return plotLeft + t * (plotRight - plotLeft)
}

function scenePalette(dark: boolean) {
  return {
    ink: dark ? "#e2e8f0" : "#1e293b",
    muted: dark ? "#94a3b8" : "#64748b",
    faint: dark ? "#64748b" : "#94a3b8",
    hair: dark ? "#334155" : "#e2e8f0",
    forbidden: dark ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.06)",
    plot: dark ? "rgba(15,23,42,0.35)" : "transparent",
  }
}

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
        const energy = particleEnergy(v.n, v.L)
        return `E_{{\\color{#3b82f6}${v.n}}} = \\frac{{\\color{#3b82f6}${v.n}}^2 \\pi^2 \\hbar^2}{2m \\cdot {\\color{#f59e0b}${v.L.toFixed(1)}}^2} = {\\color{#ef4444}${energy.toFixed(2)}}`
      }}
      buildResultLine={(v) => {
        const energy = particleEnergy(v.n, v.L)
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

  const liveRef = useRef({ n: quantumN, L: wellWidth })
  const draggingRef = useRef(false)
  const updateRef = useRef<((n: number, L: number) => void) | null>(null)
  const playingRef = useRef(true)
  const timeRef = useRef(0)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const updateWaveRef = useRef<((time: number) => void) | null>(null)
  const updatePlayBtnRef = useRef<((isPlaying: boolean) => void) | null>(null)
  const yScaleInvertRef = useRef<((y: number) => number) | null>(null)

  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = { n: quantumN, L: wellWidth }
    updateRef.current?.(quantumN, wellWidth)
  }, [quantumN, wellWidth])

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

      const dark = document.documentElement.classList.contains("dark")
      const pal = scenePalette(dark)
      const compact = W < 500 || H < 430
      const ultraCompact = W < 410 || H < 380
      const fontSizeSm = Math.max(10, Math.min(13, H / 38))

      const pad = Math.max(16, W * 0.028)
      const controlBand = Math.max(40, Math.min(52, H * 0.12))
      const gap = Math.max(16, W * 0.024)
      const energyW = Math.max(132, Math.min(W * 0.28, 240))
      const plotLeft = pad
      const plotRight = W - pad - energyW - gap
      const plotTop = pad + 8
      const plotBottom = H - controlBand
      const energyLeft = plotRight + gap
      const energyRight = W - pad
      const plotMidY = (plotTop + plotBottom) / 2

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Particle in a box — Schrödinger equation visualization")

      const g = svg.append("g")

      g.append("rect")
        .attr("x", plotLeft)
        .attr("y", plotTop)
        .attr("width", plotRight - plotLeft)
        .attr("height", plotBottom - plotTop)
        .attr("fill", pal.plot)

      g.append("rect").attr("class", "forbidden")
        .attr("y", plotTop)
        .attr("height", plotBottom - plotTop)
        .attr("fill", pal.forbidden)

      g.append("line").attr("class", "wall-left")
        .attr("x1", plotLeft).attr("y1", plotTop).attr("x2", plotLeft).attr("y2", plotBottom)
        .attr("stroke", pal.ink).attr("stroke-width", 3)
      g.append("line").attr("class", "wall-right")
        .attr("y1", plotTop).attr("y2", plotBottom)
        .attr("stroke", pal.ink).attr("stroke-width", 3)

      const wallHandle = g.append("g").attr("class", "wall-drag-handle").style("cursor", "ew-resize").style("touch-action", "none")
      wallHandle.append("rect")
        .attr("x", -14).attr("y", plotTop)
        .attr("width", 28).attr("height", plotBottom - plotTop)
        .attr("fill", "transparent")
      wallHandle.append("line")
        .attr("y1", plotTop).attr("y2", plotBottom)
        .attr("stroke", OCEAN).attr("stroke-width", 3).attr("stroke-linecap", "round").attr("opacity", 0)
      wallHandle.append("text").attr("class", "wall-drag-label")
        .attr("y", plotTop - 6).attr("text-anchor", "middle")
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", pal.muted)

      const waveXScale = scaleLinear().domain([0, L_MAX]).range([plotLeft, plotRight])
      const psiYScale = scaleLinear().range([plotBottom, plotTop])
      const probYScale = scaleLinear().range([plotBottom, plotTop])
      const psiPathGen = line<number>().x((point) => waveXScale(point))
      const probAreaGen = d3area<number>().x((point) => waveXScale(point)).y0(plotBottom)
      const probLineGen = line<number>().x((point) => waveXScale(point))
      let waveXs = range(0, liveRef.current.L + 0.001, liveRef.current.L / 200)

      const nHandle = g.append("g").attr("class", "n-drag-handle").style("cursor", "ns-resize").style("touch-action", "none")
      nHandle.append("rect").attr("x", -18).attr("y", -14).attr("width", 36).attr("height", 28).attr("fill", "transparent")
      nHandle.append("circle").attr("r", 5).attr("fill", OCEAN).attr("stroke", "white").attr("stroke-width", 2)

      g.append("text").attr("x", plotLeft + 6).attr("y", plotBottom - 8)
        .attr("text-anchor", "start").attr("font-size", fontSizeSm).attr("fill", pal.muted).attr("font-family", F)
        .text("x = 0")
      g.append("text").attr("class", "wall-right-label").attr("y", plotBottom - 8)
        .attr("text-anchor", "end").attr("font-size", fontSizeSm).attr("fill", pal.muted).attr("font-family", F)

      g.append("line").attr("class", "midline")
        .attr("x1", plotLeft).attr("y1", plotMidY).attr("x2", plotRight).attr("y2", plotMidY)
        .attr("stroke", pal.hair).attr("stroke-width", 1).attr("stroke-dasharray", "4 4")

      g.append("path").attr("class", "prob-area").attr("fill", PROB).attr("opacity", 0.15)
      g.append("path").attr("class", "prob-line").attr("fill", "none").attr("stroke", PROB).attr("stroke-width", 2)
      g.append("path").attr("class", "psi-path").attr("fill", "none").attr("stroke", OCEAN).attr("stroke-width", 2.5)

      const legendY = plotTop + 16
      g.append("line").attr("x1", plotLeft + 10).attr("y1", legendY).attr("x2", plotLeft + 28).attr("y2", legendY)
        .attr("stroke", OCEAN).attr("stroke-width", 2.5)
      g.append("text").attr("x", plotLeft + 32).attr("y", legendY + 4)
        .attr("font-size", fontSizeSm).attr("fill", pal.muted).attr("font-family", F).text(compact ? "\u03C8" : "\u03C8(x, t)")
      g.append("line").attr("x1", plotLeft + 96).attr("y1", legendY).attr("x2", plotLeft + 114).attr("y2", legendY)
        .attr("stroke", PROB).attr("stroke-width", 2)
      g.append("text").attr("x", plotLeft + 118).attr("y", legendY + 4)
        .attr("font-size", fontSizeSm).attr("fill", pal.muted).attr("font-family", F).text(compact ? "|\u03C8|\u00B2" : "|\u03C8(x)|\u00B2")

      g.append("text").attr("x", energyLeft).attr("y", plotTop - 6)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", pal.muted)
        .attr("text-anchor", "start")
        .text(ultraCompact ? "E" : "Energy")

      g.append("line").attr("class", "energy-axis")
        .attr("x1", energyLeft).attr("y1", plotBottom).attr("x2", energyLeft).attr("y2", plotTop)
        .attr("stroke", pal.hair).attr("stroke-width", 1)

      for (let n = 1; n <= 5; n++) {
        g.append("line").attr("class", `elevel-line-${n}`)
          .attr("stroke", pal.faint).attr("stroke-width", 1.5)
        g.append("text").attr("class", `elevel-n-${n}`)
          .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 500).attr("fill", pal.muted)
        g.append("text").attr("class", `elevel-val-${n}`)
          .attr("text-anchor", "end").attr("font-size", fontSizeSm).attr("font-family", F).attr("fill", pal.faint)
      }

      g.append("text").attr("class", "energy-current")
        .attr("x", energyRight).attr("y", plotTop - 6)
        .attr("text-anchor", "end").attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", pal.ink)

      const btnStep = ultraCompact ? 30 : 34
      const btnSize = 28
      const btnY = H - controlBand + 10
      for (let n = 1; n <= 5; n++) {
        const nbg = g.append("g").attr("class", `n-btn-${n}`).style("cursor", "pointer")
          .attr("transform", `translate(${plotLeft + (n - 1) * btnStep}, ${btnY})`)
        nbg.append("rect").attr("class", `n-btn-bg-${n}`).attr("width", btnSize).attr("height", btnSize).attr("rx", 8)
          .attr("fill", "transparent").attr("stroke", pal.hair).attr("stroke-width", 1.5)
        nbg.append("text").attr("x", btnSize / 2).attr("y", 18).attr("text-anchor", "middle")
          .attr("font-size", 12).attr("font-family", F).attr("font-weight", 700).attr("fill", pal.muted)
          .text(String(n))
        nbg.on("click", () => {
          liveRef.current.n = n
          updateGeometry(n, liveRef.current.L)
          onVarChangeRef.current("n", n)
        })
      }
      g.append("text").attr("x", plotLeft).attr("y", btnY - 6)
        .attr("font-size", 11).attr("font-family", F).attr("font-weight", 600).attr("fill", pal.muted)
        .text("n")

      const playW = ultraCompact ? 52 : 64
      const playBtnG = g.append("g").attr("class", "play-btn").style("cursor", "pointer")
        .attr("transform", `translate(${plotLeft + 5 * btnStep + 8}, ${btnY})`)
      playBtnG.append("rect").attr("class", "play-btn-bg").attr("width", playW).attr("height", btnSize).attr("rx", 8)
        .attr("fill", "transparent").attr("stroke", pal.hair).attr("stroke-width", 1.5)
      playBtnG.append("text").attr("class", "play-btn-text").attr("x", playW / 2).attr("y", 18).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", pal.muted)
        .text(sceneCopy.ui.playButton.fullPaused)
      playBtnG.on("click", () => {
        playingRef.current = !playingRef.current
        if (playingRef.current) {
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
        const energy = particleEnergy(n, L)
        const omega = energy * 2

        const psiMax = norm
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
        waveXs = range(0, LVal + 0.001, LVal / 200)

        const energyLevels = range(1, 6).map((n) => ({
          n,
          energy: particleEnergy(n, LVal),
        }))

        const maxE = energyLevels[4].energy
        const yScale = scaleLinear().domain([0, maxE * 1.1]).range([plotBottom - 22, plotTop + 10])
        yScaleInvertRef.current = (y: number) => yScale.invert(y)

        const currentEnergy = particleEnergy(nVal, LVal)
        const rightX = wallX(LVal, plotLeft, plotRight)

        g.select(".wall-right")
          .attr("x1", rightX).attr("x2", rightX)
        g.select(".forbidden")
          .attr("x", rightX)
          .attr("width", Math.max(0, plotRight - rightX))
        g.select(".wall-right-label")
          .attr("x", rightX - 6)
          .text("x = L")
        g.select(".midline").attr("x2", rightX)

        for (const { n, energy } of energyLevels) {
          const y = yScale(energy)
          const isSelected = n === nVal
          g.select(`.elevel-line-${n}`)
            .attr("x1", energyLeft + 8).attr("y1", y)
            .attr("x2", energyRight).attr("y2", y)
            .attr("stroke", isSelected ? OCEAN : pal.faint)
          g.select(`.elevel-n-${n}`)
            .attr("x", energyLeft + 10).attr("y", y - 5)
            .attr("fill", isSelected ? OCEAN : pal.muted)
            .attr("font-weight", isSelected ? 700 : 500)
            .text(`n=${n}`)
          g.select(`.elevel-val-${n}`)
            .attr("x", energyRight).attr("y", y - 5)
            .attr("fill", isSelected ? pal.ink : pal.faint)
            .attr("opacity", compact && !isSelected ? 0 : 1)
            .text(energy.toFixed(1))
        }

        g.select(".wall-drag-handle").attr("transform", `translate(${rightX},0)`)
        g.select(".wall-drag-label").text(`L=${LVal.toFixed(1)}`)

        const currentY = yScale(currentEnergy)
        g.select(".n-drag-handle").attr("transform", `translate(${energyLeft},${currentY})`)

        g.select(".energy-current").text(
          interpolateSceneCopy(sceneCopy.ui.energyLabel.compact, { n: nVal, energy: currentEnergy.toFixed(2) }),
        )

        for (let n = 1; n <= 5; n++) {
          g.select(`.n-btn-bg-${n}`)
            .attr("fill", n === nVal ? OCEAN : "transparent")
            .attr("stroke", n === nVal ? OCEAN : pal.hair)
          g.select(`.n-btn-${n} text`)
            .attr("fill", n === nVal ? "white" : pal.muted)
        }

        updateWaveFunction(timeRef.current)
      }

      function updatePlayBtn(isPlaying: boolean) {
        g.select(".play-btn-bg")
          .attr("fill", isPlaying ? OCEAN : "transparent")
          .attr("stroke", isPlaying ? OCEAN : pal.hair)
        g.select(".play-btn-text")
          .attr("fill", isPlaying ? "white" : pal.muted)
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
        .on("start", () => {
          draggingRef.current = true
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const newL = waveXScale.invert(event.x)
          const clamped = Math.round(Math.max(0.5, Math.min(L_MAX, newL)) * 10) / 10
          liveRef.current.L = clamped
          updateGeometry(liveRef.current.n, clamped)
        })
        .on("end", () => {
          draggingRef.current = false
          onVarChangeRef.current("L", liveRef.current.L)
        })

      wallHandle.call(wallDragBehavior)

      const nDragBehavior = drag<SVGGElement, unknown>()
        .on("start", () => {
          draggingRef.current = true
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const baseEnergy = particleEnergy(1, liveRef.current.L)
          const energy = yScaleInvertRef.current ? yScaleInvertRef.current(event.y) : 0
          const rawN = Math.round(Math.sqrt(Math.max(0, energy) / baseEnergy))
          const clamped = Math.max(1, Math.min(5, rawN))
          liveRef.current.n = clamped
          updateGeometry(clamped, liveRef.current.L)
        })
        .on("end", () => {
          draggingRef.current = false
          onVarChangeRef.current("n", liveRef.current.n)
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
    const scheduleRebuild = () => {
      cancelAnimationFrame(rafRef.current)
      if (rebuildScheduled) return
      rebuildScheduled = true
      requestAnimationFrame(() => { rebuildScheduled = false; buildSVG() })
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w !== currentW || h !== currentH) scheduleRebuild()
    })
    observer.observe(el)

    const themeObserver = new MutationObserver(() => scheduleRebuild())
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => {
      observer.disconnect()
      themeObserver.disconnect()
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
      className={SCENE_STAGE_CLASS}
    />
  )
}
