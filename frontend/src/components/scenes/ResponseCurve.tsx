import type { PointerEvent as ReactPointerEvent, ReactElement } from "react"
import { useMemo, useState } from "react"
import type { Variable } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { subjectResults } from "../../data/subjectResults"

/**
 * The world-class generic stage for data-driven equations: instead of echoing
 * the input sliders as bars, it draws the equation's actual functional
 * relationship — the result (y) plotted against the most-illustrative variable
 * (x) swept across its range — with a live tracking dot at the current value.
 * Dragging any OTHER variable reshapes the curve (Ohm's slope steepens with R,
 * kinetic energy bends from linear to quadratic, the Bayes posterior shows its
 * S-curve), so the learner sees the shape of the equation, not just a number.
 *
 * One component, every equation that has a `subjectResults` entry — no bespoke
 * D3 per equation. The curve is a single <path> (not N nodes), recomputed from
 * cheap arithmetic, so it stays smooth on every drag frame.
 */

const SAMPLES = 80
const W = 360
const H = 200
const PAD_L = 46
const PAD_R = 16
const PAD_T = 16
const PAD_B = 30

const REDUCED_MOTION =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false

interface ResponseCurveProps {
  equationId: number
  variables: Variable[]
  vars: Record<string, number>
  /** Force a specific x-axis variable by name; falls back to auto-selection. */
  sweepOverride?: string
}

interface Marker {
  x: number
  y: number
  label: string
}

interface CurvePoint {
  px: number
  py: number
  x: number
  y: number
}

interface CurveModel {
  symbol: string
  unit?: string
  sweepSymbol: string
  sweepColor: string
  points: CurvePoint[]
  linePath: string
  areaPath: string | null
  dot: { x: number; y: number } | null
  dotValue: number | null
  guideX: number | null
  gridX: number[]
  gridY: number[]
  markers: Marker[]
  xMinLabel: string
  xMaxLabel: string
  yMaxLabel: string
  yMinLabel: string
  gradientId: string
}

function tick(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs !== 0 && (abs >= 1e4 || abs < 1e-2)) return value.toExponential(1)
  return String(Number(value.toPrecision(3)))
}

/**
 * Choose the x-axis variable: the one whose sweep produces the most illustrative
 * (most nonlinear) curve, so e.g. Kinetic Energy plots against velocity (a
 * parabola) rather than mass (a line). Scored on DEFAULT values so the choice is
 * stable across drags and the axis never flips mid-interaction.
 */
export function pickSweepVariable(
  result: (typeof subjectResults)[number],
  variables: Variable[],
): Variable | null {
  const candidates = variables.filter((v) => !v.constant && v.max > v.min)
  if (candidates.length === 0) return null
  const defaults: Record<string, number> = {}
  for (const v of variables) defaults[v.name] = v.value

  let best = candidates[0]
  let bestScore = -1
  for (const v of candidates) {
    const ys: Array<number | null> = []
    for (let i = 0; i <= 20; i += 1) {
      const x = v.min + ((v.max - v.min) * i) / 20
      const y = result.compute({ ...defaults, [v.name]: x })
      ys.push(Number.isFinite(y) ? y : null)
    }
    const finite = ys.filter((y): y is number => y !== null)
    if (finite.length < 3) continue
    const range = Math.max(...finite) - Math.min(...finite)
    if (range === 0) continue
    // The most illustrative curves REVERSE direction — an interior peak or
    // valley (logistic's hump, projectile range, resonance). Detect a slope sign
    // change and weight it decisively. Among non-reversing curves, prefer
    // nonlinearity (normalized curvature: a parabola beats a line); finally,
    // responsiveness (range) breaks ties between linear variables.
    let curvature = 0
    let reverses = false
    let prevSlope = 0
    let havePrev = false
    for (let i = 0; i < ys.length - 1; i += 1) {
      const a = ys[i]
      const b = ys[i + 1]
      if (a === null || b === null) continue
      const slope = b - a
      if (havePrev && slope !== 0 && prevSlope !== 0 && Math.sign(slope) !== Math.sign(prevSlope)) reverses = true
      if (slope !== 0) {
        prevSlope = slope
        havePrev = true
      }
    }
    for (let i = 1; i < ys.length - 1; i += 1) {
      const a = ys[i - 1]
      const b = ys[i]
      const c = ys[i + 1]
      if (a !== null && b !== null && c !== null) curvature += Math.abs((a - 2 * b + c) / range)
    }
    const score = (reverses ? 1000 : 0) + curvature + range * 1e-9
    if (score > bestScore) {
      bestScore = score
      best = v
    }
  }
  return best
}

