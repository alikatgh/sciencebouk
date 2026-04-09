import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
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

  // Keep latest props in refs for callbacks
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight

  // Live values during drag — bypasses React render cycle for 60fps SVG
  const liveRef = useRef({ freq: frequency, amp: amplitude, wl: wavelength })
  const draggingRef = useRef(false)

  // Animation state in refs so the RAF loop never depends on React state
  const playingRef = useRef(true)
  const timeRef = useRef(0)
  const lastFrameRef = useRef(0)
  const rafRef = useRef(0)
  const renderGenerationRef = useRef(0)

  // Store the update function so external effects can call it
  const updateRef = useRef<((freq: number, amp: number, wl: number) => void) | null>(null)

  // Sync React props into SVG when not dragging (handles presets, lesson steps, slider changes)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = { freq: frequency, amp: amplitude, wl: wavelength }
    updateRef.current?.(frequency, amplitude, wavelength)
  }, [frequency, amplitude, wavelength])

  // Highlight annotations (lightweight attr toggle, no SVG rebuild)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const svg = select(el).select("svg")
    if (svg.empty()) return

    const g = svg.select("g")
    const ampActive = highlightedVar === 'amp'
    const wlActive = highlightedVar === 'wavelength'
    const freqActive = highlightedVar === 'freq'

    g.select(".wave1-label").attr("fill", freqActive ? VAR_COLORS.primary : "#5a79ff")
    g.select(".amp-annotation").attr("opacity", ampActive ? 1 : 0)
    g.select(".wl-annotation").attr("opacity", wlActive ? 1 : 0)

    // Reposition annotation geometry with current live values
    if (ampActive || wlActive) {
      updateRef.current?.(liveRef.current.freq, liveRef.current.amp, liveRef.current.wl)
    }
  }, [highlightedVar])

  // ═══════════════════════════════════════════════════════════════
  // Main SVG — created ONCE, rebuilt only on container resize.
  // Drag updates go through updateScene() directly, not React.
  // Animation loop lives here and reads from refs.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let currentW = 0
    let currentH = 0

    const pathGen = line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)

    let running = true

    function buildSVG() {
      if (!el) return
      const buildGeneration = ++renderGenerationRef.current

      // Stop the previous animation loop before tearing down SVG
      running = false
      cancelAnimationFrame(rafRef.current)
      running = true
      lastFrameRef.current = 0

      select(el).select("svg").remove()

      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      const compact = W < 480 || H < 420
      const ultraCompact = W < 390 || H < 360
      currentW = W
      currentH = H

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Wave visualization")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#f8fbff")

      const g = svg.append("g")

      // Proportional layout
      const mx = W * 0.05
      const wave1Y = H * 0.25
      const superY = H * 0.65
      const xScale = scaleLinear().domain([0, 800]).range([mx, W - mx])

      // Store layout for drag coordinate conversion
      const layout = { wave1Y, superY, mx, xScale }

      // ── Create all SVG elements with CSS classes ──

      // Wave 1 label
      g.append("text").attr("class", "wave1-label").attr("x", mx).attr("y", H * 0.06)
        .attr("font-size", 14).attr("fill", "#5a79ff").attr("font-family", F).attr("font-weight", 600)
        .text(compact ? "1" : "Wave 1")

      // Wave 2 label
      g.append("text").attr("class", "wave2-label").attr("x", mx + (ultraCompact ? 26 : compact ? 34 : 80)).attr("y", H * 0.06)
        .attr("font-size", 14).attr("fill", "#57b59a").attr("font-family", F).attr("font-weight", 600)
        .text(compact ? "2" : "Wave 2")

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
      const ampHandle = g.append("g").attr("class", "amp-handle").style("cursor", "grab").style("touch-action", "none")
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
        .text(ultraCompact ? "Σ" : compact ? "Sum" : "Superposition")

      // Super axis
      g.append("line").attr("x1", mx).attr("y1", superY).attr("x2", W - mx).attr("y2", superY)
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)

      // Super path
      g.append("path").attr("class", "super-path")
        .attr("fill", "none").attr("stroke", "#1e293b").attr("stroke-width", 3.5)

      // Legend — compact bottom row
      const legY = H * 0.88
      const legItems = [
        { x: mx, color: "#5a79ff", label: compact ? "1" : "Wave 1" },
        { x: mx + W * (ultraCompact ? 0.13 : 0.2), color: "#57b59a", label: compact ? "2" : "Wave 2" },
        { x: mx + W * (ultraCompact ? 0.26 : 0.4), color: "#1e293b", label: ultraCompact ? "Σ" : "Sum" },
      ]
      legItems.forEach(({ x, color, label }) => {
        g.append("line")
          .attr("x1", x)
          .attr("y1", legY)
          .attr("x2", x + (ultraCompact ? 14 : 18))
          .attr("y2", legY)
          .attr("stroke", color)
          .attr("stroke-width", 3)
        g.append("text")
          .attr("x", x + (ultraCompact ? 18 : 22))
          .attr("y", legY + 4)
          .attr("font-size", ultraCompact ? 11 : 12)
          .attr("fill", "#64748b")
          .attr("font-family", F)
          .text(label)
      })

      // D3 play/pause button
      const playBtnG = g.append("g").attr("class", "play-btn").style("cursor", "pointer")
        .attr("transform", `translate(${W - (ultraCompact ? 122 : compact ? 140 : 170)}, ${H - 38})`)
      playBtnG.append("rect").attr("class", "play-btn-bg").attr("width", ultraCompact ? 50 : compact ? 58 : 70).attr("height", 26).attr("rx", 13)
        .attr("fill", "#ef4444").attr("stroke", "#ef4444").attr("stroke-width", 1.5)
      playBtnG.append("text").attr("class", "play-btn-text").attr("x", ultraCompact ? 25 : compact ? 29 : 35).attr("y", 17).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "white")
        .text(ultraCompact ? "Stop" : compact ? "On" : "Pause")
      playBtnG.on("click", () => {
        playingRef.current = !playingRef.current
        updatePlayButton()
        if (playingRef.current) {
          lastFrameRef.current = performance.now()
          rafRef.current = requestAnimationFrame(tick)
        } else {
          cancelAnimationFrame(rafRef.current)
        }
      })

      // D3 reset button
      const resetBtnG = g.append("g").attr("class", "reset-btn").style("cursor", "pointer")
        .attr("transform", `translate(${W - (ultraCompact ? 60 : compact ? 72 : 90)}, ${H - 38})`)
      resetBtnG.append("rect").attr("width", ultraCompact ? 44 : compact ? 52 : 70).attr("height", 26).attr("rx", 13)
        .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      resetBtnG.append("text").attr("x", ultraCompact ? 22 : compact ? 26 : 35).attr("y", 17).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text(compact ? "\u21BA" : "Reset")
      resetBtnG.on("click", () => {
        timeRef.current = 0
        playingRef.current = false
        cancelAnimationFrame(rafRef.current)
        updatePlayButton()
        drawWaves(liveRef.current.freq, liveRef.current.amp, liveRef.current.wl, timeRef.current)
      })

      // ── updatePlayButton: syncs play/pause button appearance ──
      function updatePlayButton() {
        const playing = playingRef.current
        g.select(".play-btn-bg")
          .attr("fill", playing ? "#ef4444" : "white")
          .attr("stroke", playing ? "#ef4444" : "#e2e8f0")
        g.select(".play-btn-text")
          .attr("fill", playing ? "white" : "#64748b")
          .text(ultraCompact ? (playing ? "Stop" : "Run") : compact ? (playing ? "On" : "Off") : (playing ? "Pause" : "Play"))
      }

      // ── drawWaves: updates wave paths and amplitude handle position ──
      function drawWaves(_freq: number, amp: number, wl: number, t: number) {
        const xs = range(0, 801, 3)

        // Wave 1
        const w1 = xs.map(xv => ({
          x: xScale(xv),
          y: wave1Y + amp * Math.sin((2 * Math.PI * xv) / wl - t * 2 * Math.PI),
        }))
        g.select(".wave1-path").attr("d", pathGen(w1) ?? "")

        // Wave 2
        const w2 = xs.map(xv => ({
          x: xScale(xv),
          y: wave1Y + amp * 0.7 * Math.sin((2 * Math.PI * xv) / (wl * 0.8) + t * 2 * Math.PI),
        }))
        g.select(".wave2-path").attr("d", pathGen(w2) ?? "")

        // Superposition
        const sup = w1.map((p, i) => ({
          x: p.x,
          y: superY + (p.y - wave1Y) + (w2[i].y - wave1Y),
        }))
        g.select(".super-path").attr("d", pathGen(sup) ?? "")
      }

      // ── updateScene: repositions static elements (handle, annotations) WITHOUT React ──
      function updateScene(freq: number, amp: number, wl: number) {
        // Position amplitude handle at wave peak (leftmost peak position)
        g.select(".amp-handle").attr("transform", `translate(${xScale(0)}, ${wave1Y - amp})`)

        // Amplitude annotation
        g.select(".amp-line")
          .attr("x1", mx + 60).attr("y1", wave1Y)
          .attr("x2", mx + 60).attr("y2", wave1Y - amp)
        g.select(".amp-text")
          .attr("x", mx + 72).attr("y", wave1Y - amp / 2)
          .text(ultraCompact ? `A${Math.round(amp)}` : compact ? `A ${Math.round(amp)}` : `A = ${Math.round(amp)}`)

        // Wavelength annotation
        const wlPx = wl * ((W - mx * 2) / 800)
        g.select(".wl-line")
          .attr("x1", mx).attr("y1", wave1Y - amp - 10)
          .attr("x2", mx + wlPx).attr("y2", wave1Y - amp - 10)
        g.select(".wl-text")
          .attr("x", mx + wlPx / 2).attr("y", wave1Y - amp - 16)
          .text(ultraCompact ? `\u03BB${Math.round(wl)}` : compact ? `\u03BB ${Math.round(wl)}` : `\u03BB = ${Math.round(wl)}`)

        // Also redraw waves at current time when paused
        if (!playingRef.current) {
          drawWaves(freq, amp, wl, timeRef.current)
        }
      }

      // Expose for external sync
      updateRef.current = updateScene

      // ── Animation loop — reads from refs, never from React state ──
      function tick(now: number) {
        if (!running || buildGeneration !== renderGenerationRef.current) return
        if (!playingRef.current) return
        if (lastFrameRef.current === 0) {
          lastFrameRef.current = now
        }
        const dt = (now - lastFrameRef.current) / 1000
        lastFrameRef.current = now

        const { freq, amp, wl } = liveRef.current
        timeRef.current += dt * freq * 0.5

        drawWaves(freq, amp, wl, timeRef.current)

        rafRef.current = requestAnimationFrame(tick)
      }

      // ── D3 drag — updates SVG directly, syncs React only on end ──
      const dragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
        })
        .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
          // Dragging up increases amplitude; y decreases as we go up
          const newAmp = Math.round(clamp(layout.wave1Y - event.y, 20, 100))
          liveRef.current.amp = newAmp
          updateScene(liveRef.current.freq, newAmp, liveRef.current.wl)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          onVarChangeRef.current('amp', liveRef.current.amp)
        })

      ampHandle.call(dragBehavior)

      // Hover cross-highlighting
      ampHandle
        .on("pointerenter", () => onHighlightRef.current('amp'))
        .on("pointerleave", () => onHighlightRef.current(null))

      // Initial render
      updateScene(liveRef.current.freq, liveRef.current.amp, liveRef.current.wl)

      // Start animation if playing
      if (playingRef.current) {
        lastFrameRef.current = performance.now()
        rafRef.current = requestAnimationFrame(tick)
      } else {
        drawWaves(liveRef.current.freq, liveRef.current.amp, liveRef.current.wl, timeRef.current)
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
        lastFrameRef.current = 0
        if (!rebuildScheduled) {
          rebuildScheduled = true
          requestAnimationFrame(() => { rebuildScheduled = false; buildSVG() })
        }
      }
    })
    observer.observe(el)

    return () => {
      running = false
      renderGenerationRef.current += 1
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
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
