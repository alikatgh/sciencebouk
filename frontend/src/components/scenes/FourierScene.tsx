import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import "d3-transition"
import { range } from "d3-array"
import { drag, type D3DragEvent } from "d3-drag"
import { scaleLinear } from "d3-scale"
import { select } from "d3-selection"
import { curveBasis, line } from "d3-shape"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const F = "Manrope, sans-serif"

const HARMONIC_COLORS = [VAR_COLORS.primary, VAR_COLORS.secondary, VAR_COLORS.tertiary, '#a855f7']

const variables: Variable[] = [
  { name: 'a1', symbol: 'a\u2081', latex: 'a_1', value: 1.0, min: 0, max: 1, step: 0.05, color: VAR_COLORS.primary, description: 'Fundamental amplitude' },
  { name: 'a2', symbol: 'a\u2082', latex: 'a_2', value: 0.5, min: 0, max: 1, step: 0.05, color: VAR_COLORS.secondary, description: '2nd harmonic amplitude' },
  { name: 'a3', symbol: 'a\u2083', latex: 'a_3', value: 0.35, min: 0, max: 1, step: 0.05, color: VAR_COLORS.tertiary, description: '3rd harmonic amplitude' },
  { name: 'a4', symbol: 'a\u2084', latex: 'a_4', value: 0.0, min: 0, max: 1, step: 0.05, color: '#a855f7', description: '4th harmonic amplitude' },
]

const lessons: LessonStep[] = [
  {
    id: 'fundamental',
    instruction: "Set a\u2081 to 1.0 and all others to 0. This is a pure tone -- the fundamental frequency.",
    hint: "Drag a\u2082, a\u2083, a\u2084 down to 0 and keep a\u2081 at 1.0.",
    highlightElements: ['a1'],
    unlockedVariables: ['a1', 'a2', 'a3', 'a4'],
    successCondition: { type: 'value_reached', target: 'a2', value: 0, tolerance: 0.1 },
    celebration: 'subtle',
    insight: "A single sine wave is the simplest possible sound -- a pure tone like a tuning fork. Every other sound is built by combining multiple pure tones at different frequencies.",
  },
  {
    id: 'add-harmonics',
    instruction: "Now bring a\u2082 up to about 0.5. Watch how the composite signal changes shape.",
    hint: "Drag the amber a\u2082 up to about 0.50.",
    highlightElements: ['a2'],
    unlockedVariables: ['a1', 'a2', 'a3', 'a4'],
    successCondition: { type: 'value_reached', target: 'a2', value: 0.5, tolerance: 0.15 },
    celebration: 'subtle',
    insight: "Adding a second harmonic changes the timbre -- the 'color' of the sound. This is why a violin and a flute playing the same note sound different: they have different harmonic recipes.",
  },
  {
    id: 'square-wave',
    instruction: "Try to approximate a square wave: set a\u2081=1.0, a\u2082=0, a\u2083=0.35, a\u2084=0. (Only odd harmonics!)",
    hint: "Set a\u2081=1.0, a\u2082=0, a\u2083=0.35, a\u2084=0.",
    highlightElements: ['a1', 'a2', 'a3', 'a4'],
    unlockedVariables: ['a1', 'a2', 'a3', 'a4'],
    successCondition: { type: 'value_reached', target: 'a3', value: 0.35, tolerance: 0.1 },
    celebration: 'big',
    insight: "A square wave is built from only odd harmonics (1, 3, 5...) with amplitudes 1/n. This is Fourier's great insight: ANY shape can be built from sine waves. MP3 compression works by throwing away the harmonics your ear can't hear.",
  },
]

