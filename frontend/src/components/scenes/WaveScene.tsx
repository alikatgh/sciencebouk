import type { ReactElement } from "react"
import { useState, useEffect, useRef } from "react"
import {
  select,
  scaleLinear,
  line,
  range,
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
  { name: 'freq', symbol: 'f', latex: 'f', value: 2.0, min: 0.5, max: 5, step: 0.1, color: VAR_COLORS.primary, description: 'Frequency of the wave' },
  { name: 'amp', symbol: 'A', latex: 'A', value: 60, min: 20, max: 100, step: 1, color: VAR_COLORS.secondary, unit: 'px', description: 'Amplitude (height) of the wave' },
  { name: 'wavelength', symbol: '\u03BB', latex: '\\lambda', value: 120, min: 50, max: 200, step: 1, color: VAR_COLORS.tertiary, unit: 'px', description: 'Wavelength (distance between peaks)' },
]

const lessons: LessonStep[] = [
  {
    id: 'change-freq',
    instruction: "Drag the blue f (frequency) upward. Watch the wave get more tightly packed.",
    hint: "Drag the blue f in the formula upward to increase frequency.",
    highlightElements: ['freq'],
    unlockedVariables: ['freq'],
    lockedVariables: ['amp', 'wavelength'],
    successCondition: { type: 'variable_changed', target: 'freq' },
    celebration: 'subtle',
    insight: "Higher frequency means more oscillations per second. On a guitar, a shorter string vibrates faster and produces a higher pitch. Frequency IS pitch.",
  },
  {
    id: 'change-amp',
    instruction: "Now drag the amber A (amplitude) to make the wave taller or shorter.",
    hint: "Drag the amber A up to increase amplitude.",
    highlightElements: ['amp'],
    unlockedVariables: ['amp'],
    lockedVariables: ['freq', 'wavelength'],
    successCondition: { type: 'variable_changed', target: 'amp' },
    celebration: 'subtle',
    insight: "Amplitude controls how much energy the wave carries. For sound, amplitude is volume. For light, it's brightness. The wave shape stays the same -- only its height changes.",
  },
  {
    id: 'superposition',
    instruction: "Now everything is unlocked. Look at the bottom panel: two waves added together. This is superposition -- waves combine by simple addition.",
    hint: "Adjust frequency and wavelength to see interesting interference patterns.",
    highlightElements: ['freq', 'amp', 'wavelength'],
    unlockedVariables: ['freq', 'amp', 'wavelength'],
    successCondition: { type: 'variable_changed', target: 'wavelength' },
    celebration: 'big',
    insight: "Superposition is why noise-canceling headphones work: they produce an inverted copy of the noise, and when the two waves add up, they cancel out. Wave + anti-wave = silence.",
  },
]

export function WaveScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Pluck a guitar string. Why does it make a musical note instead of random noise? Because only certain wave shapes can fit on the string."
      hookAction="Adjust frequency and amplitude to see how waves behave."
      formula="wave = {A} \u00D7 sin(2\u03C0 \u00D7 {f} \u00D7 t / {\u03BB})"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const speed = v.freq * v.wavelength
        return `\\text{wave} = {\\color{#f59e0b}${v.amp.toFixed(0)}} \\sin\\!\\left(2\\pi \\cdot \\frac{{\\color{#3b82f6}${v.freq.toFixed(1)}} \\cdot t}{{\\color{#10b981}${v.wavelength.toFixed(0)}}}\\right)`
      }}
      buildResultLine={(v) => {
        const speed = v.freq * v.wavelength
        return `c = f \\times \\lambda = ${speed.toFixed(0)} \\;\\text{units/s}`
      }}
      describeResult={(v) => {
        if (v.freq < 1) return "Low bass -- a deep hum"
        if (v.freq > 4) return "High pitch -- a shrill tone"
        if (v.amp > 80) return "Loud -- tall wave, lots of energy"
        return `Speed = ${(v.freq * v.wavelength).toFixed(0)} units/s`
      }}
      presets={[
        { label: "Low bass", values: { freq: 0.8, amp: 70, wavelength: 180 } },
        { label: "High pitch", values: { freq: 4.5, amp: 50, wavelength: 80 } },
        { label: "Tall wave", values: { freq: 2.0, amp: 95, wavelength: 120 } },
      ]}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar }) => (
        <D3WaveVisual
          frequency={vars.freq}
          amplitude={vars.amp}
          wavelength={vars.wavelength}
          onVarChange={setVar}
          highlightedVar={highlightedVar}
          onHighlight={setHighlightedVar}
        />
      )}
    </TeachableEquation>
  )
}