function buildModel(
  equationId: number,
  variables: Variable[],
  vars: Record<string, number>,
  sweepOverride?: string,
): CurveModel | null {
  const result = subjectResults[equationId]
  if (!result) return null
  const override = sweepOverride
    ? variables.find((v) => v.name === sweepOverride && !v.constant && v.max > v.min)
    : null
  const sweep = override ?? pickSweepVariable(result, variables)
  if (!sweep || !(sweep.max > sweep.min)) return null

  const samples: Array<{ x: number; y: number | null }> = []
  for (let i = 0; i <= SAMPLES; i += 1) {
    const x = sweep.min + ((sweep.max - sweep.min) * i) / SAMPLES
    const y = result.compute({ ...vars, [sweep.name]: x })
    samples.push({ x, y: Number.isFinite(y) ? y : null })
  }

  const finite = samples.map((s) => s.y).filter((y): y is number => y !== null)
  if (finite.length < 2) return null

  let yMin = Math.min(...finite)
  let yMax = Math.max(...finite)
  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }
  const padY = (yMax - yMin) * 0.08
  yMin -= padY
  yMax += padY

  const sx = (x: number) => PAD_L + ((x - sweep.min) / (sweep.max - sweep.min)) * (W - PAD_L - PAD_R)
  const sy = (y: number) => H - PAD_B - ((y - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B)

  const points: CurvePoint[] = []
  let linePath = ""
  let penDown = false
  let noGaps = true
  for (const s of samples) {
    if (s.y === null) {
      penDown = false
      noGaps = false
      continue
    }
    const px = sx(s.x)
    const py = sy(s.y)
    points.push({ px, py, x: s.x, y: s.y })
    linePath += `${penDown ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)} `
    penDown = true
  }

  let areaPath: string | null = null
  if (noGaps) {
    const baseY = sy(Math.max(yMin, Math.min(yMax, 0)))
    const first = sx(samples[0].x)
    const last = sx(samples[samples.length - 1].x)
    areaPath = `M${first.toFixed(1)} ${baseY.toFixed(1)} ` + linePath.replace(/^M/, "L") + `L${last.toFixed(1)} ${baseY.toFixed(1)} Z`
  }

  // Reference gridlines at the quartiles (drawn as hairlines).
  const gridX = [0.25, 0.5, 0.75].map((f) => sx(sweep.min + (sweep.max - sweep.min) * f))
  const gridY = [0.25, 0.5, 0.75].map((f) => sy(yMin + (yMax - yMin) * f))

  // Adaptive notable-point markers — only appear where they mean something, so
  // monotonic curves stay clean while a logistic curve gets its peak + zero.
  const markers: Marker[] = []
  // Zero crossings — track the sign of the last NON-zero sample so a root that
  // lands exactly on a sample point (e.g. logistic at N=K) is still caught.
  let prevSign = 0
  let prevX = 0
  for (const s of samples) {
    if (s.y === null) {
      prevSign = 0
      continue
    }
    const sign = s.y > 0 ? 1 : s.y < 0 ? -1 : 0
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) {
      markers.push({ x: sx((prevX + s.x) / 2), y: sy(0), label: "0" })
    }
    if (sign !== 0) {
      prevSign = sign
      prevX = s.x
    }
  }
  const finitePts = samples.map((s, i) => ({ i, y: s.y })).filter((o): o is { i: number; y: number } => o.y !== null)
  if (finitePts.length > 2) {
    let maxO = finitePts[0]
    let minO = finitePts[0]
    for (const o of finitePts) {
      if (o.y > maxO.y) maxO = o
      if (o.y < minO.y) minO = o
    }
    const interior = (idx: number) => idx > 1 && idx < samples.length - 2
    if (interior(maxO.i)) markers.push({ x: sx(samples[maxO.i].x), y: sy(maxO.y), label: "peak" })
    if (interior(minO.i) && Math.abs(minO.y - maxO.y) > 1e-9) markers.push({ x: sx(samples[minO.i].x), y: sy(minO.y), label: "min" })
  }

  const curX = vars[sweep.name] ?? sweep.value
  const curYraw = result.compute(vars)
  const curFinite = Number.isFinite(curYraw)

  return {
    symbol: result.symbol,
    unit: result.unit,
    sweepSymbol: sweep.symbol,
    sweepColor: sweep.color,
    points,
    linePath: linePath.trim(),
    areaPath,
    dot: curFinite ? { x: sx(curX), y: sy(curYraw) } : null,
    dotValue: curFinite ? curYraw : null,
    guideX: curFinite ? sx(curX) : null,
    gridX,
    gridY,
    markers: markers.slice(0, 3),
    xMinLabel: tick(sweep.min),
    xMaxLabel: tick(sweep.max),
    yMaxLabel: tick(yMax),
    yMinLabel: tick(yMin),
    gradientId: `rc-grad-${equationId}`,
  }
}

