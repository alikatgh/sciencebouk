import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { buildAreaPath, buildLinePath, getTicks, useChartFrame } from "../charts/simpleChart"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { interpolateSceneCopy, useSceneCopy } from "../../data/sceneCopy"

// f(x) = 2 sin(0.8x) + 0.15x^2 - x + 3
function f(x: number): number {
  return 2 * Math.sin(x * 0.8) + 0.15 * x * x - x + 3
}

// f'(x) analytically
function fPrime(x: number): number {
  return 1.6 * Math.cos(x * 0.8) + 0.3 * x - 1
}

const variables: Variable[] = [
  { name: 't', symbol: 't', latex: 't', value: 3, min: 0.5, max: 9.5, step: 0.01, color: VAR_COLORS.primary, description: 'Point on the curve' },
  { name: 'h', symbol: 'h', latex: 'h', value: 1.5, min: 0.05, max: 3, step: 0.05, color: VAR_COLORS.secondary, description: 'Distance between points' },
  // Initialize slope to the actual derivative at the default t=3 so that a resume
  // at the 'explore' step doesn't trivially satisfy value_reached(slope≈0) immediately.
  { name: 'slope', symbol: 'slope', latex: '\\text{slope}', value: Math.round(fPrime(3) * 100) / 100, min: -10, max: 10, step: 0.01, color: VAR_COLORS.result, constant: true, description: 'Steepness at this point' },
  { name: 'f', symbol: 'f', latex: 'f', value: 0, min: 0, max: 0, step: 1, color: '#6b7280', constant: true, description: 'The function' },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'touch',
    instruction: lessonCopy.touch.instruction,
    highlightElements: ['t'],
    unlockedVariables: ['t'],
    lockedVariables: ['h'],
    successCondition: { type: 'variable_changed', target: 't' },
    celebration: 'subtle',
    insight: lessonCopy.touch.insight,
  },
  {
    id: 'secant',
    instruction: lessonCopy.secant.instruction,
    highlightElements: ['h'],
    unlockedVariables: ['h'],
    lockedVariables: ['t'],
    successCondition: { type: 'variable_changed', target: 'h' },
    celebration: 'subtle',
    insight: lessonCopy.secant.insight,
  },
  {
    id: 'explore',
    instruction: lessonCopy.explore.instruction,
    highlightElements: ['t', 'h'],
    unlockedVariables: ['t', 'h'],
    successCondition: { type: 'value_reached', target: 'slope', value: 0, tolerance: 0.15 },
    celebration: 'medium',
    insight: lessonCopy.explore.insight,
  },
  {
    id: 'integral',
    instruction: lessonCopy.integral.instruction,
    highlightElements: ['t'],
    unlockedVariables: ['t', 'h'],
    successCondition: { type: 'variable_changed', target: 't' },
    celebration: 'big',
    insight: lessonCopy.integral.insight,
  },
  ]
}

export function CalculusScene(): ReactElement {
  const lessonCopy = useLessonCopy("calculus")
  const sceneCopy = useSceneCopy("calculus")
  const lessons = buildLessons(lessonCopy)
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
        return interpolateSceneCopy(sceneCopy.resultLine.slope, { slope: slope.toFixed(2) })
      }}
      describeResult={(v) => {
        const slope = fPrime(v.t)
        if (Math.abs(slope) < 0.15) return sceneCopy.description.flatSpot
        if (slope > 1.5) return sceneCopy.description.steepUphill
        if (slope > 0) return sceneCopy.description.uphill
        if (slope < -1.5) return sceneCopy.description.steepDownhill
        return sceneCopy.description.downhill
      }}
      presets={[
        { label: "Peak (t=2)", values: { t: 2, h: 1.5 } },
        { label: "Valley (t=7)", values: { t: 7, h: 1.5 } },
        { label: "Steep (t=9)", values: { t: 9, h: 1.5 } },
      ]}
    >
      {({ vars, setVar }) => (
        <CalculusBridge vars={vars} setVar={setVar} />
      )}
    </TeachableEquation>
  )
}