interface D3WaveVisualProps {
  frequency: number
  amplitude: number
  wavelength: number
  onVarChange: (name: string, value: number) => void
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

function D3WaveVisual({ frequency, amplitude, wavelength, onVarChange, highlightedVar, onHighlight }: D3WaveVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)
  const gRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const [playing, setPlaying] = useState(true)
  const rafRef = useRef<number>(0)
  const timeRef = useRef(0)
  const lastFrameRef = useRef(0)

  // Keep latest props in refs for RAF callback
  const freqRef = useRef(frequency)
  freqRef.current = frequency
  const ampRef = useRef(amplitude)
  ampRef.current = amplitude
  const wlRef = useRef(wavelength)
  wlRef.current = wavelength
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight

  // Store layout constants in ref so animation loop can access them
  const layoutRef = useRef({ wave1Y: 0, superY: 0, mx: 0, xScale: scaleLinear() })

  const pathGen = line<{ x: number; y: number }>()
    .x(d => d.x)
    .y(d => d.y)

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
      .attr("aria-label", "Wave visualization")

    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#f8fbff")

    const g = svg.append("g")
    gRef.current = g

    // Proportional layout
    const mx = W * 0.05
    const wave1Y = H * 0.25
    const superY = H * 0.65
    const xScale = scaleLinear().domain([0, 800]).range([mx, W - mx])
    layoutRef.current = { wave1Y, superY, mx, xScale }

    // Wave 1 label
    g.append("text").attr("class", "wave1-label").attr("x", mx).attr("y", H * 0.06)
      .attr("font-size", 14).attr("fill", "#5a79ff").attr("font-family", F).attr("font-weight", 600)
      .text("Wave 1")

    // Wave 2 label
    g.append("text").attr("class", "wave2-label").attr("x", mx + 80).attr("y", H * 0.06)
      .attr("font-size", 14).attr("fill", "#57b59a").attr("font-family", F).attr("font-weight", 600)
      .text("Wave 2")

    // Wave 1 axis
    g.append("line").attr("x1", mx).attr("y1", wave1Y).attr("x2", W - mx).attr("y2", wave1Y)
      .attr("stroke", "#e2e8f0").attr("stroke-width", 1)

    // Wave 1 path
    g.append("path").attr("class", "wave1-path")
      .attr("fill", "none").attr("stroke", "#5a79ff").attr("stroke-width", 3)

    // Wave 2 path
    g.append("path").attr("class", "wave2-path")
      .attr("fill", "none").attr("stroke", "#57b59a").attr("stroke-width", 3).attr("opacity", 0.85)

    // Draggable amplitude handle at wave peak
    const ampHandle = g.append("g").attr("class", "amp-handle").style("cursor", "grab")
    ampHandle.append("circle").attr("class", "amp-handle-hit").attr("r", 28).attr("fill", "transparent")
    ampHandle.append("circle").attr("class", "amp-handle-dot").attr("r", 8)
      .attr("fill", VAR_COLORS.secondary).attr("stroke", "white").attr("stroke-width", 3)
    ampHandle.append("text").attr("class", "amp-handle-label").attr("x", 14).attr("y", -14)
      .attr("font-size", 12).attr("fill", VAR_COLORS.secondary).attr("font-family", F).attr("font-weight", 600).text("A")

    // Amplitude annotation
    const ampG = g.append("g").attr("class", "amp-annotation").attr("opacity", 0)
    ampG.append("line").attr("class", "amp-line")
      .attr("stroke", VAR_COLORS.secondary).attr("stroke-width", 2).attr("stroke-dasharray", "4 3")
    ampG.append("text").attr("class", "amp-text")
      .attr("font-size", 14).attr("fill", VAR_COLORS.secondary).attr("font-family", F).attr("font-weight", 600)

    // Wavelength annotation
    const wlG = g.append("g").attr("class", "wl-annotation").attr("opacity", 0)
    wlG.append("line").attr("class", "wl-line")
      .attr("stroke", VAR_COLORS.tertiary).attr("stroke-width", 2)
    wlG.append("text").attr("class", "wl-text")
      .attr("text-anchor", "middle").attr("font-size", 15).attr("fill", VAR_COLORS.tertiary).attr("font-family", F).attr("font-weight", 600)

