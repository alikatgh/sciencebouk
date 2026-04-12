import type { ReactElement } from "react"
import { useCallback, useMemo, useState } from "react"
import { buildLinePath, getTicks, useChartFrame } from "../charts/simpleChart"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useSceneCopy } from "../../data/sceneCopy"

const variables: Variable[] = [
  { name: 'r', symbol: 'r', latex: 'r', value: 3.2, min: 2.5, max: 4.0, step: 0.001, color: VAR_COLORS.primary, description: 'Growth parameter' },
  { name: 'x0', symbol: 'x\u2080', latex: 'x_0', value: 0.5, min: 0.1, max: 0.9, step: 0.01, color: VAR_COLORS.secondary, description: 'Initial population value' },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'stable',
    instruction: lessonCopy.stable.instruction,
    hint: lessonCopy.stable.hint,
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 2.8, tolerance: 0.15 },
    celebration: 'subtle',
    insight: lessonCopy.stable.insight,
  },
  {
    id: 'oscillation',
    instruction: lessonCopy.oscillation.instruction,
    hint: lessonCopy.oscillation.hint,
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 3.2, tolerance: 0.15 },
    celebration: 'subtle',
    insight: lessonCopy.oscillation.insight,
  },
  {
    id: 'chaos',
    instruction: lessonCopy.chaos.instruction,
    hint: lessonCopy.chaos.hint,
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 3.8, tolerance: 0.1 },
    celebration: 'medium',
    insight: lessonCopy.chaos.insight,
  },
  {
    id: 'butterfly',
    instruction: lessonCopy.butterfly.instruction,
    hint: lessonCopy.butterfly.hint,
    highlightElements: ['x0'],
    unlockedVariables: ['r', 'x0'],
    successCondition: { type: 'variable_changed', target: 'x0' },
    celebration: 'big',
    insight: lessonCopy.butterfly.insight,
  },
  ]
}

export function ChaosScene(): ReactElement {
  const lessonCopy = useLessonCopy("chaos")
  const sceneCopy = useSceneCopy("chaos")
  const lessons = buildLessons(lessonCopy)
  return (
    <TeachableEquation
      hook="Weather forecasts are useless past 10 days. The tiniest change leads to a completely different outcome. This is the butterfly effect."
      hookAction="Drag the r parameter and watch order dissolve into chaos."
      formula="{x_next} = {r} \u00D7 {x}\u00D7(1-{x})"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        return `x_{n+1} = {\\color{#3b82f6}${v.r.toFixed(3)}} \\times x_n(1-x_n)`
      }}
      buildResultLine={(v) => {
        const xNext = v.r * v.x0 * (1 - v.x0)
        return `x_1 = ${xNext.toFixed(4)}`
      }}
      describeResult={(v) => {
        if (v.r < 3) return sceneCopy.description.stable
        if (v.r < 3.449) return sceneCopy.description.period2
        if (v.r < 3.57) return sceneCopy.description.periodDoubling
        if (v.r < 3.82) return sceneCopy.description.chaos
        if (v.r < 3.86) return sceneCopy.description.period3Window
        return sceneCopy.description.deepChaos
      }}
      presets={[
        { label: "Stable (r=2.8)", values: { r: 2.8, x0: 0.5 } },
        { label: "Period-2 (r=3.2)", values: { r: 3.2, x0: 0.5 } },
        { label: "Chaos (r=3.8)", values: { r: 3.8, x0: 0.5 } },
      ]}
    >
      {({ vars, setVar }) => (
        <ChaosChart r={vars.r} x0={vars.x0} onVarChange={setVar} />
      )}
    </TeachableEquation>
  )
}

interface ChaosChartProps {
  r: number
  x0: number
  onVarChange?: (name: string, value: number) => void
}

