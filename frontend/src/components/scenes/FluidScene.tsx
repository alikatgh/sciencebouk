import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import {
  select,
  scaleLinear,
  drag,
  type Selection,
  type D3DragEvent,
} from "d3"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const F = "Manrope, sans-serif"

const NUM_PARTICLES = 70

function flowVelocity(
  px: number,
  py: number,
  speed: number,
  viscosity: number,
  obstacleX: number,
  obstacleY: number,
  obstacleR: number
): [number, number] {
  const dx = px - obstacleX
  const dy = py - obstacleY
  const r2 = dx * dx + dy * dy
  const R = obstacleR + viscosity * 10
  const R2 = R * R

  if (r2 < R2 * 0.9) {
    const dist = Math.sqrt(r2)
    if (dist < 1) return [speed, 0]
    return [(dx / dist) * speed * 2, (dy / dist) * speed * 2]
  }

  const U = speed
  const r4 = r2 * r2
  const ux = U * (1 - R2 * (dx * dx - dy * dy) / r4)
  const uy = U * (-R2 * 2 * dx * dy / r4)

  let wakeFactor = 1
  if (dx > 0 && Math.abs(dy) < R * 2) {
    const wakeStrength = Math.exp(-dx / (R * (3 + viscosity * 5)))
    const lateralDecay = Math.exp(-(dy * dy) / (R2 * 2))
    wakeFactor = 1 - wakeStrength * lateralDecay * (1 - viscosity / 5)
  }

  return [ux * wakeFactor, uy * wakeFactor]
}

interface ParticleState {
  x: number
  y: number
}

const variables: Variable[] = [
  { name: 'viscosity', symbol: '\u03BD', latex: '\\nu', value: 0.5, min: 0, max: 2, step: 0.1, color: VAR_COLORS.primary, description: 'Fluid viscosity (resistance to flow)' },
  { name: 'flowSpeed', symbol: 'U', latex: 'U', value: 1.5, min: 0.3, max: 4, step: 0.1, color: VAR_COLORS.secondary, description: 'Flow speed' },
]

const lessons: LessonStep[] = [
  {
    id: 'watch-flow',
    instruction: "Watch the particles flowing around the obstacle. Notice how they speed up as they pass around the sides.",
    hint: "Look at the color of particles near the top and bottom of the obstacle (red = fast).",
    highlightElements: ['flowSpeed'],
    unlockedVariables: ['flowSpeed'],
    lockedVariables: ['viscosity'],
    successCondition: { type: 'time_elapsed', duration: 8000 },
    celebration: 'subtle',
    insight: "Fluid speeds up when squeezed through a narrow space. This is the same principle that makes wind howl between buildings and why a garden hose sprays faster when you pinch it.",
  },
  {
    id: 'change-viscosity',
    instruction: "Drag the blue viscosity upward. Watch how the flow changes as the fluid gets thicker.",
    hint: "Increase viscosity to see the boundary layer grow around the obstacle.",
    highlightElements: ['viscosity'],
    unlockedVariables: ['viscosity'],
    lockedVariables: ['flowSpeed'],
    successCondition: { type: 'variable_changed', target: 'viscosity' },
    celebration: 'subtle',
    insight: "Higher viscosity means the fluid 'sticks' more to surfaces. Honey (high viscosity) flows slowly around obstacles. Air (low viscosity) flows quickly. This is why airplane wings are so carefully shaped.",
  },
  {
    id: 'turbulence',
    instruction: "Set viscosity low (near 0) and flow speed high (near 4). This is where the Navier-Stokes equation becomes nearly impossible to solve.",
    hint: "Minimize viscosity and maximize flow speed.",
    highlightElements: ['viscosity', 'flowSpeed'],
    unlockedVariables: ['viscosity', 'flowSpeed'],
    successCondition: { type: 'value_reached', target: 'flowSpeed', value: 3.5, tolerance: 0.6 },
    celebration: 'big',
    insight: "At high speed and low viscosity, flow becomes chaotic -- turbulent. Proving whether smooth solutions always exist for the Navier-Stokes equation is one of the seven Millennium Prize Problems, worth one million dollars. Nobody has solved it yet.",
  },
]

