import type { ReactElement } from "react"
import { useEffect, useRef, useState } from "react"
import "d3-transition"
import { range } from "d3-array"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select, type Selection } from "d3-selection"
import { curveBasis, line } from "d3-shape"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { getLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useContainerSize } from "../../hooks/useContainerSize"

const F = "Manrope, sans-serif"

type Vec2 = [number, number]

interface Charge {
  x: number
  y: number
  sign: 1 | -1
  id: number
}

function eField(px: number, py: number, charges: Charge[]): Vec2 {
  let ex = 0
  let ey = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const r2 = dx * dx + dy * dy
    const r = Math.sqrt(r2)
    if (r < 15) continue
    const strength = c.sign / (r2 + 100)
    ex += strength * dx / r
    ey += strength * dy / r
  }
  return [ex, ey]
}

function traceFieldLine(
  startX: number,
  startY: number,
  charges: Charge[],
  direction: 1 | -1,
  maxSteps: number = 300,
  W: number = 900,
  H: number = 440,
): Vec2[] {
  const points: Vec2[] = [[startX, startY]]
  let x = startX
  let y = startY
  const stepSize = 5

  for (let i = 0; i < maxSteps; i++) {
    const [ex, ey] = eField(x, y, charges)
    const mag = Math.sqrt(ex * ex + ey * ey)
    if (mag < 0.00001) break

    x += direction * (ex / mag) * stepSize
    y += direction * (ey / mag) * stepSize

    if (x < 30 || x > W - 30 || y < 30 || y > H - 30) break

    let hitCharge = false
    for (const c of charges) {
      const dx = x - c.x
      const dy = y - c.y
      if (dx * dx + dy * dy < 400) {
        hitCharge = true
        break
      }
    }
    if (hitCharge) {
      points.push([x, y])
      break
    }

    points.push([x, y])
  }

  return points
}

const variables: Variable[] = [
  { name: 'wavelength', symbol: '\u03BB', latex: '\\lambda', value: 120, min: 60, max: 300, step: 5, color: VAR_COLORS.primary, unit: 'px', description: 'Wavelength of EM wave' },
]

const lessonCopy = getLessonCopy("maxwell")

const lessons: LessonStep[] = [
  {
    id: 'field-lines',
    instruction: lessonCopy["field-lines"].instruction,
    hint: lessonCopy["field-lines"].hint,
    highlightElements: [],
    unlockedVariables: ['wavelength'],
    successCondition: { type: 'time_elapsed', duration: 10000 },
    celebration: 'subtle',
    insight: lessonCopy["field-lines"].insight,
  },
  {
    id: 'em-wave',
    instruction: lessonCopy["em-wave"].instruction,
    hint: lessonCopy["em-wave"].hint,
    highlightElements: ['wavelength'],
    unlockedVariables: ['wavelength'],
    successCondition: { type: 'time_elapsed', duration: 12000 },
    celebration: 'subtle',
    insight: lessonCopy["em-wave"].insight,
  },
  {
    id: 'wavelength',
    instruction: lessonCopy.wavelength.instruction,
    hint: lessonCopy.wavelength.hint,
    highlightElements: ['wavelength'],
    unlockedVariables: ['wavelength'],
    successCondition: { type: 'variable_changed', target: 'wavelength' },
    celebration: 'big',
    insight: lessonCopy.wavelength.insight,
  },
]