    // Superposition section
    g.append("text").attr("x", mx).attr("y", H * 0.47)
      .attr("font-size", 14).attr("fill", "#1e293b").attr("font-family", F).attr("font-weight", 700)
      .text("Superposition")

    // Super axis
    g.append("line").attr("x1", mx).attr("y1", superY).attr("x2", W - mx).attr("y2", superY)
      .attr("stroke", "#e2e8f0").attr("stroke-width", 1)

    // Super path
    g.append("path").attr("class", "super-path")
      .attr("fill", "none").attr("stroke", "#1e293b").attr("stroke-width", 3.5)

    // Legend — compact bottom row
    const legY = H * 0.88
    const legItems = [
      { x: mx, color: "#5a79ff", label: "Wave 1" },
      { x: mx + W * 0.2, color: "#57b59a", label: "Wave 2" },
      { x: mx + W * 0.4, color: "#1e293b", label: "Sum" },
    ]
    legItems.forEach(({ x, color, label }) => {
      g.append("line").attr("x1", x).attr("y1", legY).attr("x2", x + 18).attr("y2", legY).attr("stroke", color).attr("stroke-width", 3)
      g.append("text").attr("x", x + 22).attr("y", legY + 4).attr("font-size", 12).attr("fill", "#64748b").attr("font-family", F).text(label)
    })

    // D3 play/pause and reset buttons inside SVG
    const playBtnG = g.append("g").attr("class", "play-btn").style("cursor", "pointer")
      .attr("transform", `translate(${W - 170}, ${H - 38})`)
    playBtnG.append("rect").attr("class", "play-btn-bg").attr("width", 70).attr("height", 26).attr("rx", 13)
      .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
    playBtnG.append("text").attr("class", "play-btn-text").attr("x", 35).attr("y", 17).attr("text-anchor", "middle")
      .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
      .text("Pause")
    playBtnG.on("click", () => { setPlaying(p => !p) })

    const resetBtnG = g.append("g").attr("class", "reset-btn").style("cursor", "pointer")
      .attr("transform", `translate(${W - 90}, ${H - 38})`)
    resetBtnG.append("rect").attr("width", 70).attr("height", 26).attr("rx", 13)
      .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
    resetBtnG.append("text").attr("x", 35).attr("y", 17).attr("text-anchor", "middle")
      .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
      .text("Reset")
    resetBtnG.on("click", () => { timeRef.current = 0; setPlaying(false) })