export function FluidScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Why does smoke curl instead of going straight? Why do planes have that wing shape? This equation governs every fluid on Earth -- and we still can't fully solve it."
      hookAction="Adjust viscosity and flow speed to see how fluid behaves around objects."
      formula="\\rho\\left(\\frac{\\partial \\mathbf{v}}{\\partial t}+\\mathbf{v}\\cdot\\nabla\\mathbf{v}\\right)=-\\nabla p+{\\nu}\\nabla^2\\mathbf{v}+\\mathbf{f}"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const Re = (v.flowSpeed * 80) / (v.viscosity + 0.01)
        return `Re = \\frac{{\\color{#f59e0b}U} \\cdot L}{{\\color{#3b82f6}\\nu}} \\approx ${Re.toFixed(0)}`
      }}
      buildResultLine={(v) => {
        const Re = (v.flowSpeed * 80) / (v.viscosity + 0.01)
        return `Re \\approx ${Re.toFixed(0)}`
      }}
      describeResult={(v) => {
        const Re = (v.flowSpeed * 80) / (v.viscosity + 0.01)
        if (Re < 100) return "Laminar -- smooth, predictable flow"
        if (Re < 500) return "Transitional -- starting to become turbulent"
        return "Turbulent -- chaotic, unpredictable flow"
      }}
      presets={[
        { label: "Laminar", values: { viscosity: 1.5, flowSpeed: 0.8 } },
        { label: "Turbulent", values: { viscosity: 0.1, flowSpeed: 3.5 } },
        { label: "Honey", values: { viscosity: 2.0, flowSpeed: 1.0 } },
      ]}
    >
      {({ vars, setVar }) => (
        <D3FluidVisual
          viscosity={vars.viscosity}
          flowSpeed={vars.flowSpeed}
          onVarChange={setVar}
        />
      )}
    </TeachableEquation>
  )
}

interface Props {
  viscosity: number
  flowSpeed: number
  onVarChange: (name: string, value: number) => void
}

