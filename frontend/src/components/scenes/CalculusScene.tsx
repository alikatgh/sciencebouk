import type { ReactElement } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceDot, Tooltip as RTooltip,
} from "recharts"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

// f(x) = 2 sin(0.8x) + 0.15x^2 - x + 3
function f(x: number): number {
  return 2 * Math.sin(x * 0.8) + 0.15 * x * x - x + 3
}

// f'(x) analytically
function fPrime(x: number): number {
  return 1.6 * Math.cos(x * 0.8) + 0.3 * x - 1
}

const variables: Variable[] = [
  { name: 't', symbol: 't', latex: 't', value: 3, min: 0.5, max: 9.5, step: 0.1, color: VAR_COLORS.primary, description: 'Point on the curve' },
  { name: 'h', symbol: 'h', latex: 'h', value: 1.5, min: 0.05, max: 3, step: 0.05, color: VAR_COLORS.secondary, description: 'Distance between points' },
  { name: 'slope', symbol: 'slope', latex: '\\text{slope}', value: 0, min: -10, max: 10, step: 0.01, color: VAR_COLORS.result, constant: true, description: 'Steepness at this point' },
  { name: 'f', symbol: 'f', latex: 'f', value: 0, min: 0, max: 0, step: 1, color: '#6b7280', constant: true, description: 'The function' },
]

const lessons: LessonStep[] = [
  {
    id: 'touch',
    instruction: "Grab the blue dot and drag it along the curve.",
    highlightElements: ['t'],
    unlockedVariables: ['t'],
    lockedVariables: ['h'],
    successCondition: { type: 'variable_changed', target: 't' },
    celebration: 'subtle',
    insight: "The orange line tilts as you move. Its steepness IS the speed -- that's a derivative.",
  },
  {
    id: 'secant',
    instruction: "Now drag h smaller. Watch the orange line approach the gray tangent.",
    highlightElements: ['h'],
    unlockedVariables: ['h'],
    lockedVariables: ['t'],
    successCondition: { type: 'variable_changed', target: 'h' },
    celebration: 'subtle',
    insight: "As h -> 0, the secant becomes the tangent. That's what 'limit' means -- just zooming in until two points become one.",
  },
  {
    id: 'explore',
    instruction: "Find where the slope is zero -- the flat spots on the curve.",
    highlightElements: ['t', 'h'],
    unlockedVariables: ['t', 'h'],
    successCondition: { type: 'time_elapsed', duration: 15000 },
    celebration: 'medium',
    insight: "Slope = 0 at peaks and valleys. Setting the derivative to zero finds maximums and minimums. That's optimization.",
  },
  {
    id: 'integral',
    instruction: "Toggle 'Area' below. Drag t right and watch the shaded region grow -- that's the integral.",
    highlightElements: ['t'],
    unlockedVariables: ['t', 'h'],
    successCondition: { type: 'variable_changed', target: 't' },
    celebration: 'big',
    insight: "Derivative = distance -> speed. Integral = speed -> distance. They undo each other. This powers all of physics.",
  },
]

export function CalculusScene(): ReactElement {
  return (
    <TeachableEquation
      hook="Your speedometer is broken. You only have the odometer. How do you figure out your speed from distance alone?"
      hookAction="Grab the blue dot and drag it along the curve to see speed as steepness."
      formula="{slope} = lim {h}->0 ({f}({t}+{h}) - {f}({t})) / {h}"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const slope = fPrime(v.t)
        return `\\text{slope} = f'({\\color{#3b82f6}${v.t.toFixed(1)}}) = {\\color{#ef4444}${slope.toFixed(2)}}`
      }}
      buildResultLine={(v) => {
        const slope = fPrime(v.t)
        return `\\text{slope} = ${slope.toFixed(2)}`
      }}
      describeResult={(v) => {
        const slope = fPrime(v.t)
        if (Math.abs(slope) < 0.15) return "Flat spot -- a local max or min"
        if (slope > 1.5) return "Steep uphill -- accelerating fast"
        if (slope > 0) return "Going uphill"
        if (slope < -1.5) return "Steep downhill -- decelerating fast"
        return "Going downhill"
      }}
      presets={[
        { label: "Peak (t=2)", values: { t: 2, h: 1.5 } },
        { label: "Valley (t=7)", values: { t: 7, h: 1.5 } },
        { label: "Steep (t=9)", values: { t: 9, h: 1.5 } },
      ]}
    >
      {({ vars, setVar }) => (
        <CalculusChart t={vars.t} h={vars.h} onVarChange={setVar} />
      )}
    </TeachableEquation>
  )
}