function CalculusBridge({ vars, setVar }: { vars: Record<string, number>; setVar: (name: string, value: number) => void }): ReactElement {
  const slope = fPrime(vars.t)

  useEffect(() => {
    if (Math.abs((vars.slope ?? 0) - slope) > 0.005) {
      setVar('slope', Math.round(slope * 100) / 100)
    }
  }, [vars.t, vars.slope, slope, setVar])

  return <CalculusChart t={vars.t} h={vars.h} onVarChange={setVar} />
}

interface CalculusChartProps {
  t: number
  h: number
  onVarChange?: (name: string, value: number) => void
}

function CalculusChart({ t, h, onVarChange }: CalculusChartProps): ReactElement {
  const sceneCopy = useSceneCopy("calculus")
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const frame = useChartFrame({
    margin: { top: 10, right: 30, bottom: 28, left: 48 },
    minHeight: 320,
    xDomain: [0, 10.5],
    yDomain: [-1, 14],
  })

  /** Convert a clientX pixel position to a data-space x value */
  const clientXToDataX = useCallback((clientX: number): number | null => {
    return frame.clientXToX(clientX)
  }, [frame])

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
    const clamped = Math.max(0.5, Math.min(9.5, Math.round(dataX * 100) / 100))
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

  const handleChartClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onVarChange || isDragging) return
    const x = frame.clientXToX(event.clientX)
    if (x == null) return
    onVarChange("t", Math.max(0.5, Math.min(9.5, Math.round(x * 10) / 10)))
  }, [frame, isDragging, onVarChange])
  const [showArea, setShowArea] = useState(false)
  const [showDeriv, setShowDeriv] = useState(false)
  const compact = frame.width < 420
  const ultraCompact = frame.width < 370

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

  const xTicks = useMemo(() => getTicks([0, 10.5], ultraCompact ? 4 : compact ? 6 : 10), [compact, ultraCompact])
  const yTicks = useMemo(() => getTicks([-1, 14], ultraCompact ? 4 : compact ? 5 : 6), [compact, ultraCompact])
  const curvePath = useMemo(() => buildLinePath({
    data: curveData,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y: (point) => point.y,
  }), [curveData, frame.xScale, frame.yScale])
  const areaPath = useMemo(() => buildAreaPath({
    data: curveData,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y0: () => 0,
    y1: (point) => point.areaFill,
  }), [curveData, frame.xScale, frame.yScale])
  const tangentPath = useMemo(() => buildLinePath({
    data: tangentData,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y: (point) => point.y,
  }), [frame.xScale, frame.yScale, tangentData])
  const secantPath = useMemo(() => buildLinePath({
    data: secantData,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y: (point) => point.y,
  }), [frame.xScale, frame.yScale, secantData])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Info bar — clickable badges */}
        <div className={`flex flex-wrap items-center ${compact ? "gap-1.5 px-3 pt-2.5" : "gap-2 px-4 pt-3"}`}>
          {editingVar === "t" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className={`${compact ? "w-16 text-xs" : "w-20 text-sm"} rounded-lg border-2 px-2 py-1 font-bold outline-none`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("t", t)} className={`${compact ? "px-2.5 text-xs" : "px-3 text-sm"} cursor-text rounded-lg border py-1 font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              {ultraCompact ? `t${t.toFixed(1)}` : compact ? `t ${t.toFixed(1)}` : `t = ${t.toFixed(1)}`}
            </button>
          )}
          <span className={`${compact ? "px-2.5 text-xs" : "px-3 text-sm"} rounded-lg border border-slate-200 py-1 font-extrabold dark:border-slate-600`} style={{ color: VAR_COLORS.result }}>
            {ultraCompact
              ? interpolateSceneCopy(sceneCopy.ui.slopeBadge.ultraCompact, { slope: slope.toFixed(2) })
              : compact
                ? interpolateSceneCopy(sceneCopy.ui.slopeBadge.compact, { slope: slope.toFixed(2) })
                : interpolateSceneCopy(sceneCopy.ui.slopeBadge.full, { slope: slope.toFixed(2) })}
          </span>
          {editingVar === "h" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className={`${compact ? "w-16" : "ml-auto w-20"} rounded-lg border-2 px-2 py-1 text-xs font-bold outline-none`} style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} />
          ) : (
            <button onClick={() => handleBadgeClick("h", h)} className={`${compact ? "" : "ml-auto"} cursor-text rounded-lg border border-slate-200 ${compact ? "px-2.5 text-[11px]" : "px-3 text-xs"} py-1 font-semibold transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800`} style={{ color: VAR_COLORS.secondary }} type="button" title="Click to type a value">
              {ultraCompact ? `h${h.toFixed(2)}` : compact ? `h ${h.toFixed(2)}` : `h = ${h.toFixed(2)}`}
            </button>
          )}
        </div>

        {/* Chart */}
        <div
          ref={frame.containerRef}
          className="min-h-0 flex-1"
          style={{ cursor: isDragging ? "grabbing" : "crosshair", touchAction: "none" }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onClick={handleChartClick}
        >
          <svg width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
            {xTicks.map((tick) => (
              <line
                key={`grid-x-${tick}`}
                x1={frame.xScale(tick)}
                x2={frame.xScale(tick)}
                y1={frame.plotTop}
                y2={frame.plotBottom}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
            ))}
            {yTicks.map((tick) => (
              <line
                key={`grid-y-${tick}`}
                x1={frame.plotLeft}
                x2={frame.plotRight}
                y1={frame.yScale(tick)}
                y2={frame.yScale(tick)}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
            ))}

            <line x1={frame.plotLeft} x2={frame.plotRight} y1={frame.plotBottom} y2={frame.plotBottom} stroke="#cbd5e1" />
            <line x1={frame.plotLeft} x2={frame.plotLeft} y1={frame.plotTop} y2={frame.plotBottom} stroke="#cbd5e1" />

            {showArea && areaPath && <path d={areaPath} fill={VAR_COLORS.primary} opacity={0.12} />}
            <path d={curvePath} fill="none" stroke="#1e293b" strokeWidth={3} />

            {showDeriv && (
              <path
                d={buildLinePath({
                  data: curveData,
                  xScale: frame.xScale,
                  yScale: frame.yScale,
                  x: (point) => point.x,
                  y: (point) => point.deriv,
                })}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.5}
              />
            )}

            <path
              d={tangentPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={isNearLimit ? 2.5 : 1.5}
              strokeDasharray={isNearLimit ? undefined : "6 4"}
              opacity={isNearLimit ? 0.6 : 0.3}
            />
            <path d={secantPath} fill="none" stroke={VAR_COLORS.secondary} strokeWidth={2.5} opacity={0.8} />

            <line x1={frame.xScale(t)} x2={frame.xScale(t)} y1={frame.plotTop} y2={frame.plotBottom} stroke={VAR_COLORS.primary} strokeDasharray="4 3" strokeWidth={1} opacity={0.4} />
            <line x1={frame.xScale(t + h)} x2={frame.xScale(t + h)} y1={frame.plotTop} y2={frame.plotBottom} stroke={VAR_COLORS.secondary} strokeDasharray="4 3" strokeWidth={1} opacity={0.3} />

            {xTicks.map((tick) => (
              <g key={`tick-x-${tick}`}>
                <line x1={frame.xScale(tick)} x2={frame.xScale(tick)} y1={frame.plotBottom} y2={frame.plotBottom + 6} stroke="#cbd5e1" />
                <text x={frame.xScale(tick)} y={frame.plotBottom + 18} textAnchor="middle" fontSize={compact ? "10" : "12"} fill="#94a3b8">
                  {tick.toFixed(0)}
                </text>
              </g>
            ))}
            {yTicks.map((tick) => (
              <g key={`tick-y-${tick}`}>
                <line x1={frame.plotLeft - 6} x2={frame.plotLeft} y1={frame.yScale(tick)} y2={frame.yScale(tick)} stroke="#cbd5e1" />
                <text x={frame.plotLeft - 10} y={frame.yScale(tick) + 4} textAnchor="end" fontSize={compact ? "10" : "12"} fill="#94a3b8">
                  {tick.toFixed(0)}
                </text>
              </g>
            ))}

            <text x={(frame.plotLeft + frame.plotRight) / 2} y={frame.height - 6} textAnchor="middle" fontSize={compact ? "11" : "13"} fill="#64748b" fontWeight="600">
              {ultraCompact ? "" : "x"}
            </text>
            <text
              x={16}
              y={(frame.plotTop + frame.plotBottom) / 2}
              textAnchor="middle"
              fontSize={compact ? "11" : "13"}
              fill="#64748b"
              fontWeight="600"
              transform={`rotate(-90 16 ${(frame.plotTop + frame.plotBottom) / 2})`}
            >
              {ultraCompact ? "" : "y"}
            </text>

            <circle
              cx={frame.xScale(t)}
              cy={frame.yScale(f(t))}
              r={isDragging ? 13 : 10}
              fill={VAR_COLORS.primary}
              stroke="white"
              strokeWidth={3}
              style={{
                cursor: isDragging ? "grabbing" : "grab",
                filter: isDragging ? "drop-shadow(0 0 6px rgba(59,130,246,0.5))" : undefined,
              }}
            />
            <circle
              cx={frame.xScale(t + h)}
              cy={frame.yScale(f(t + h))}
              r={6}
              fill={VAR_COLORS.secondary}
              stroke="white"
              strokeWidth={2}
            />
          </svg>
        </div>

        {/* Toggle buttons */}
        <div className={`flex border-t border-slate-100 dark:border-slate-700 ${compact ? "flex-wrap gap-2 px-3 py-2.5" : "items-center gap-3 px-4 py-2"}`}>
          <button
            onClick={() => setShowArea(v => !v)}
            className={`rounded-full border ${compact ? "px-3.5 py-1.5" : "px-4 py-1"} text-xs font-semibold transition-colors`}
            style={{
              backgroundColor: showArea ? "#4f73ff" : "white",
              borderColor: showArea ? "#4f73ff" : "#e2e8f0",
              color: showArea ? "white" : "#64748b",
            }}
          >
            {ultraCompact
              ? (showArea ? sceneCopy.ui.areaToggle.ultraCompactOn : sceneCopy.ui.areaToggle.ultraCompactOff)
              : (showArea ? sceneCopy.ui.areaToggle.fullOn : sceneCopy.ui.areaToggle.fullOff)}
          </button>
          <button
            onClick={() => setShowDeriv(v => !v)}
            className={`rounded-full border ${compact ? "px-3.5 py-1.5" : "px-4 py-1"} text-xs font-semibold transition-colors`}
            style={{
              backgroundColor: showDeriv ? "#06b6d4" : "white",
              borderColor: showDeriv ? "#06b6d4" : "#e2e8f0",
              color: showDeriv ? "white" : "#64748b",
            }}
          >
            {ultraCompact
              ? (showDeriv ? sceneCopy.ui.derivativeToggle.ultraCompactOn : sceneCopy.ui.derivativeToggle.ultraCompactOff)
              : (showDeriv ? sceneCopy.ui.derivativeToggle.fullOn : sceneCopy.ui.derivativeToggle.fullOff)}
          </button>
          <div className={`${compact ? "w-full pt-0.5" : "ml-auto"} flex items-center gap-2 text-xs text-slate-400`}>
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: "#94a3b8", height: 2 }} />
            <span>{ultraCompact ? sceneCopy.ui.tangentLegend.ultraCompact : compact ? sceneCopy.ui.tangentLegend.compact : sceneCopy.ui.tangentLegend.full}</span>
            <span className="ml-2 inline-block h-0.5 w-4" style={{ backgroundColor: VAR_COLORS.secondary, height: 2 }} />
            <span>{ultraCompact ? sceneCopy.ui.secantLegend.ultraCompact : compact ? sceneCopy.ui.secantLegend.compact : sceneCopy.ui.secantLegend.full}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