function D3FluidVisual({ viscosity, flowSpeed, onVarChange }: Props): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  // Live values — updated by React props sync and read by animation loop / drag
  const liveRef = useRef({ viscosity, flowSpeed, obstacleX: 0, obstacleY: 0 })
  const draggingRef = useRef(false)
  const particlesRef = useRef<ParticleState[]>([])
  const rafRef = useRef(0)
  const prevTimeRef = useRef(0)

  // Store the arrow-update function so the sync effect can call it
  const updateArrowsRef = useRef<(() => void) | null>(null)

  // Sync React props to live refs when not dragging (handles slider changes, presets)
  useEffect(() => {
    liveRef.current.viscosity = viscosity
    liveRef.current.flowSpeed = flowSpeed
    if (!draggingRef.current) {
      updateArrowsRef.current?.()
    }
  }, [viscosity, flowSpeed])

  // ═══════════════════════════════════════════════════════════════
  // Main SVG — created ONCE, rebuilt only on container resize.
  // Drag updates go through D3 directly, not React.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let currentW = 0
    let currentH = 0

    function buildSVG() {
      if (!el) return
      select(el).select("svg").remove()
      cancelAnimationFrame(rafRef.current)
      prevTimeRef.current = 0

      const rect = el.getBoundingClientRect()
      const W = Math.round(rect.width) || 800
      const H = Math.round(rect.height) || 500
      if (W < 100 || H < 100) return
      currentW = W
      currentH = H

      const OBSTACLE_R = Math.min(W, H) * 0.09

      // Initialize obstacle position
      liveRef.current.obstacleX = W * 0.47
      liveRef.current.obstacleY = H * 0.45

      const svg = select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .style("touch-action", "none")
        .attr("role", "img")
        .attr("aria-label", "Navier-Stokes fluid flow around an obstacle")

      svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

      // Gradient for velocity legend
      const defs = svg.append("defs")
      const grad = defs.append("linearGradient").attr("id", "velGrad-d3")
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%")
      grad.append("stop").attr("offset", "0%").attr("stop-color", "#1e40af")
      grad.append("stop").attr("offset", "50%").attr("stop-color", "#06b6d4")
      grad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444")

      // Flow arrow marker
      defs.append("marker").attr("id", "flowArr")
        .attr("markerWidth", 8).attr("markerHeight", 8).attr("refX", 8).attr("refY", 4).attr("orient", "auto")
        .append("polygon").attr("points", "0,0 8,4 0,8").attr("fill", "#1e293b")

      const g = svg.append("g")

      // Title
      g.append("text").attr("x", W / 2).attr("y", 28).attr("text-anchor", "middle")
        .attr("font-size", 18).attr("font-family", "Newsreader, serif").attr("font-weight", 700).attr("fill", "#1e293b")
        .text("Navier-Stokes: Flow Around an Obstacle")

      // Vector field group
      g.append("g").attr("class", "arrows-group")

      // Particles group
      g.append("g").attr("class", "particles-group")

      // Draggable obstacle
      const obstacleGroup = g.append("g").attr("class", "obstacle-group").style("cursor", "grab")
        .attr("transform", `translate(${liveRef.current.obstacleX},${liveRef.current.obstacleY})`)
      obstacleGroup.append("circle").attr("r", OBSTACLE_R)
        .attr("fill", "#1e293b")
      obstacleGroup.append("circle").attr("r", OBSTACLE_R)
        .attr("fill", "none").attr("stroke", "#475569").attr("stroke-width", 2)
      // Invisible larger hit area
      obstacleGroup.append("circle").attr("r", OBSTACLE_R + 15)
        .attr("fill", "transparent")
      obstacleGroup.append("text").attr("y", -OBSTACLE_R - 10).attr("text-anchor", "middle")
        .attr("font-size", 11).attr("font-family", F).attr("font-weight", 600).attr("fill", "#94a3b8")
        .text("drag me")

      // Flow direction indicator
      const flowIndicatorY = H * 0.45
      g.append("line").attr("x1", W * 0.03).attr("y1", flowIndicatorY).attr("x2", W * 0.09).attr("y2", flowIndicatorY)
        .attr("stroke", "#1e293b").attr("stroke-width", 3).attr("marker-end", "url(#flowArr)")
      g.append("text").attr("x", W * 0.06).attr("y", flowIndicatorY - 12).attr("text-anchor", "middle")
        .attr("font-size", 13).attr("font-family", F).attr("font-weight", 600).attr("fill", "#475569")
        .text("Flow")

      // Color legend
      const legendX = W * 0.75
      const legendW = W * 0.16
      g.append("rect").attr("x", legendX).attr("y", H - 50).attr("width", legendW).attr("height", 10)
        .attr("rx", 5).attr("fill", "url(#velGrad-d3)")
      g.append("text").attr("x", legendX).attr("y", H - 54).attr("font-size", 12).attr("font-family", F).attr("fill", "#64748b").text("Slow")
      g.append("text").attr("x", legendX + legendW).attr("y", H - 54).attr("text-anchor", "end").attr("font-size", 12).attr("font-family", F).attr("fill", "#64748b").text("Fast")
      g.append("text").attr("x", legendX + legendW / 2).attr("y", H - 28).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("fill", "#64748b").text("Velocity magnitude")

      // Hint
      g.append("text").attr("x", W / 2).attr("y", H - 8).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-family", F).attr("fill", "#94a3b8").attr("opacity", 0.6)
        .text("Drag the obstacle to move it -- adjust viscosity and speed above")

      // ── updateArrows: recomputes vector field from current live values ──
      function updateArrows() {
        const live = liveRef.current
        const obsX = live.obstacleX
        const obsY = live.obstacleY
        const spd = live.flowSpeed
        const visc = live.viscosity

        const arrowData: Array<{ x: number; y: number; vx: number; vy: number; mag: number }> = []
        const step = 50
        for (let gx = 50; gx < W - 30; gx += step) {
          for (let gy = 50; gy < H - 50; gy += step) {
            const dx = gx - obsX
            const dy = gy - obsY
            if (dx * dx + dy * dy < (OBSTACLE_R + 15) ** 2) continue
            const [vx, vy] = flowVelocity(gx, gy, spd * 100, visc, obsX, obsY, OBSTACLE_R)
            const mag = Math.sqrt(vx * vx + vy * vy)
            arrowData.push({ x: gx, y: gy, vx, vy, mag })
          }
        }

        const maxMag = Math.max(...arrowData.map(a => a.mag), 1)
        const colorScale = scaleLinear<string>()
          .domain([0, maxMag * 0.4, maxMag])
          .range(["#1e40af", "#06b6d4", "#ef4444"])

        const arrowGroup = g.select(".arrows-group")

        const arrowSel = arrowGroup.selectAll<SVGGElement, typeof arrowData[0]>("g.arrow")
          .data(arrowData)

        arrowSel.exit().remove()

        const enter = arrowSel.enter().append("g").attr("class", "arrow")
        enter.append("line")
        enter.append("polygon")

        const merged = enter.merge(arrowSel)
        merged.attr("opacity", 0.4)

        merged.each(function(d) {
          const elArrow = select(this)
          const arrowLen = Math.min(d.mag / maxMag * 20, 20)
          if (arrowLen < 2) {
            elArrow.attr("opacity", 0)
            return
          }
          elArrow.attr("opacity", 0.4)
          const angle = Math.atan2(d.vy, d.vx)
          const ex = d.x + Math.cos(angle) * arrowLen
          const ey = d.y + Math.sin(angle) * arrowLen
          const hs = 3.5
          const hx1 = ex - Math.cos(angle - 0.5) * hs
          const hy1 = ey - Math.sin(angle - 0.5) * hs
          const hx2 = ex - Math.cos(angle + 0.5) * hs
          const hy2 = ey - Math.sin(angle + 0.5) * hs
          const color = colorScale(d.mag)

          elArrow.select("line")
            .attr("x1", d.x).attr("y1", d.y).attr("x2", ex).attr("y2", ey)
            .attr("stroke", color).attr("stroke-width", 1.5).attr("stroke-linecap", "round")
          elArrow.select("polygon")
            .attr("points", `${ex},${ey} ${hx1},${hy1} ${hx2},${hy2}`)
            .attr("fill", color)
        })
      }

      // Expose for external sync effect
      updateArrowsRef.current = updateArrows

      // ── Obstacle drag — moves circle directly, defers arrow recomputation ──
      const obstacleDragBehavior = drag<SVGGElement, unknown>()
        .on("start", function () {
          draggingRef.current = true
          select(this).style("cursor", "grabbing")
          select(this).select("circle").transition().duration(100)
            .attr("transform", "scale(1.05)")
        })
        .on("drag", function (event: D3DragEvent<SVGGElement, unknown, unknown>) {
          const nx = Math.max(W * 0.15, Math.min(W * 0.85, event.x))
          const ny = Math.max(H * 0.15, Math.min(H * 0.8, event.y))
          // Update live ref — no React setState
          liveRef.current.obstacleX = nx
          liveRef.current.obstacleY = ny
          // Move the obstacle group visually (cheap)
          select(this).attr("transform", `translate(${nx},${ny})`)
        })
        .on("end", function () {
          draggingRef.current = false
          select(this).style("cursor", "grab")
          select(this).select("circle").transition().duration(100)
            .attr("transform", "scale(1)")
          // Recompute the expensive arrow grid now that dragging is done
          updateArrows()
        })

      obstacleGroup.call(obstacleDragBehavior)

      // Initialize particles
      const initial: ParticleState[] = []
      for (let i = 0; i < NUM_PARTICLES; i++) {
        initial.push({
          x: Math.random() * W,
          y: 50 + Math.random() * (H - 100),
        })
      }
      particlesRef.current = initial

      // Create initial particle circles
      g.select(".particles-group").selectAll("circle")
        .data(initial)
        .enter().append("circle")
        .attr("r", 3)
        .attr("opacity", 0.85)

      // Initial arrow render
      updateArrows()

      // ── Animation loop — reads from refs, never triggers React renders ──
      let running = true
      const animate = (ts: number) => {
        if (!running) return
        if (prevTimeRef.current === 0) prevTimeRef.current = ts
        const dt = Math.min((ts - prevTimeRef.current) / 1000, 0.05)
        prevTimeRef.current = ts

        const live = liveRef.current
        const spd = live.flowSpeed
        const visc = live.viscosity
        const obsX = live.obstacleX
        const obsY = live.obstacleY

        // Update particle positions
        const particles = particlesRef.current
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const [vx, vy] = flowVelocity(p.x, p.y, spd * 100, visc, obsX, obsY, OBSTACLE_R)
          let nx = p.x + vx * dt
          let ny = p.y + vy * dt

          if (nx > W + 20) { nx = -10; ny = 50 + Math.random() * (H - 100) }
          if (nx < -20) { nx = W + 10; ny = 50 + Math.random() * (H - 100) }
          if (ny < 40 || ny > H - 40) { ny = ny < 40 ? 50 : H - 50 }

          const ddx = nx - obsX
          const ddy = ny - obsY
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist < OBSTACLE_R + 5) {
            const angle = Math.atan2(ddy, ddx)
            nx = obsX + Math.cos(angle) * (OBSTACLE_R + 8)
            ny = obsY + Math.sin(angle) * (OBSTACLE_R + 8)
          }

          p.x = nx
          p.y = ny
        }

        // Color scale
        const colorScale = scaleLinear<string>()
          .domain([0, spd * 60, spd * 150])
          .range(["#1e40af", "#06b6d4", "#ef4444"])
          .clamp(true)

        // Update particle DOM
        const pSel = g.select(".particles-group").selectAll<SVGCircleElement, ParticleState>("circle")
          .data(particles)
        pSel.attr("cx", d => d.x).attr("cy", d => d.y)
          .attr("fill", d => {
            const [vx2, vy2] = flowVelocity(d.x, d.y, spd * 100, visc, obsX, obsY, OBSTACLE_R)
            return colorScale(Math.sqrt(vx2 * vx2 + vy2 * vy2))
          })

        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)

      return () => {
        running = false
        cancelAnimationFrame(rafRef.current)
      }
    }

    const cleanup = buildSVG()

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.round(entry.contentRect.width)
      const h = Math.round(entry.contentRect.height)
      if (w !== currentW || h !== currentH) {
        cleanup?.()
        requestAnimationFrame(() => { buildSVG() })
      }
    })
    observer.observe(el)

    return () => {
      cleanup?.()
      observer.disconnect()
      select(el).select("svg").remove()
      updateArrowsRef.current = null
    }
  }, []) // ← empty deps: SVG created once, rebuilt only on resize

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}
    />
  )
}