export function MaxwellScene(): ReactElement {
  return (
    <TeachableEquation
      hook="How does your WiFi signal get through walls? An electric field shaking back and forth launches a wave that travels at the speed of light."
      hookAction="Place charges and watch electromagnetic field lines appear."
      formula="\\nabla\\times\\mathbf{E}=-\\frac{\\partial \\mathbf{B}}{\\partial t},\\;c=\\frac{{\\lambda}}{T}"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const freq = (3e8 / (v.wavelength * 1e-9)).toExponential(1)
        return `c = {\\color{#3b82f6}${v.wavelength}\\text{nm}} \\cdot {\\color{#f59e0b}${freq}\\text{Hz}}`
      }}
      buildResultLine={(v) => {
        return `\\lambda = ${v.wavelength} \\;\\text{px}`
      }}
      describeResult={(v) => {
        if (v.wavelength < 80) return "Short wavelength -- high energy, like X-rays"
        if (v.wavelength > 180) return "Long wavelength -- low energy, like radio waves"
        return "Medium wavelength -- visible light range"
      }}
      presets={[
        { label: "Short (X-ray)", values: { wavelength: 60 } },
        { label: "Medium (visible)", values: { wavelength: 120 } },
        { label: "Long (radio)", values: { wavelength: 220 } },
      ]}
    >
      {({ vars, setVar }) => (
        <D3MaxwellVisual
          wavelength={vars.wavelength}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface Props {
  wavelength: number
  onVarChange: (name: string, value: number) => void
}

function D3MaxwellVisual({ wavelength, onVarChange }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)
  const gRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  const [mode, setMode] = useState<1 | 2>(1)
  const modeRef = useRef<1 | 2>(1)
  modeRef.current = mode

  const chargesRef = useRef<Charge[]>([])
  const currentSizeRef = useRef({ w: 0, h: 0 })
  const wavelengthRef = useRef(wavelength)
  wavelengthRef.current = wavelength

  const timeRef = useRef(0)
  const rafRef = useRef(0)
  const prevTsRef = useRef(0)
  const runningRef = useRef(false)

  // Setup -- rebuilds on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container || W < 100 || H < 100) return

    const prevW = currentSizeRef.current.w
    const prevH = currentSizeRef.current.h
    currentSizeRef.current = { w: W, h: H }

    select(container).select("svg").remove()

    // On first build use default positions; on resize scale existing positions proportionally
    if (chargesRef.current.length === 0 || prevW === 0 || prevH === 0) {
      chargesRef.current = [
        { x: Math.round(W * 0.36), y: Math.round(H * 0.48), sign: 1, id: 1 },
        { x: Math.round(W * 0.64), y: Math.round(H * 0.48), sign: -1, id: 2 },
      ]
    } else {
      chargesRef.current = chargesRef.current.map(ch => ({
        ...ch,
        x: Math.round(ch.x * (W / prevW)),
        y: Math.round(ch.y * (H / prevH)),
      }))
    }

    const fs = Math.max(12, Math.min(18, H / 28))

    const svg = select(container)
      .append("svg")
      .attr("width", W)
      .attr("height", H)
      .style("display", "block")
      .attr("role", "img")
      .attr("aria-label", "Maxwell's equations -- electric field lines and EM waves")

    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

    const g = svg.append("g")
    gRef.current = g

    // Mode toggle buttons — adapt labels to available width
    const compact = W < 760
    const ultraCompact = W < 520 || H < 380
    const btn1Label = ultraCompact ? "Field" : compact ? "Field Lines" : "Electric Field Lines"
    const btn2Label = ultraCompact ? "Wave" : "EM Wave"
    const btnGap = Math.round(W * 0.012)
    const btnY = Math.round(H * 0.027)
    const btnH = Math.max(24, Math.round(H * 0.068))
    const btn1W = ultraCompact ? Math.round(W * 0.12) : compact ? Math.round(W * 0.14) : Math.round(W * 0.167)
    const btn1X = Math.round(W * 0.044)
    const btn2W = ultraCompact ? Math.round(W * 0.11) : compact ? Math.round(W * 0.14) : Math.round(W * 0.133)
    const btn2X = btn1X + btn1W + btnGap

    const btn1 = g.append("g").attr("class", "btn-field").style("cursor", "pointer")
    btn1.append("rect").attr("class", "btn1-bg").attr("x", btn1X).attr("y", btnY).attr("width", btn1W).attr("height", btnH).attr("rx", 8)
    btn1.append("text").attr("class", "btn1-txt").attr("x", btn1X + btn1W / 2).attr("y", btnY + btnH * 0.67).attr("text-anchor", "middle")
      .attr("font-size", fs).attr("font-family", F)
      .text(btn1Label)
    btn1.on("click", () => setMode(1))

    const btn2 = g.append("g").attr("class", "btn-wave").style("cursor", "pointer")
    btn2.append("rect").attr("class", "btn2-bg").attr("x", btn2X).attr("y", btnY).attr("width", btn2W).attr("height", btnH).attr("rx", 8)
    btn2.append("text").attr("class", "btn2-txt").attr("x", btn2X + btn2W / 2).attr("y", btnY + btnH * 0.67).attr("text-anchor", "middle")
      .attr("font-size", fs).attr("font-family", F)
      .text(btn2Label)
    btn2.on("click", () => setMode(2))

    // Field mode group
    g.append("g").attr("class", "field-mode")
    // Wave mode group
    g.append("g").attr("class", "wave-mode")

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      select(container).select("svg").remove()
    }
  }, [W, H])

  // Rebuild scene content when mode changes
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    // Update button styling
    g.select(".btn1-bg")
      .attr("fill", mode === 1 ? "#1e40af" : "#f1f5f9")
      .attr("stroke", mode === 1 ? "#1e40af" : "#cbd5e1").attr("stroke-width", 1.5)
    g.select(".btn1-txt")
      .attr("font-weight", mode === 1 ? 700 : 600)
      .attr("fill", mode === 1 ? "#ffffff" : "#475569")
    g.select(".btn2-bg")
      .attr("fill", mode === 2 ? "#1e40af" : "#f1f5f9")
      .attr("stroke", mode === 2 ? "#1e40af" : "#cbd5e1").attr("stroke-width", 1.5)
    g.select(".btn2-txt")
      .attr("font-weight", mode === 2 ? 700 : 600)
      .attr("fill", mode === 2 ? "#ffffff" : "#475569")

    // Clear both mode groups
    g.select(".field-mode").selectAll("*").remove()
    g.select(".wave-mode").selectAll("*").remove()

    runningRef.current = false
    cancelAnimationFrame(rafRef.current)

    if (mode === 1) {
      buildFieldMode(g)
    } else {
      buildWaveMode(g)
    }

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [mode, W, H])

  // Update field lines when charges move (mode 1 only, triggered by redrawFieldLines)
  function buildFieldMode(g: Selection<SVGGElement, unknown, null, undefined>) {
    const fm = g.select(".field-mode")
    const compact = W < 580
    const ultraCompact = W < 430 || H < 360

    // Field lines group
    fm.append("g").attr("class", "field-lines")
    // Charges group
    fm.append("g").attr("class", "charges-group")

    // Hint text
    const hintFs = Math.max(11, Math.min(14, H / 32))
    fm.append("text").attr("x", Math.round(W * 0.044)).attr("y", H - 20)
      .attr("font-size", hintFs).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
      .text(ultraCompact ? "Move" : compact ? "Move charges" : "Drag charges to reposition")

    // Legend
    fm.append("circle").attr("cx", Math.round(W * 0.467)).attr("cy", Math.round(H * 0.059)).attr("r", 5).attr("fill", "#1e40af")
    fm.append("text").attr("x", Math.round(W * 0.48)).attr("y", Math.round(H * 0.068))
      .attr("font-size", hintFs).attr("font-family", F).attr("fill", "#64748b")
      .text(ultraCompact ? "lines" : compact ? "field lines" : "E field lines (gray)")

    drawFieldScene(g)
  }

  function drawFieldScene(g: Selection<SVGGElement, unknown, null, undefined>) {
    const fm = g.select(".field-mode")
    const charges = chargesRef.current

    // Field lines
    const fieldLines: Vec2[][] = []
    const numLines = 14
    for (const c of charges) {
      if (c.sign === 1) {
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * 2 * Math.PI
          const sx = c.x + Math.cos(angle) * 20
          const sy = c.y + Math.sin(angle) * 20
          const traced = traceFieldLine(sx, sy, charges, 1, 300, W, H)
          if (traced.length > 2) fieldLines.push(traced)
        }
      }
    }
    if (!charges.some(c => c.sign === 1)) {
      for (const c of charges) {
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * 2 * Math.PI
          const sx = c.x + Math.cos(angle) * 20
          const sy = c.y + Math.sin(angle) * 20
          const traced = traceFieldLine(sx, sy, charges, -1, 300, W, H)
          if (traced.length > 2) fieldLines.push(traced)
        }
      }
    }

    const flGroup = fm.select(".field-lines")
    flGroup.selectAll("*").remove()
    for (const pts of fieldLines) {
      const pathD = pts.map((p, j) => `${j === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
      flGroup.append("path").attr("d", pathD).attr("fill", "none")
        .attr("stroke", "#94a3b8").attr("stroke-width", 1.5).attr("opacity", 0.7)
    }

    // Charges
    const cGroup = fm.select(".charges-group")
    cGroup.selectAll("*").remove()

    for (const c of charges) {
      const cg = cGroup.append("g").style("cursor", "grab").style("touch-action", "none")

      // Glow ring (hidden by default)
      cg.append("circle").attr("class", `glow-${c.id}`)
        .attr("cx", c.x).attr("cy", c.y).attr("r", 30).attr("fill", "none")
        .attr("stroke", c.sign === 1 ? "#ef4444" : "#1e40af")
        .attr("stroke-width", 2.5).attr("stroke-dasharray", "6 4").attr("opacity", 0)

      // Charge circle
      cg.append("circle")
        .attr("cx", c.x).attr("cy", c.y).attr("r", 18)
        .attr("fill", c.sign === 1 ? "#fecaca" : "#bfdbfe")
        .attr("stroke", c.sign === 1 ? "#ef4444" : "#1e40af")
        .attr("stroke-width", 3)

      // Hit area
      cg.append("circle")
        .attr("cx", c.x).attr("cy", c.y).attr("r", 36).attr("fill", "transparent")

      // Label
      cg.append("text")
        .attr("x", c.x).attr("y", c.y + 6).attr("text-anchor", "middle")
        .attr("font-size", 22).attr("font-family", F).attr("font-weight", 700)
        .attr("fill", c.sign === 1 ? "#ef4444" : "#1e40af")
        .style("pointer-events", "none")
        .text(c.sign === 1 ? "+" : "-")

      // D3 drag
      const chargeDrag = drag<SVGGElement, unknown>()
        .on("start", function() {
          select(this).style("cursor", "grabbing")
          fm.select(`.glow-${c.id}`).attr("opacity", 0.5)
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          const nx = Math.max(60, Math.min(W - 60, event.x))
          const ny = Math.max(60, Math.min(H - 60, event.y))
          const ch = chargesRef.current.find(ch2 => ch2.id === c.id)
          if (ch) { ch.x = nx; ch.y = ny }
          drawFieldScene(g)
        })
        .on("end", function() {
          select(this).style("cursor", "grab")
          fm.select(`.glow-${c.id}`).attr("opacity", 0)
        })
      cg.call(chargeDrag)
    }
  }

  function buildWaveMode(g: Selection<SVGGElement, unknown, null, undefined>) {
    const wm = g.select(".wave-mode")
    const compact = W < 580
    const ultraCompact = W < 430 || H < 360
    const waveCenter = Math.round(H * 0.48)
    const waveLeft = Math.round(W * 0.067)
    const waveRight = Math.round(W * 0.933)
    const eAmplitude = Math.round(H * 0.227)
    const bAmplitude = Math.round(H * 0.182)
    const waveFs = Math.max(12, Math.min(18, H / 28))

    // Axis line
    wm.append("line").attr("class", "wave-axis")
      .attr("x1", waveLeft).attr("y1", waveCenter).attr("x2", waveRight).attr("y2", waveCenter)
      .attr("stroke", "#cbd5e1").attr("stroke-width", 2).attr("stroke-dasharray", "6 4")

    // E area fill
    wm.append("path").attr("class", "e-area").attr("fill", "#1e40af").attr("fill-opacity", 0.08)
    // B area fill
    wm.append("path").attr("class", "b-area").attr("fill", "#059669").attr("fill-opacity", 0.08)
    // E wave path
    wm.append("path").attr("class", "e-wave").attr("fill", "none").attr("stroke", "#1e40af").attr("stroke-width", 3)
    // B wave path
    wm.append("path").attr("class", "b-wave").attr("fill", "none").attr("stroke", "#059669").attr("stroke-width", 3)

    // Labels
    if (!ultraCompact) {
      wm.append("text").attr("x", waveLeft - 8).attr("y", waveCenter - eAmplitude - 8)
        .attr("font-size", waveFs * 1.3).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e40af").text("E")
      wm.append("text").attr("x", waveLeft - 8).attr("y", waveCenter + bAmplitude + 20)
        .attr("font-size", waveFs * 1.3).attr("font-family", F).attr("font-weight", 700).attr("fill", "#059669").text("B")
    }

    // Propagation arrow
    const arrowX1 = Math.round(W * 0.778)
    const arrowX2 = Math.round(W * 0.878)
    const arrowY = waveCenter + Math.round(H * 0.318)
    wm.append("line").attr("x1", arrowX1).attr("y1", arrowY).attr("x2", arrowX2).attr("y2", arrowY)
      .attr("stroke", "#1e293b").attr("stroke-width", 2.5)
    wm.append("polygon").attr("points", `${arrowX2 - 5},${arrowY - 7} ${arrowX2 + 10},${arrowY} ${arrowX2 - 5},${arrowY + 7}`)
      .attr("fill", "#1e293b")
    wm.append("text").attr("x", (arrowX1 + arrowX2) / 2).attr("y", arrowY + 22).attr("text-anchor", "middle")
      .attr("font-size", waveFs).attr("font-family", F).attr("font-weight", 600).attr("fill", "#475569")
      .text(ultraCompact ? "" : compact ? "k" : "Propagation (k)")

    // Wavelength indicator
    const wlY = waveCenter + Math.round(H * 0.273)
    wm.append("line").attr("class", "wl-line").attr("y1", wlY).attr("y2", wlY)
      .attr("stroke", "#f59e0b").attr("stroke-width", 2)
    wm.append("line").attr("class", "wl-tick1").attr("stroke", "#f59e0b").attr("stroke-width", 2)
    wm.append("line").attr("class", "wl-tick2").attr("stroke", "#f59e0b").attr("stroke-width", 2)
    wm.append("text").attr("class", "wl-text").attr("y", wlY - 4).attr("text-anchor", "middle")
      .attr("font-size", waveFs).attr("font-family", F).attr("font-weight", 600).attr("fill", "#f59e0b")
      .text(ultraCompact ? "" : compact ? "\u03BB" : "lambda")

    // Draggable wavelength handle on the right tick
    const wlStart = waveLeft + Math.round(W * 0.089)
    const wlHandleG = wm.append("g").attr("class", "wl-handle").style("cursor", "grab").style("touch-action", "none")
    // Invisible hit area (min 30px wide)
    wlHandleG.append("rect").attr("class", "wl-hit")
      .attr("x", -15).attr("y", wlY - 18).attr("width", 30).attr("height", 36)
      .attr("fill", "transparent")
    // Visible handle circle
    wlHandleG.append("circle").attr("class", "wl-knob")
      .attr("cy", wlY).attr("r", 8)
      .attr("fill", "white").attr("stroke", "#f59e0b").attr("stroke-width", 2.5)

    const wlDragScale = scaleLinear().domain([wlStart + 60, wlStart + 300]).range([60, 300])
    const wlDrag = drag<SVGGElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
        select(this).select("circle").transition().duration(100)
          .attr("r", 11).attr("stroke-width", 3)
      })
      .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
        const newWl = Math.max(60, Math.min(300, wlDragScale(event.x)))
        onVarChangeRef.current('wavelength', Math.round(newWl / 5) * 5)
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
        select(this).select("circle").transition().duration(100)
          .attr("r", 8).attr("stroke-width", 2.5)
      })
    wlHandleG.call(wlDrag)

    // Info text — hide on narrow screens
    if (!compact) {
      wm.append("text").attr("x", Math.round(W * 0.844)).attr("y", Math.round(H * 0.136)).attr("text-anchor", "middle")
        .attr("font-size", waveFs * 0.85).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text("E perpendicular to B")
      wm.append("text").attr("x", Math.round(W * 0.844)).attr("y", Math.round(H * 0.177)).attr("text-anchor", "middle")
        .attr("font-size", waveFs * 0.85).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text("Both perpendicular to k")
    }

    // Start animation
    prevTsRef.current = 0
    timeRef.current = 0
    runningRef.current = true
    const waveXs = range(0, waveRight - waveLeft, 2)

    const animate = (ts: number) => {
      if (!runningRef.current) return
      if (prevTsRef.current === 0) prevTsRef.current = ts
      const dt = (ts - prevTsRef.current) / 1000
      prevTsRef.current = ts
      timeRef.current += dt

      const wl = wavelengthRef.current
      const t = timeRef.current
      const k = (2 * Math.PI) / wl

      const ePathGen = line<number>()
        .x(d => waveLeft + d)
        .y(d => waveCenter - eAmplitude * Math.sin(k * d - t * 4))
        .curve(curveBasis)
      const bPathGen = line<number>()
        .x(d => waveLeft + d)
        .y(d => waveCenter + bAmplitude * Math.sin(k * d - t * 4))
        .curve(curveBasis)

      const eP = ePathGen(waveXs) ?? ""
      const bP = bPathGen(waveXs) ?? ""

      wm.select(".e-wave").attr("d", eP)
      wm.select(".b-wave").attr("d", bP)

      const lastX = waveLeft + waveXs[waveXs.length - 1]
      wm.select(".e-area").attr("d", `M ${waveLeft} ${waveCenter} ${eP} L ${lastX} ${waveCenter} Z`)
      wm.select(".b-area").attr("d", `M ${waveLeft} ${waveCenter} ${bP} L ${lastX} ${waveCenter} Z`)

      // Wavelength indicator
      const wlStartAnim = waveLeft + Math.round(W * 0.089)
      wm.select(".wl-line").attr("x1", wlStartAnim).attr("x2", wlStartAnim + wl)
      wm.select(".wl-tick1")
        .attr("x1", wlStartAnim).attr("y1", wlY - 6).attr("x2", wlStartAnim).attr("y2", wlY + 6)
      wm.select(".wl-tick2")
        .attr("x1", wlStartAnim + wl).attr("y1", wlY - 6).attr("x2", wlStartAnim + wl).attr("y2", wlY + 6)
      wm.select(".wl-text").attr("x", wlStartAnim + wl / 2)
      // Position drag handle on right tick
      wm.select(".wl-handle").attr("transform", `translate(${wlStartAnim + wl}, 0)`)

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  // Update wavelength ref for wave animation
  useEffect(() => {
    wavelengthRef.current = wavelength
  }, [wavelength])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