export function ResponseCurve({ equationId, variables, vars, sweepOverride }: ResponseCurveProps): ReactElement | null {
  const model = useMemo(
    () => buildModel(equationId, variables, vars, sweepOverride),
    [equationId, variables, vars, sweepOverride],
  )
  const [hoverPx, setHoverPx] = useState<number | null>(null)
  const hover = useMemo(() => {
    if (hoverPx === null || !model || model.points.length === 0) return null
    let best = model.points[0]
    for (const point of model.points) {
      if (Math.abs(point.px - hoverPx) < Math.abs(best.px - hoverPx)) best = point
    }
    return best
  }, [hoverPx, model])
  if (!model) return null

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    setHoverPx(((event.clientX - rect.left) / rect.width) * W)
  }
  const clearHover = () => setHoverPx(null)

  // Keep the value label inside the frame.
  const labelX = model.dot ? Math.min(Math.max(model.dot.x, PAD_L + 18), W - PAD_R - 18) : 0
  const labelY = model.dot ? Math.max(model.dot.y - 12, PAD_T + 10) : 0

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Response curve of ${model.symbol} versus ${model.sweepSymbol}`}
      className="w-full max-w-md text-slate-400 dark:text-slate-500"
      style={{ cursor: "crosshair" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={clearHover}
    >
      <defs>
        <linearGradient id={model.gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={VAR_COLORS.result} stopOpacity="0.26" />
          <stop offset="100%" stopColor={VAR_COLORS.result} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* reference gridlines — hairlines */}
      {model.gridY.map((gy, i) => (
        <line key={`gy-${i}`} x1={PAD_L} y1={gy} x2={W - PAD_R} y2={gy} stroke="currentColor" strokeOpacity="0.08" />
      ))}
      {model.gridX.map((gx, i) => (
        <line key={`gx-${i}`} x1={gx} y1={PAD_T} x2={gx} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.08" />
      ))}

      {/* axes */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.25" />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.25" />

      {model.areaPath && <path d={model.areaPath} fill={`url(#${model.gradientId})`} />}
      <path
        d={model.linePath}
        fill="none"
        stroke={VAR_COLORS.result}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* notable-point markers */}
      {model.markers.map((m, i) => (
        <g key={`m-${i}`}>
          <circle cx={m.x} cy={m.y} r="3" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
          <text x={m.x} y={m.y - 6} textAnchor="middle" fontSize="8.5" className="fill-current font-medium">
            {m.label}
          </text>
        </g>
      ))}

      {/* hover scrub — read the curve at any x */}
      {hover && (
        <g pointerEvents="none">
          <line x1={hover.px} y1={PAD_T} x2={hover.px} y2={H - PAD_B} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 2" />
          <circle cx={hover.px} cy={hover.py} r="3.5" fill="white" stroke="currentColor" strokeWidth="1.5" />
          <text
            x={Math.min(Math.max(hover.px, PAD_L + 34), W - PAD_R - 34)}
            y={Math.max(hover.py - 9, PAD_T + 9)}
            textAnchor="middle"
            fontSize="9.5"
            className="fill-current font-semibold tabular-nums"
          >
            {model.sweepSymbol}={tick(hover.x)} · {tick(hover.y)}
            {model.unit ? ` ${model.unit}` : ""}
          </text>
        </g>
      )}

      {model.dot && model.guideX !== null && (
        <>
          <line
            x1={model.guideX}
            y1={PAD_T}
            x2={model.guideX}
            y2={H - PAD_B}
            stroke={model.sweepColor}
            strokeOpacity="0.45"
            strokeDasharray="3 3"
          />
          <circle
            cx={model.dot.x}
            cy={model.dot.y}
            r="5.5"
            fill={VAR_COLORS.result}
            stroke="white"
            strokeWidth="2"
            style={REDUCED_MOTION ? undefined : { transition: "cx 120ms linear, cy 120ms linear" }}
          />
          {model.dotValue !== null && (
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={VAR_COLORS.result}
              className="tabular-nums"
            >
              {tick(model.dotValue)}
              {model.unit ? ` ${model.unit}` : ""}
            </text>
          )}
        </>
      )}

      {/* axis labels */}
      <text x={W - PAD_R} y={H - 8} textAnchor="end" fontSize="11" className="fill-current font-medium">
        {model.sweepSymbol} →
      </text>
      <text x={6} y={PAD_T + 2} textAnchor="start" fontSize="11" className="fill-current font-medium">
        {model.symbol}
        {model.unit ? ` (${model.unit})` : ""}
      </text>
      {/* range ticks */}
      <text x={PAD_L} y={H - 10} textAnchor="start" fontSize="9.5" className="fill-current tabular-nums">
        {model.xMinLabel}
      </text>
      <text x={W - PAD_R} y={H - 19} textAnchor="end" fontSize="9.5" className="fill-current tabular-nums">
        {model.xMaxLabel}
      </text>
      <text x={PAD_L - 5} y={PAD_T + 8} textAnchor="end" fontSize="9.5" className="fill-current tabular-nums">
        {model.yMaxLabel}
      </text>
      <text x={PAD_L - 5} y={H - PAD_B} textAnchor="end" fontSize="9.5" className="fill-current tabular-nums">
        {model.yMinLabel}
      </text>
    </svg>
  )
}