interface CalculusChartProps {
  t: number
  h: number
  onVarChange?: (name: string, value: number) => void
}

function CalculusChart({ t, h, onVarChange }: CalculusChartProps): ReactElement {
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  // Recharts chart margins — must match the ComposedChart margin prop
  const chartMargin = useMemo(() => ({ top: 10, right: 30, bottom: 24, left: 10 }), [])
  const xDomain: [number, number] = [0, 10.5]
  const yAxisWidth = 40

  /** Convert a clientX pixel position to a data-space x value */
  const clientXToDataX = useCallback((clientX: number): number | null => {
    const wrapper = chartWrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    const plotLeft = rect.left + chartMargin.left + yAxisWidth
    const plotRight = rect.right - chartMargin.right
    const plotWidth = plotRight - plotLeft
    if (plotWidth <= 0) return null
    const ratio = (clientX - plotLeft) / plotWidth
    return xDomain[0] + ratio * (xDomain[1] - xDomain[0])
  }, [chartMargin, yAxisWidth])

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    // Only start drag if near the blue dot
    const dataX = clientXToDataX(e.clientX)
    if (dataX == null) return
    if (Math.abs(dataX - t) > 0.6) return // too far from the dot
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [clientXToDataX, t])

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !onVarChange) return
    const dataX = clientXToDataX(e.clientX)
    if (dataX == null) return
    const clamped = Math.max(0.5, Math.min(9.5, Math.round(dataX * 10) / 10))
    onVarChange("t", clamped)
  }, [isDragging, clientXToDataX, onVarChange])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleBadgeClick = useCallback((varName: string, currentValue: number) => {
    setEditingVar(varName)
    setEditValue(String(currentValue))
  }, [])

  const handleEditSubmit = useCallback(() => {
    if (editingVar && onVarChange) {
      const val = Number(editValue)
      if (!isNaN(val)) {
        if (editingVar === "t") onVarChange("t", Math.max(0.5, Math.min(9.5, val)))
        if (editingVar === "h") onVarChange("h", Math.max(0.05, Math.min(3, val)))
      }
    }
    setEditingVar(null)
  }, [editingVar, editValue, onVarChange])

  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.x != null && onVarChange) {
      const x = Number(data.activePayload[0].payload.x)
      onVarChange("t", Math.max(0.5, Math.min(9.5, Math.round(x * 10) / 10)))
    }
  }, [onVarChange])
  const [showArea, setShowArea] = useState(false)
  const [showDeriv, setShowDeriv] = useState(false)

  const slope = fPrime(t)
  const secantSlope = (f(t + h) - f(t)) / h
  const isNearLimit = h < 0.2

  // Main curve data
  const curveData = useMemo(() => {
    const pts: Array<{ x: number; y: number; deriv?: number; areaFill?: number }> = []
    for (let x = 0; x <= 10.5; x += 0.1) {
      const xr = Math.round(x * 100) / 100
      pts.push({
        x: xr,
        y: f(xr),
        deriv: fPrime(xr),
        areaFill: showArea && xr <= t ? f(xr) : undefined,
      })
    }
    return pts
  }, [showArea, t])

  // Tangent line data (short segment around t)
  const tangentData = useMemo(() => {
    const span = 2
    const x1 = Math.max(0, t - span)
    const x2 = Math.min(10.5, t + span)
    return [
      { x: x1, y: f(t) + slope * (x1 - t) },
      { x: x2, y: f(t) + slope * (x2 - t) },
    ]
  }, [t, slope])

  // Secant line data
  const secantData = useMemo(() => {
    const ext = 1
    const x1 = Math.max(0, t - ext)
    const x2 = Math.min(10.5, t + h + ext)
    return [
      { x: x1, y: f(t) + secantSlope * (x1 - t) },
      { x: x2, y: f(t) + secantSlope * (x2 - t) },
    ]
  }, [t, h, secantSlope])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" style={{ maxHeight: "75vh" }}>
      <div className="flex h-full flex-col">
        {/* Info bar — clickable badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {editingVar === "t" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("t", t)} className="cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              t = {t.toFixed(1)}
            </button>
          )}
          <span className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-extrabold dark:border-slate-600" style={{ color: VAR_COLORS.result }}>
            slope = {slope.toFixed(2)}
          </span>
          {editingVar === "h" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="ml-auto w-20 rounded-lg border-2 px-2 py-1 text-xs font-bold outline-none" style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} />
          ) : (
            <button onClick={() => handleBadgeClick("h", h)} className="ml-auto cursor-text rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800" style={{ color: VAR_COLORS.secondary }} type="button" title="Click to type a value">
              h = {h.toFixed(2)}
            </button>
          )}
        </div>

        {/* Chart */}
        <div
          ref={chartWrapperRef}
          className="min-h-0 flex-1"
          style={{ cursor: isDragging ? "grabbing" : "crosshair", touchAction: "none" }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 30, bottom: 24, left: 10 }} onClick={isDragging ? undefined : handleChartClick} style={{ cursor: isDragging ? "grabbing" : "crosshair" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="x" type="number"
                domain={[0, 10.5]}
                tickCount={11}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                allowDuplicatedCategory={false}
              />
              <YAxis
                domain={[-1, 14]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                width={40}
              />
              <RTooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                formatter={(value: any, name: any) => {
                  const label = name === "y" ? "f(x)" : name === "deriv" ? "f'(x)" : name
                  return [Number(value).toFixed(3), label]
                }}
                labelFormatter={(label: any) => `x = ${Number(label).toFixed(1)}`}
              />

              {/* Area fill under curve up to t */}
              {showArea && (
                <Area
                  data={curveData}
                  dataKey="areaFill"
                  fill={VAR_COLORS.primary}
                  stroke="none"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}

              {/* Main curve */}
              <Line data={curveData} dataKey="y" stroke="#1e293b" strokeWidth={3} dot={false} isAnimationActive={false} />

              {/* Derivative curve (optional) */}
              {showDeriv && (
                <Line data={curveData} dataKey="deriv" stroke="#06b6d4" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} opacity={0.5} />
              )}

              {/* Tangent line */}
              <Line
                data={tangentData}
                dataKey="y"
                stroke="#94a3b8"
                strokeWidth={isNearLimit ? 2.5 : 1.5}
                strokeDasharray={isNearLimit ? undefined : "6 4"}
                dot={false}
                isAnimationActive={false}
                opacity={isNearLimit ? 0.6 : 0.3}
              />

              {/* Secant line */}
              <Line
                data={secantData}
                dataKey="y"
                stroke={VAR_COLORS.secondary}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                opacity={0.8}
              />

              {/* Vertical reference lines */}
              <ReferenceLine x={t} stroke={VAR_COLORS.primary} strokeDasharray="4 3" strokeWidth={1} opacity={0.4} />
              <ReferenceLine x={t + h} stroke={VAR_COLORS.secondary} strokeDasharray="4 3" strokeWidth={1} opacity={0.3} />

              {/* Primary point (blue) — draggable */}
              <ReferenceDot
                x={t}
                y={f(t)}
                r={isDragging ? 13 : 10}
                fill={VAR_COLORS.primary}
                stroke="white"
                strokeWidth={3}
                style={{ cursor: isDragging ? "grabbing" : "grab", filter: isDragging ? "drop-shadow(0 0 6px rgba(59,130,246,0.5))" : undefined }}
              />

              {/* Second point (amber) */}
              <ReferenceDot
                x={t + h}
                y={f(t + h)}
                r={6}
                fill={VAR_COLORS.secondary}
                stroke="white"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Toggle buttons */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 dark:border-slate-700">
          <button
            onClick={() => setShowArea(v => !v)}
            className="rounded-full border px-4 py-1 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: showArea ? "#4f73ff" : "white",
              borderColor: showArea ? "#4f73ff" : "#e2e8f0",
              color: showArea ? "white" : "#64748b",
            }}
          >
            {showArea ? "Hide area" : "Area"}
          </button>
          <button
            onClick={() => setShowDeriv(v => !v)}
            className="rounded-full border px-4 py-1 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: showDeriv ? "#06b6d4" : "white",
              borderColor: showDeriv ? "#06b6d4" : "#e2e8f0",
              color: showDeriv ? "white" : "#64748b",
            }}
          >
            {showDeriv ? "Hide f'(x)" : "f'(x)"}
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: "#94a3b8", height: 2 }} />
            <span>Tangent</span>
            <span className="ml-2 inline-block h-0.5 w-4" style={{ backgroundColor: VAR_COLORS.secondary, height: 2 }} />
            <span>Secant</span>
          </div>
        </div>
      </div>
    </div>
  )
}