    return () => { select(container).select("svg").remove() }
  }, [W, H])

  // Hover handlers for cross-highlighting
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select(".freq-readout")
      .on("mouseenter", () => onHighlightRef.current('freq'))
      .on("mouseleave", () => onHighlightRef.current(null))
    g.select(".amp-readout")
      .on("mouseenter", () => onHighlightRef.current('amp'))
      .on("mouseleave", () => onHighlightRef.current(null))
    g.select(".wl-readout")
      .on("mouseenter", () => onHighlightRef.current('wavelength'))
      .on("mouseleave", () => onHighlightRef.current(null))
  }, [W, H])

  // D3 drag on amplitude handle
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    const ampHandle = g.select<SVGGElement>(".amp-handle")

    const dragBehavior = drag<SVGGElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
      })
      .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
        const { wave1Y } = layoutRef.current
        // Dragging up increases amplitude; y decreases as we go up
        const newAmp = Math.round(clamp(wave1Y - event.y, 20, 100))
        onVarChangeRef.current('amp', newAmp)
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
      })

    ampHandle.call(dragBehavior)
  }, [W, H])

  // Update static elements when props change (annotations, readouts)
  useEffect(() => {
    const g = gRef.current
    if (!g) return

    const freqActive = highlightedVar === 'freq'
    const ampActive = highlightedVar === 'amp'
    const wlActive = highlightedVar === 'wavelength'

    // Wave 1 label color
    g.select(".wave1-label").attr("fill", freqActive ? VAR_COLORS.primary : "#5a79ff")

    // Position amplitude handle at wave peak (leftmost peak position)
    const { wave1Y: ly2, mx: lmx2, xScale: xs2 } = layoutRef.current
    g.select(".amp-handle").attr("transform", `translate(${xs2(0)}, ${ly2 - amplitude})`)

    // Amplitude annotation
    const { wave1Y: ly, mx: lmx } = layoutRef.current
    if (ampActive) {
      g.select(".amp-annotation").attr("opacity", 1)
      g.select(".amp-line").attr("x1", lmx + 60).attr("y1", ly).attr("x2", lmx + 60).attr("y2", ly - amplitude)
      g.select(".amp-text").attr("x", lmx + 72).attr("y", ly - amplitude / 2).text(`A = ${amplitude}`)
    } else {
      g.select(".amp-annotation").attr("opacity", 0)
    }

    // Wavelength annotation
    if (wlActive) {
      const wlPx = wavelength * ((W - lmx * 2) / 800)
      g.select(".wl-annotation").attr("opacity", 1)
      g.select(".wl-line").attr("x1", lmx).attr("y1", ly - amplitude - 10).attr("x2", lmx + wlPx).attr("y2", ly - amplitude - 10)
      g.select(".wl-text").attr("x", lmx + wlPx / 2).attr("y", ly - amplitude - 16).text(`\u03BB = ${wavelength}`)
    } else {
      g.select(".wl-annotation").attr("opacity", 0)
    }

    // Update D3 play/pause button appearance
    g.select(".play-btn-bg")
      .attr("fill", playing ? "#ef4444" : "white")
      .attr("stroke", playing ? "#ef4444" : "#e2e8f0")
    g.select(".play-btn-text")
      .attr("fill", playing ? "white" : "#64748b")
      .text(playing ? "Pause" : "Play")

  }, [frequency, amplitude, wavelength, highlightedVar, playing])

  // Animation loop — redraws wave paths via D3 on each frame
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return
    }
    lastFrameRef.current = performance.now()

    const tick = (now: number) => {
      const g = gRef.current
      if (!g) return

      const dt = (now - lastFrameRef.current) / 1000
      lastFrameRef.current = now
      timeRef.current += dt * freqRef.current * 0.5

      const amp = ampRef.current
      const wl = wlRef.current
      const t = timeRef.current
      const xs = range(0, 801, 3)
      const { wave1Y: cy1, superY: cy2, xScale: xs2 } = layoutRef.current

      // Wave 1
      const w1 = xs.map(xv => ({
        x: xs2(xv),
        y: cy1 + amp * Math.sin((2 * Math.PI * xv) / wl - t * 2 * Math.PI),
      }))
      g.select(".wave1-path").attr("d", pathGen(w1) ?? "")

      // Wave 2
      const w2 = xs.map(xv => ({
        x: xs2(xv),
        y: cy1 + amp * 0.7 * Math.sin((2 * Math.PI * xv) / (wl * 0.8) + t * 2 * Math.PI),
      }))
      g.select(".wave2-path").attr("d", pathGen(w2) ?? "")

      // Superposition
      const sup = w1.map((p, i) => ({
        x: p.x,
        y: cy2 + (p.y - cy1) + (w2[i].y - cy1),
      }))
      g.select(".super-path").attr("d", pathGen(sup) ?? "")

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  // When paused, still redraw once so parameter changes are visible
  useEffect(() => {
    if (playing) return
    const g = gRef.current
    if (!g) return

    const t = timeRef.current
    const xs = range(0, 801, 3)
    const { wave1Y: cy1, superY: cy2, xScale: xs2 } = layoutRef.current

    const w1 = xs.map(xv => ({
      x: xs2(xv),
      y: cy1 + amplitude * Math.sin((2 * Math.PI * xv) / wavelength - t * 2 * Math.PI),
    }))
    g.select(".wave1-path").attr("d", pathGen(w1) ?? "")

    const w2 = xs.map(xv => ({
      x: xs2(xv),
      y: cy1 + amplitude * 0.7 * Math.sin((2 * Math.PI * xv) / (wavelength * 0.8) + t * 2 * Math.PI),
    }))
    g.select(".wave2-path").attr("d", pathGen(w2) ?? "")

    const sup = w1.map((p, i) => ({
      x: p.x,
      y: cy2 + (p.y - cy1) + (w2[i].y - cy1),
    }))
    g.select(".super-path").attr("d", pathGen(sup) ?? "")
  }, [playing, frequency, amplitude, wavelength])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}
    />
  )
}