export function FourierScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Every sound your phone plays is just a recipe of pure tones mixed together. This is how MP3 compression, voice recognition, and autotune work."
      hookAction="Toggle individual tones on and off to see how they combine."
      formula="{a1}\u00D7sin(t) + {a2}\u00D7sin(2t) + {a3}\u00D7sin(3t) + {a4}\u00D7sin(4t)"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        return `f(t) = {\\color{#3b82f6}${v.a1.toFixed(2)}}\\sin(t) + {\\color{#f59e0b}${v.a2.toFixed(2)}}\\sin(2t) + {\\color{#10b981}${v.a3.toFixed(2)}}\\sin(3t) + {\\color{#a855f7}${v.a4.toFixed(2)}}\\sin(4t)`
      }}
      buildResultLine={(v) => {
        const total = Math.abs(v.a1) + Math.abs(v.a2) + Math.abs(v.a3) + Math.abs(v.a4)
        return `\\text{Total amplitude} = ${total.toFixed(2)}`
      }}
      describeResult={(v) => {
        const active = [v.a1, v.a2, v.a3, v.a4].filter(a => a > 0.05).length
        if (active === 0) return "Silence -- no harmonics active"
        if (active === 1 && v.a1 > 0.5) return "Pure tone -- like a tuning fork"
        if (v.a2 < 0.05 && v.a3 > 0.2 && v.a4 < 0.05) return "Odd harmonics only -- approaching a square wave"
        return `${active} harmonic${active > 1 ? 's' : ''} active -- complex timbre`
      }}
      presets={[
        { label: "Pure tone", values: { a1: 1.0, a2: 0, a3: 0, a4: 0 } },
        { label: "Square-ish", values: { a1: 1.0, a2: 0, a3: 0.35, a4: 0 } },
        { label: "Rich", values: { a1: 1.0, a2: 0.5, a3: 0.35, a4: 0.25 } },
      ]}
    >
      {({ vars, setVar, highlightedVar, setHighlightedVar }) => (
        <D3FourierVisual
          a1={vars.a1}
          a2={vars.a2}
          a3={vars.a3}
          a4={vars.a4}
          highlightedVar={highlightedVar}
          onHighlight={setHighlightedVar}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface D3FourierVisualProps {
  a1: number
  a2: number
  a3: number
  a4: number
  highlightedVar: string | null
  onHighlight: (name: string | null) => void
  onVarChange: (name: string, value: number) => void
}

const HARMONIC_NAMES = ['a1', 'a2', 'a3', 'a4'] as const
const HARMONIC_LABELS = ['a\u2081', 'a\u2082', 'a\u2083', 'a\u2084']

function D3FourierVisual({ a1, a2, a3, a4, highlightedVar, onHighlight, onVarChange }: D3FourierVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)

  // Stable callback refs — never stale in D3 closures
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  // Live values during drag — bypasses React render cycle for 60fps SVG
  const liveRef = useRef([a1, a2, a3, a4])
  const draggingRef = useRef(false)
  const playingRef = useRef(true)

  // Store the updateScene function so external effects can call it
  const updateSceneRef = useRef<((amps: number[]) => void) | null>(null)

  // Animation refs
  const rafRef = useRef(0)
  const timeRef = useRef(0)
  const lastTsRef = useRef(0)

  // Sync React props into SVG when not dragging (handles presets, lesson steps, slider changes)
  useEffect(() => {
    if (draggingRef.current) return
    liveRef.current = [a1, a2, a3, a4]
    updateSceneRef.current?.([a1, a2, a3, a4])
  }, [a1, a2, a3, a4])

  // Highlight rings — lightweight attr toggle, no SVG rebuild
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const svg = select(el).select("svg")
    for (let i = 0; i < 4; i++) {
      svg.select(`.harmonic-glow-${i}`)
        .attr("opacity", highlightedVar === HARMONIC_NAMES[i] ? 0.5 : 0)
      svg.select(`.harmonic-path-${i}`)
        .attr("stroke-width", highlightedVar === HARMONIC_NAMES[i] ? 3 : 2)
    }
  }, [highlightedVar])

  // ═══════════════════════════════════════════════════════════════
  // Main SVG — created ONCE, rebuilt only on container resize.
  // Drag updates go through updateScene() directly, not React.
  // Animation loop reads from refs, never from React state.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let currentW = 0
    let currentH = 0
    let animationRunning = true

    function buildSVG() {
      if (!el) return

      // Stop animation before tearing down, then re-enable for the new loop
      animationRunning = false
      cancelAnimationFrame(rafRef.current)
      animationRunning = true
      lastTsRef.current = 0

      select(el).select("svg").remove()

      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      currentW = W
      currentH = H

      if (W < 100 || H < 100) return

      // ── Layout constants ──
      const plotLeft = W * 0.08
      const plotRight = W * 0.68
      const compositeTop = H * 0.07
      const compositeBottom = H * 0.33
      const harmonicTop = H * 0.38
      const harmonicHeight = H * 0.1
      const harmonicGap = H * 0.02
      const spectrumLeft = W * 0.72
      const spectrumRight = W * 0.95
      const spectrumTop = H * 0.19
      const spectrumBottom = H * 0.62

      const fontSize = Math.max(12, Math.min(18, H / 28))
      const fontSizeSm = Math.max(10, Math.min(15, H / 32))

      const omega = 2 * Math.PI
      const xs = range(0, 1, 0.004)
      const xScale = scaleLinear().domain([0, 1]).range([plotLeft, plotRight])

      const spectrumW = spectrumRight - spectrumLeft
      const spectrumBarW = spectrumW * 0.15
      const spectrumBarScale = scaleLinear().domain([0, 5]).range([spectrumLeft + spectrumW * 0.07, spectrumLeft + spectrumW * 0.93])
      const spectrumH = spectrumBottom - spectrumTop
      const spectrumAmpScale = scaleLinear().domain([0, 1]).range([spectrumBottom, spectrumTop])

      const pathGen = line<number>().curve(curveBasis)

      // ── Create SVG ──
      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .attr("role", "img")
        .attr("aria-label", "Fourier decomposition showing harmonics and composite signal")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      const g = svg.append("g")

      // --- Composite section ---
      g.append("text")
        .attr("x", plotLeft).attr("y", compositeTop - 4)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
        .text("Composite Signal")

      // Zero line
      g.append("line")
        .attr("x1", plotLeft).attr("y1", (compositeTop + compositeBottom) / 2)
        .attr("x2", plotRight).attr("y2", (compositeTop + compositeBottom) / 2)
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)

      // Composite path
      g.append("path").attr("class", "composite-path")
        .attr("fill", "none").attr("stroke", "#1e293b").attr("stroke-width", 3)

      // --- Individual harmonics ---
      g.append("text")
        .attr("x", plotLeft).attr("y", harmonicTop - 6)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
        .text("Harmonics")

      for (let i = 0; i < 4; i++) {
        const yMid = harmonicTop + i * (harmonicHeight + harmonicGap) + harmonicHeight / 2
        const color = HARMONIC_COLORS[i]

        // Zero line
        g.append("line")
          .attr("x1", plotLeft).attr("y1", yMid).attr("x2", plotRight).attr("y2", yMid)
          .attr("stroke", "#f1f5f9").attr("stroke-width", 1)

        // Waveform path
        g.append("path").attr("class", `harmonic-path-${i}`)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)

        // Glow ring for highlight
        g.append("circle").attr("class", `harmonic-glow-${i}`)
          .attr("cx", plotLeft - W * 0.024).attr("cy", yMid).attr("r", W * 0.018)
          .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("stroke-dasharray", "5 3")
          .attr("opacity", 0)

        // Label n=i+1
        const labelG = g.append("g").attr("class", `harmonic-label-${i}`).style("cursor", "pointer")
        labelG.append("text")
          .attr("x", plotLeft - W * 0.007).attr("y", yMid + 5)
          .attr("text-anchor", "end").attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", color)
          .text(`n=${i + 1}`)
        labelG.append("rect")
          .attr("x", plotLeft - W * 0.055).attr("y", yMid - 18).attr("width", W * 0.055).attr("height", 36)
          .attr("fill", "transparent")

        // Amplitude label
        const ampG = g.append("g").attr("class", `harmonic-amp-${i}`).style("cursor", "pointer")
        ampG.append("text").attr("class", `amp-text-${i}`)
          .attr("x", plotRight + W * 0.009).attr("y", yMid + 5)
          .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", color)
        ampG.append("rect")
          .attr("x", plotRight + W * 0.003).attr("y", yMid - 18).attr("width", W * 0.12).attr("height", 36)
          .attr("fill", "transparent")
      }

      // --- Spectrum bars ---
      g.append("text")
        .attr("x", spectrumLeft).attr("y", spectrumTop - H * 0.048)
        .attr("font-size", fontSize).attr("font-family", F).attr("font-weight", 700).attr("fill", "#1e293b")
        .text("Spectrum")

      // Baseline
      g.append("line")
        .attr("x1", spectrumLeft).attr("y1", spectrumBottom).attr("x2", spectrumRight).attr("y2", spectrumBottom)
        .attr("stroke", "#94a3b8").attr("stroke-width", 2)

      for (let i = 0; i < 4; i++) {
        const bx = spectrumBarScale(i + 1) - spectrumBarW / 2
        g.append("rect").attr("class", `spectrum-bar-${i}`)
          .attr("x", bx).attr("width", spectrumBarW).attr("rx", 5)
          .attr("fill", HARMONIC_COLORS[i])

        g.append("text")
          .attr("x", bx + spectrumBarW / 2).attr("y", spectrumBottom + H * 0.038)
          .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("font-family", F).attr("fill", "#64748b")
          .text(`${i + 1}f`)

        // Drag handle on top of each bar
        const handleG = g.append("g").attr("class", `spectrum-handle-${i}`).style("cursor", "grab").style("touch-action", "none")
        // Invisible hit area (min 30px)
        handleG.append("rect").attr("class", `spectrum-hit-${i}`)
          .attr("x", bx - 4).attr("width", spectrumBarW + 8).attr("height", Math.max(30, spectrumH))
          .attr("y", spectrumTop).attr("fill", "transparent")
        // Visible handle circle
        handleG.append("circle").attr("class", `spectrum-knob-${i}`)
          .attr("cx", bx + spectrumBarW / 2).attr("r", 7)
          .attr("fill", "white").attr("stroke", HARMONIC_COLORS[i]).attr("stroke-width", 2.5)

        // D3 drag — updates SVG directly, syncs React only on end
        const barDrag = drag<SVGGElement, unknown>()
          .on("start", function () {
            draggingRef.current = true
            select(this).style("cursor", "grabbing")
            select(this).select("circle").transition().duration(100)
              .attr("r", 10).attr("stroke-width", 3)
          })
          .on("drag", (event: D3DragEvent<SVGGElement, unknown, unknown>) => {
            const newVal = Math.max(0, Math.min(1, spectrumAmpScale.invert(event.y)))
            const snapped = Math.round(newVal * 20) / 20
            liveRef.current[i] = snapped
            updateScene(liveRef.current)
          })
          .on("end", function () {
            draggingRef.current = false
            select(this).style("cursor", "grab")
            select(this).select("circle").transition().duration(100)
              .attr("r", 7).attr("stroke-width", 2.5)
            // Sync React state only on drag end
            onVarChangeRef.current(HARMONIC_NAMES[i], liveRef.current[i])
          })
        handleG.call(barDrag)
      }

      // Equation readout
      g.append("text").attr("class", "equation-readout")
        .attr("x", spectrumLeft).attr("y", spectrumBottom + H * 0.11)
        .attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")

      // Description
      g.append("text")
        .attr("x", W / 2).attr("y", H - H * 0.024)
        .attr("text-anchor", "middle").attr("font-size", fontSizeSm).attr("font-family", F).attr("font-weight", 600).attr("fill", "#94a3b8")
        .text("Fourier Decomposition: any signal = sum of sine waves")

      // D3 play/pause button inside SVG
      const btnG = g.append("g").attr("class", "play-btn").style("cursor", "pointer")
        .attr("transform", `translate(${W - 100}, ${H - 38})`)
      btnG.append("rect").attr("class", "play-btn-bg").attr("width", 80).attr("height", 26).attr("rx", 13)
        .attr("fill", "white").attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)
      btnG.append("text").attr("class", "play-btn-text").attr("x", 40).attr("y", 17).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
        .text("Pause")
      btnG.on("click", () => {
        playingRef.current = !playingRef.current
        updatePlayButton()
        if (playingRef.current) {
          lastTsRef.current = 0
          rafRef.current = requestAnimationFrame(animate)
        }
      })

      // Hover cross-highlighting
      for (let i = 0; i < 4; i++) {
        const name = HARMONIC_NAMES[i]
        g.select(`.harmonic-label-${i}`)
          .on("mouseenter", () => onHighlightRef.current(name))
          .on("mouseleave", () => onHighlightRef.current(null))
        g.select(`.harmonic-amp-${i}`)
          .on("mouseenter", () => onHighlightRef.current(name))
          .on("mouseleave", () => onHighlightRef.current(null))
      }

      // ── updateScene: repositions non-animated elements from amps WITHOUT React ──
      function updateScene(amps: number[]) {
        // Amplitude labels
        for (let i = 0; i < 4; i++) {
          g.select(`.amp-text-${i}`).text(`${HARMONIC_LABELS[i]}=${amps[i].toFixed(2)}`)
        }

        // Equation readout
        g.select(".equation-readout")
          .text(`f(t) = ${amps[0].toFixed(2)}sin(t) + ${amps[1].toFixed(2)}sin(2t) + ${amps[2].toFixed(2)}sin(3t) + ${amps[3].toFixed(2)}sin(4t)`)

        // Spectrum bars + knobs (static position based on amplitude)
        for (let i = 0; i < 4; i++) {
          const barH = spectrumH * (amps[i] / 1.2)
          g.select(`.spectrum-bar-${i}`)
            .attr("y", spectrumBottom - barH)
            .attr("height", barH)
            .attr("opacity", amps[i] > 0 ? 0.85 : 0.15)
          g.select(`.spectrum-knob-${i}`)
            .attr("cy", spectrumBottom - barH)
        }
      }

      function updatePlayButton() {
        const playing = playingRef.current
        g.select(".play-btn-bg")
          .attr("fill", playing ? "#4f73ff" : "white")
          .attr("stroke", playing ? "#4f73ff" : "#e2e8f0")
        g.select(".play-btn-text")
          .attr("fill", playing ? "white" : "#64748b")
          .text(playing ? "Pause" : "Play")
      }

      // ── Animation loop: reads from refs, never from React state ──
      function animate(ts: number) {
        if (!animationRunning) return
        if (!playingRef.current) return

        if (lastTsRef.current === 0) lastTsRef.current = ts
        const dt = (ts - lastTsRef.current) / 1000
        lastTsRef.current = ts
        timeRef.current += dt

        const amps = liveRef.current
        const t = timeRef.current
        const totalAmp = amps.reduce((s, a) => s + Math.abs(a), 0) || 1

        // Composite waveform
        const compositeYScale = scaleLinear().domain([-totalAmp, totalAmp]).range([compositeBottom, compositeTop])
        const compositePath = pathGen
          .x(d => xScale(d))
          .y(d => {
            let sum = 0
            for (let k = 0; k < amps.length; k++) {
              sum += amps[k] * Math.sin((k + 1) * omega * d + (k + 1) * t * 2)
            }
            return compositeYScale(sum)
          })(xs) ?? ""
        g.select(".composite-path").attr("d", compositePath)

        // Individual harmonics
        for (let i = 0; i < 4; i++) {
          const yMid = harmonicTop + i * (harmonicHeight + harmonicGap) + harmonicHeight / 2
          const hYScale = scaleLinear().domain([-1.2, 1.2]).range([yMid + harmonicHeight / 2, yMid - harmonicHeight / 2])
          const hPath = pathGen
            .x(d => xScale(d))
            .y(d => hYScale(amps[i] * Math.sin((i + 1) * omega * d + (i + 1) * t * 2)))(xs) ?? ""
          g.select(`.harmonic-path-${i}`).attr("d", hPath).attr("opacity", amps[i] > 0 ? 1 : 0.2)
        }

        // Spectrum bars + knobs (animated position tracks live amps)
        for (let i = 0; i < 4; i++) {
          const barH = spectrumH * (amps[i] / 1.2)
          g.select(`.spectrum-bar-${i}`)
            .attr("y", spectrumBottom - barH)
            .attr("height", barH)
            .attr("opacity", amps[i] > 0 ? 0.85 : 0.15)
          g.select(`.spectrum-knob-${i}`)
            .attr("cy", spectrumBottom - barH)
        }

        rafRef.current = requestAnimationFrame(animate)
      }

      // Expose for external sync (preset changes, prop sync)
      updateSceneRef.current = updateScene

      // Initial render
      updateScene(liveRef.current)
      updatePlayButton()

      // Start animation
      if (playingRef.current) {
        lastTsRef.current = 0
        rafRef.current = requestAnimationFrame(animate)
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
        animationRunning = false
        cancelAnimationFrame(rafRef.current)
        if (!rebuildScheduled) {
          rebuildScheduled = true
          requestAnimationFrame(() => { rebuildScheduled = false; buildSVG() })
        }
      }
    })
    observer.observe(el)

    return () => {
      animationRunning = false
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      select(el).select("svg").remove()
      updateSceneRef.current = null
      lastTsRef.current = 0
    }
  }, []) // ← empty deps: SVG created once, rebuilt only on resize

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
