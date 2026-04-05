import type { ReactElement } from "react"
import { useCallback, useMemo, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, ScatterChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Tooltip as RTooltip,
} from "recharts"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

const variables: Variable[] = [
  { name: 'r', symbol: 'r', latex: 'r', value: 3.2, min: 2.5, max: 4.0, step: 0.001, color: VAR_COLORS.primary, description: 'Growth parameter' },
  { name: 'x0', symbol: 'x\u2080', latex: 'x_0', value: 0.5, min: 0.1, max: 0.9, step: 0.01, color: VAR_COLORS.secondary, description: 'Initial population value' },
]

const lessons: LessonStep[] = [
  {
    id: 'stable',
    instruction: "Drag the blue r down to about 2.8. Watch the time series settle to a single value.",
    hint: "Drag r in the formula down to 2.80.",
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 2.8, tolerance: 0.15 },
    celebration: 'subtle',
    insight: "At r=2.8, the system settles to a fixed point. This is like a stable ecosystem -- the population finds its equilibrium and stays there.",
  },
  {
    id: 'oscillation',
    instruction: "Now drag r up to about 3.2. Watch the time series start to oscillate between two values.",
    hint: "Increase r to about 3.20.",
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 3.2, tolerance: 0.15 },
    celebration: 'subtle',
    insight: "The system now bounces between two values -- a period-2 cycle. Like a population that overshoots, then undershoots, then overshoots again. Predictable, but no longer a fixed point.",
  },
  {
    id: 'chaos',
    instruction: "Push r all the way up to about 3.8. Welcome to chaos.",
    hint: "Drag r up to 3.80.",
    highlightElements: ['r'],
    unlockedVariables: ['r'],
    lockedVariables: ['x0'],
    successCondition: { type: 'value_reached', target: 'r', value: 3.8, tolerance: 0.1 },
    celebration: 'medium',
    insight: "The time series now looks random, but it's not -- it follows a deterministic equation. This is chaos: perfectly predictable rules producing apparently unpredictable behavior.",
  },
  {
    id: 'butterfly',
    instruction: "Now unlock: change x\u2080 by just 0.01. Even a tiny change in initial conditions leads to a completely different trajectory.",
    hint: "Drag the amber x\u2080 slightly up or down.",
    highlightElements: ['x0'],
    unlockedVariables: ['r', 'x0'],
    successCondition: { type: 'variable_changed', target: 'x0' },
    celebration: 'big',
    insight: "This is the butterfly effect. In a chaotic system, a butterfly flapping its wings in Brazil can change the weather in Texas. That's why weather forecasts fail after about 10 days -- tiny measurement errors grow exponentially.",
  },
]

export function ChaosScene(): ReactElement {
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
        if (v.r < 3) return "Stable -- converges to a single value"
        if (v.r < 3.449) return "Period-2 -- oscillates between two values"
        if (v.r < 3.57) return "Period-doubling -- oscillations get more complex"
        if (v.r < 3.82) return "Chaos -- deterministic but unpredictable"
        if (v.r < 3.86) return "Period-3 window -- brief order in the chaos"
        return "Deep chaos -- the butterfly effect in action"
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

  const handleBifurcationClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.r != null && onVarChange) {
      const rVal = Number(data.activePayload[0].payload.r)
      onVarChange("r", Math.max(2.5, Math.min(4.0, Math.round(rVal * 1000) / 1000)))
    }
  }, [onVarChange])

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

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Header with clickable badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <span className="text-sm font-bold text-ink">Bifurcation Diagram</span>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-ink dark:border-slate-600 dark:bg-slate-700">
            {periodText}
          </span>
          {editingVar === "r" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="ml-auto w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("r", r)} className="ml-auto cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              r = {r.toFixed(3)}
            </button>
          )}
          {editingVar === "x0" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} />
          ) : (
            <button onClick={() => handleBadgeClick("x0", x0)} className="cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} type="button" title="Click to type a value">
              x&#8320; = {x0.toFixed(2)}
            </button>
          )}
        </div>

        {/* Bifurcation diagram -- top half */}
        <div className="min-h-0 flex-1" style={{ minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: 10 }} onClick={handleBifurcationClick} style={{ cursor: "crosshair" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="r" type="number"
                domain={[2.5, 4.0]}
                tickCount={7}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "r", position: "bottom", offset: -4, fill: "#64748b", fontSize: 13, fontWeight: 600 }}
              />
              <YAxis
                dataKey="x" type="number"
                domain={[0, 1]}
                tickCount={6}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "x", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 13, fontWeight: 600 }}
                width={35}
              />
              <Scatter data={bifurcationData} fill="#1e293b" opacity={0.5} isAnimationActive={false}>
                {/* Tiny dots via shape */}
              </Scatter>
              <ReferenceLine
                x={r}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Time series -- bottom half */}
        <div className="min-h-0 flex-1 border-t border-slate-100 dark:border-slate-700" style={{ minHeight: 200 }}>
          <div className="px-4 pt-1">
            <span className="text-sm font-bold text-ink">Time Series</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="t" type="number"
                domain={[0, 59]}
                tickCount={7}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "iteration t", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
              />
              <YAxis
                dataKey="x" type="number"
                domain={[0, 1]}
                tickCount={6}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                width={35}
              />
              <RTooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                formatter={(value: any) => [Number(value).toFixed(4), "x"]}
                labelFormatter={(label: any) => `t = ${label}`}
              />
              <Line dataKey="x" stroke="#5a79ff" strokeWidth={2} dot={{ r: 1.5, fill: "#5a79ff" }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