function ChaosChart({ r, x0, onVarChange }: ChaosChartProps): ReactElement {
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const bifurcationFrame = useChartFrame({
    margin: { top: 10, right: 20, bottom: 28, left: 44 },
    minHeight: 220,
    xDomain: [2.5, 4],
    yDomain: [0, 1],
  })
  const timeFrame = useChartFrame({
    margin: { top: 8, right: 20, bottom: 28, left: 44 },
    minHeight: 220,
    xDomain: [0, 59],
    yDomain: [0, 1],
  })
  const compact = Math.min(bifurcationFrame.width, timeFrame.width) < 420
  const ultraCompact = Math.min(bifurcationFrame.width, timeFrame.width) < 370

  const handleBadgeClick = useCallback((varName: string, currentValue: number) => {
    setEditingVar(varName)
    setEditValue(String(currentValue))
  }, [])

  const handleEditSubmit = useCallback(() => {
    if (editingVar && onVarChange) {
      const val = Number(editValue)
      if (!isNaN(val)) {
        if (editingVar === "r") onVarChange("r", Math.max(2.5, Math.min(4.0, Math.round(val * 1000) / 1000)))
        if (editingVar === "x0") onVarChange("x0", Math.max(0.1, Math.min(0.9, Math.round(val * 100) / 100)))
      }
    }
    setEditingVar(null)
  }, [editingVar, editValue, onVarChange])

  const handleBifurcationClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onVarChange) return
    const rVal = bifurcationFrame.clientXToX(event.clientX)
    if (rVal == null) return
    onVarChange("r", Math.max(2.5, Math.min(4.0, Math.round(rVal * 1000) / 1000)))
  }, [bifurcationFrame, onVarChange])

  // Bifurcation data (static -- precomputed once)
  const bifurcationData = useMemo(() => {
    const points: Array<{ r: number; x: number }> = []
    for (let rVal = 2.5; rVal <= 4.0; rVal += 0.008) {
      let xVal = 0.5
      for (let i = 0; i < 300; i++) {
        xVal = rVal * xVal * (1 - xVal)
        if (i > 250) {
          points.push({ r: Math.round(rVal * 1000) / 1000, x: Math.round(xVal * 10000) / 10000 })
        }
      }
    }
    return points
  }, [])

  // Time series data
  const timeSeriesData = useMemo(() => {
    const pts: Array<{ t: number; x: number }> = []
    let xVal = x0
    for (let i = 0; i < 60; i++) {
      xVal = r * xVal * (1 - xVal)
      pts.push({ t: i, x: Math.round(xVal * 10000) / 10000 })
    }
    return pts
  }, [r, x0])

  // Period label
  let periodText = "Chaos"
  if (r < 3) periodText = "Period 1 (stable)"
  else if (r < 3.449) periodText = "Period 2"
  else if (r < 3.544) periodText = "Period 4"
  else if (r < 3.5644) periodText = "Period 8"
  else if (r < 3.82) periodText = "Chaos"
  else if (r < 3.86) periodText = "Period 3 window"
  const compactPeriodText = periodText
    .replace("Period 1 (stable)", "P1 stable")
    .replace("Period 2", "P2")
    .replace("Period 4", "P4")
    .replace("Period 8", "P8")
    .replace("Period 3 window", "P3 window")
  const bifurcationXTicks = useMemo(() => getTicks([2.5, 4], ultraCompact ? 4 : compact ? 5 : 7), [compact, ultraCompact])
  const bifurcationYTicks = useMemo(() => getTicks([0, 1], ultraCompact ? 3 : compact ? 4 : 6), [compact, ultraCompact])
  const timeXTicks = useMemo(() => getTicks([0, 59], ultraCompact ? 4 : compact ? 5 : 7), [compact, ultraCompact])
  const timeYTicks = useMemo(() => getTicks([0, 1], ultraCompact ? 3 : compact ? 4 : 6), [compact, ultraCompact])
  const timeSeriesPath = useMemo(() => buildLinePath({
    data: timeSeriesData,
    xScale: timeFrame.xScale,
    yScale: timeFrame.yScale,
    x: (point) => point.t,
    y: (point) => point.x,
  }), [timeFrame.xScale, timeFrame.yScale, timeSeriesData])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Header with clickable badges */}
        <div className={`flex flex-wrap items-center ${compact ? "gap-1.5 px-3 pt-2.5" : "gap-2 px-4 pt-3"}`}>
          <span className={`${compact ? "text-xs" : "text-sm"} font-bold text-ink`}>{ultraCompact ? "Chaos map" : compact ? "Bifurcation" : "Bifurcation Diagram"}</span>
          <span className={`rounded-lg border border-slate-200 bg-white ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1 text-xs"} font-bold text-ink dark:border-slate-600 dark:bg-slate-700`}>
            {ultraCompact ? compactPeriodText.replace(" stable", "") : compact ? compactPeriodText : periodText}
          </span>
          {editingVar === "r" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className={`${compact ? "w-16 text-xs" : "ml-auto w-20 text-sm"} rounded-lg border-2 px-2 py-1 font-bold outline-none`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("r", r)} className={`${compact ? "px-2.5 text-xs" : "ml-auto px-3 text-sm"} cursor-text rounded-lg border py-1 font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              {ultraCompact ? `r${r.toFixed(3)}` : compact ? `r ${r.toFixed(3)}` : `r = ${r.toFixed(3)}`}
            </button>
          )}
          {editingVar === "x0" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className={`${compact ? "w-16 text-xs" : "w-20 text-sm"} rounded-lg border-2 px-2 py-1 font-bold outline-none`} style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} />
          ) : (
            <button onClick={() => handleBadgeClick("x0", x0)} className={`${compact ? "px-2.5 text-xs" : "px-3 text-sm"} cursor-text rounded-lg border py-1 font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800`} style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} type="button" title="Click to type a value">
              {ultraCompact ? `x₀${x0.toFixed(2)}` : compact ? `x₀ ${x0.toFixed(2)}` : `x₀ = ${x0.toFixed(2)}`}
            </button>
          )}
        </div>

        {/* Bifurcation diagram -- top half */}
        <div
          ref={bifurcationFrame.containerRef}
          className="min-h-0 flex-1"
          style={{ minHeight: 200, cursor: "crosshair" }}
          onClick={handleBifurcationClick}
        >
          <svg width={bifurcationFrame.width} height={bifurcationFrame.height} viewBox={`0 0 ${bifurcationFrame.width} ${bifurcationFrame.height}`}>
            {bifurcationXTicks.map((tick) => (
              <line
                key={`bif-grid-x-${tick}`}
                x1={bifurcationFrame.xScale(tick)}
                x2={bifurcationFrame.xScale(tick)}
                y1={bifurcationFrame.plotTop}
                y2={bifurcationFrame.plotBottom}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
            ))}
            {bifurcationYTicks.map((tick) => (
              <line
                key={`bif-grid-y-${tick}`}
                x1={bifurcationFrame.plotLeft}
                x2={bifurcationFrame.plotRight}
                y1={bifurcationFrame.yScale(tick)}
                y2={bifurcationFrame.yScale(tick)}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
            ))}
            <line x1={bifurcationFrame.plotLeft} x2={bifurcationFrame.plotRight} y1={bifurcationFrame.plotBottom} y2={bifurcationFrame.plotBottom} stroke="#cbd5e1" />
            <line x1={bifurcationFrame.plotLeft} x2={bifurcationFrame.plotLeft} y1={bifurcationFrame.plotTop} y2={bifurcationFrame.plotBottom} stroke="#cbd5e1" />

            {bifurcationData.map((point, index) => (
              <circle
                key={`bif-point-${index}`}
                cx={bifurcationFrame.xScale(point.r)}
                cy={bifurcationFrame.yScale(point.x)}
                r={1}
                fill="#1e293b"
                opacity={0.5}
              />
            ))}
            <line
              x1={bifurcationFrame.xScale(r)}
              x2={bifurcationFrame.xScale(r)}
              y1={bifurcationFrame.plotTop}
              y2={bifurcationFrame.plotBottom}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 4"
            />

            {bifurcationXTicks.map((tick) => (
              <g key={`bif-tick-x-${tick}`}>
                <line x1={bifurcationFrame.xScale(tick)} x2={bifurcationFrame.xScale(tick)} y1={bifurcationFrame.plotBottom} y2={bifurcationFrame.plotBottom + 6} stroke="#cbd5e1" />
                <text x={bifurcationFrame.xScale(tick)} y={bifurcationFrame.plotBottom + 18} textAnchor="middle" fontSize={compact ? "10" : "11"} fill="#94a3b8">
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            {bifurcationYTicks.map((tick) => (
              <g key={`bif-tick-y-${tick}`}>
                <line x1={bifurcationFrame.plotLeft - 6} x2={bifurcationFrame.plotLeft} y1={bifurcationFrame.yScale(tick)} y2={bifurcationFrame.yScale(tick)} stroke="#cbd5e1" />
                <text x={bifurcationFrame.plotLeft - 10} y={bifurcationFrame.yScale(tick) + 4} textAnchor="end" fontSize={compact ? "10" : "11"} fill="#94a3b8">
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            <text x={(bifurcationFrame.plotLeft + bifurcationFrame.plotRight) / 2} y={bifurcationFrame.height - 8} textAnchor="middle" fontSize={compact ? "11" : "13"} fill="#64748b" fontWeight="600">
              {ultraCompact ? "" : "r"}
            </text>
            <text
              x={16}
              y={(bifurcationFrame.plotTop + bifurcationFrame.plotBottom) / 2}
              textAnchor="middle"
              fontSize={compact ? "11" : "13"}
              fill="#64748b"
              fontWeight="600"
              transform={`rotate(-90 16 ${(bifurcationFrame.plotTop + bifurcationFrame.plotBottom) / 2})`}
            >
              {ultraCompact ? "" : "x"}
            </text>
          </svg>
        </div>

        {/* Time series -- bottom half */}
        <div className="min-h-0 flex-1 border-t border-slate-100 dark:border-slate-700" style={{ minHeight: 200 }}>
          <div className={`${compact ? "px-3 pt-1.5" : "px-4 pt-1"}`}>
            <span className={`${compact ? "text-xs" : "text-sm"} font-bold text-ink`}>{ultraCompact ? "t-series" : compact ? "Series" : "Time Series"}</span>
          </div>
          <div ref={timeFrame.containerRef} className="h-[85%] min-h-0">
            <svg width={timeFrame.width} height={timeFrame.height} viewBox={`0 0 ${timeFrame.width} ${timeFrame.height}`}>
              {timeXTicks.map((tick) => (
                <line
                  key={`time-grid-x-${tick}`}
                  x1={timeFrame.xScale(tick)}
                  x2={timeFrame.xScale(tick)}
                  y1={timeFrame.plotTop}
                  y2={timeFrame.plotBottom}
                  stroke="#f1f5f9"
                  strokeDasharray="3 3"
                />
              ))}
              {timeYTicks.map((tick) => (
                <line
                  key={`time-grid-y-${tick}`}
                  x1={timeFrame.plotLeft}
                  x2={timeFrame.plotRight}
                  y1={timeFrame.yScale(tick)}
                  y2={timeFrame.yScale(tick)}
                  stroke="#f1f5f9"
                  strokeDasharray="3 3"
                />
              ))}
              <line x1={timeFrame.plotLeft} x2={timeFrame.plotRight} y1={timeFrame.plotBottom} y2={timeFrame.plotBottom} stroke="#cbd5e1" />
              <line x1={timeFrame.plotLeft} x2={timeFrame.plotLeft} y1={timeFrame.plotTop} y2={timeFrame.plotBottom} stroke="#cbd5e1" />
              <path d={timeSeriesPath} fill="none" stroke="#5a79ff" strokeWidth={2} />
              {timeSeriesData.map((point) => (
                <circle key={`time-point-${point.t}`} cx={timeFrame.xScale(point.t)} cy={timeFrame.yScale(point.x)} r={compact ? 1.2 : 1.5} fill="#5a79ff" />
              ))}

              {timeXTicks.map((tick) => (
                <g key={`time-tick-x-${tick}`}>
                  <line x1={timeFrame.xScale(tick)} x2={timeFrame.xScale(tick)} y1={timeFrame.plotBottom} y2={timeFrame.plotBottom + 6} stroke="#cbd5e1" />
                  <text x={timeFrame.xScale(tick)} y={timeFrame.plotBottom + 18} textAnchor="middle" fontSize={compact ? "10" : "11"} fill="#94a3b8">
                    {tick.toFixed(0)}
                  </text>
                </g>
              ))}
              {timeYTicks.map((tick) => (
                <g key={`time-tick-y-${tick}`}>
                  <line x1={timeFrame.plotLeft - 6} x2={timeFrame.plotLeft} y1={timeFrame.yScale(tick)} y2={timeFrame.yScale(tick)} stroke="#cbd5e1" />
                  <text x={timeFrame.plotLeft - 10} y={timeFrame.yScale(tick) + 4} textAnchor="end" fontSize={compact ? "10" : "11"} fill="#94a3b8">
                    {tick.toFixed(1)}
                  </text>
                </g>
              ))}
              <text x={(timeFrame.plotLeft + timeFrame.plotRight) / 2} y={timeFrame.height - 8} textAnchor="middle" fontSize={compact ? "10" : "12"} fill="#94a3b8">
                {ultraCompact ? "" : compact ? "t" : "iteration t"}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
