import type { ReactElement } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { buildAreaPath, buildLinePath, getTicks, useChartFrame } from "../charts/simpleChart"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

function pdf(x: number, mu: number, sigma: number): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2))
}

const variables: Variable[] = [
  { name: "phi", symbol: "\u03A6", latex: "\\Phi", value: 0, min: 0, max: 1, step: 0.01, color: VAR_COLORS.result, constant: true, description: "Probability density" },
  { name: "mu", symbol: "\u03BC", latex: "\\mu", value: 0, min: -3, max: 3, step: 0.1, color: VAR_COLORS.primary, description: "Center of the bell curve" },
  { name: "sigma", symbol: "\u03C3", latex: "\\sigma", value: 1, min: 0.3, max: 3, step: 0.1, color: VAR_COLORS.secondary, description: "Width/spread of the curve" },
]

const lessons: LessonStep[] = [
  { id: "touch", instruction: "See the blue \u03BC? That's the center. Drag it left or right.", hint: "Drag \u03BC in the formula.", highlightElements: ["mu"], unlockedVariables: ["mu"], lockedVariables: ["sigma"], successCondition: { type: "variable_changed", target: "mu" }, celebration: "subtle", insight: "The whole curve shifts. \u03BC is where the average is — the peak." },
  { id: "width", instruction: "Now drag \u03C3 to make the curve wider or narrower.", hint: "Drag \u03C3 upward for wider.", highlightElements: ["sigma"], unlockedVariables: ["sigma"], lockedVariables: ["mu"], successCondition: { type: "variable_changed", target: "sigma" }, celebration: "subtle", insight: "Bigger \u03C3 = more spread. Tiny \u03C3 = everyone clustered at the average." },
  { id: "regions", instruction: "Set \u03C3=1 — the shaded region is 68% of all data.", hint: "Drag \u03C3 to 1.0.", highlightElements: ["mu", "sigma"], unlockedVariables: ["mu", "sigma"], successCondition: { type: "value_reached", target: "sigma", value: 1, tolerance: 0.2 }, celebration: "big", insight: "68% within 1\u03C3, 95% within 2\u03C3, 99.7% within 3\u03C3. Works for everything — heights, scores, manufacturing." },
]

export function NormalDistributionScene(): ReactElement {
  return (
    <TeachableEquation
      hook="In a class of 1000 students, how many score above 90%? This curve answers that."
      hookAction="Drag the center and width to see how scores spread."
      formula="{phi} = (1/\u221A(2\u03C0{sigma}\u00B2)) \u00D7 e^(-(x-{mu})\u00B2/(2{sigma}\u00B2))"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const peak = pdf(v.mu, v.mu, v.sigma)
        return `\\Phi = \\frac{1}{\\sqrt{2\\pi \\cdot {\\color{#f59e0b}${v.sigma.toFixed(1)}}^2}} e^{-\\frac{(x-{\\color{#3b82f6}${v.mu.toFixed(1)}})^2}{2\\cdot{\\color{#f59e0b}${v.sigma.toFixed(1)}}^2}} = {\\color{#ef4444}${peak.toFixed(3)}}`
      }}
      buildResultLine={(v) => `\\Phi_{\\text{peak}} = ${pdf(v.mu, v.mu, v.sigma).toFixed(3)}`}
      describeResult={(v) => {
        if (v.sigma <= 0.5) return "Very narrow — 68% within " + v.sigma.toFixed(1) + " of the mean"
        if (v.sigma >= 2.5) return "Very spread out — high variance"
        return "68% within \u00B1" + v.sigma.toFixed(1) + " of the mean"
      }}
      presets={[
        { label: "Standard", values: { mu: 0, sigma: 1 } },
        { label: "Wide", values: { mu: 0, sigma: 2.5 } },
        { label: "Narrow", values: { mu: 0, sigma: 0.5 } },
      ]}
    >
      {({ vars, setVar, highlightedVar }) => (
        <NormalChart mu={vars.mu} sigma={vars.sigma} highlightedVar={highlightedVar} onVarChange={setVar} />
      )}
    </TeachableEquation>
  )
}

interface NormalChartProps {
  mu: number
  sigma: number
  highlightedVar: string | null
  onVarChange?: (name: string, value: number) => void
}

function NormalChart({ mu, sigma, highlightedVar, onVarChange }: NormalChartProps): ReactElement {
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const onVarChangeRef = useRef(onVarChange)
  onVarChangeRef.current = onVarChange

  const xDomainMin = mu - 4 * sigma
  const xDomainMax = mu + 4 * sigma
  const peak = pdf(mu, mu, sigma)
  const frame = useChartFrame({
    margin: { top: 10, right: 20, bottom: 28, left: 56 },
    minHeight: 320,
    xDomain: [xDomainMin, xDomainMax],
    yDomain: [0, peak * 1.15],
  })

  const handleBadgeClick = useCallback((varName: string, currentValue: number) => {
    setEditingVar(varName)
    setEditValue(String(currentValue))
  }, [])

  const handleEditSubmit = useCallback(() => {
    if (editingVar && onVarChange) {
      const val = Number(editValue)
      if (!isNaN(val)) {
        if (editingVar === "mu") onVarChange("mu", Math.max(-3, Math.min(3, Math.round(val * 10) / 10)))
        if (editingVar === "sigma") onVarChange("sigma", Math.max(0.3, Math.min(3, Math.round(val * 10) / 10)))
      }
    }
    setEditingVar(null)
  }, [editingVar, editValue, onVarChange])

  const pointerToMu = useCallback((clientX: number): number => {
    const val = frame.clientXToX(clientX)
    if (val == null) return mu
    return Math.round(Math.max(-3, Math.min(3, val)) * 10) / 10
  }, [frame, mu])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    if (onVarChangeRef.current) {
      onVarChangeRef.current("mu", pointerToMu(e.clientX))
    }
  }, [pointerToMu])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    if (onVarChangeRef.current) {
      onVarChangeRef.current("mu", pointerToMu(e.clientX))
    }
  }, [isDragging, pointerToMu])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const data = useMemo(() => {
    const xMin = mu - 4 * sigma
    const xMax = mu + 4 * sigma
    const step = (xMax - xMin) / 200
    const pts: Array<{ x: number; y: number; shade1?: number; shade2?: number; shade3?: number }> = []
    for (let x = xMin; x <= xMax; x += step) {
      const y = pdf(x, mu, sigma)
      const d = Math.abs(x - mu)
      pts.push({
        x: Math.round(x * 100) / 100,
        y,
        shade1: d <= sigma ? y : 0,
        shade2: d <= 2 * sigma ? y : 0,
        shade3: d <= 3 * sigma ? y : 0,
      })
    }
    return pts
  }, [mu, sigma])

  const muHighlighted = highlightedVar === "mu"
  const sigmaHighlighted = highlightedVar === "sigma"
  const xTicks = useMemo(() => getTicks([xDomainMin, xDomainMax], 8), [xDomainMin, xDomainMax])
  const yTicks = useMemo(() => getTicks([0, peak * 1.15], 5), [peak])
  const shade3Path = useMemo(() => buildAreaPath({
    data,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y0: () => 0,
    y1: (point) => point.shade3,
  }), [data, frame.xScale, frame.yScale])
  const shade2Path = useMemo(() => buildAreaPath({
    data,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y0: () => 0,
    y1: (point) => point.shade2,
  }), [data, frame.xScale, frame.yScale])
  const shade1Path = useMemo(() => buildAreaPath({
    data,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y0: () => 0,
    y1: (point) => point.shade1,
  }), [data, frame.xScale, frame.yScale])
  const curvePath = useMemo(() => buildLinePath({
    data,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y: (point) => point.y,
  }), [data, frame.xScale, frame.yScale])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Info bar -- clickable badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {editingVar === "mu" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("mu", mu)} className="cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              {"\u03BC"} = {mu.toFixed(1)}
            </button>
          )}
          {editingVar === "sigma" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} />
          ) : (
            <button onClick={() => handleBadgeClick("sigma", sigma)} className="cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.secondary, color: VAR_COLORS.secondary }} type="button" title="Click to type a value">
              {"\u03C3"} = {sigma.toFixed(1)}
            </button>
          )}
          <span className="ml-auto rounded-lg border border-slate-200 px-3 py-1 text-sm font-extrabold dark:border-slate-600" style={{ color: VAR_COLORS.result }}>
            peak = {pdf(mu, mu, sigma).toFixed(3)}
          </span>
        </div>

        {/* Chart */}
        <div ref={frame.containerRef} className="relative min-h-0 flex-1" style={{ minHeight: 300 }}>
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
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

            {shade3Path && <path d={shade3Path} fill="#dbeafe" opacity={0.3} />}
            {shade2Path && <path d={shade2Path} fill="#93c5fd" opacity={0.3} />}
            {shade1Path && <path d={shade1Path} fill={VAR_COLORS.primary} opacity={0.25} />}
            <path d={curvePath} fill="none" stroke="#1e293b" strokeWidth={2.5} />

            <line
              x1={frame.xScale(mu)}
              x2={frame.xScale(mu)}
              y1={frame.plotTop}
              y2={frame.plotBottom}
              stroke={muHighlighted ? VAR_COLORS.primary : "#3b82f6"}
              strokeWidth={muHighlighted ? 3 : 1.5}
              strokeDasharray="6 3"
            />
            <line
              x1={frame.xScale(mu - sigma)}
              x2={frame.xScale(mu - sigma)}
              y1={frame.plotTop}
              y2={frame.plotBottom}
              stroke={sigmaHighlighted ? VAR_COLORS.secondary : "#e2e8f0"}
              strokeDasharray="4 4"
            />
            <line
              x1={frame.xScale(mu + sigma)}
              x2={frame.xScale(mu + sigma)}
              y1={frame.plotTop}
              y2={frame.plotBottom}
              stroke={sigmaHighlighted ? VAR_COLORS.secondary : "#e2e8f0"}
              strokeDasharray="4 4"
            />
            <line
              x1={frame.xScale(mu - 2 * sigma)}
              x2={frame.xScale(mu - 2 * sigma)}
              y1={frame.plotTop}
              y2={frame.plotBottom}
              stroke="#f1f5f9"
              strokeDasharray="3 3"
            />
            <line
              x1={frame.xScale(mu + 2 * sigma)}
              x2={frame.xScale(mu + 2 * sigma)}
              y1={frame.plotTop}
              y2={frame.plotBottom}
              stroke="#f1f5f9"
              strokeDasharray="3 3"
            />

            <text x={frame.xScale(mu)} y={frame.plotTop + 14} textAnchor="middle" fontSize="13" fontWeight="700" fill={VAR_COLORS.primary}>
              μ = {mu.toFixed(1)}
            </text>
            <text x={frame.xScale(mu + sigma)} y={frame.plotTop + 30} textAnchor="middle" fontSize="11" fill={VAR_COLORS.secondary}>
              +1σ
            </text>
            <text x={frame.xScale(mu + 2 * sigma)} y={frame.plotTop + 44} textAnchor="middle" fontSize="10" fill="#94a3b8">
              +2σ
            </text>

            {xTicks.map((tick) => (
              <g key={`tick-x-${tick}`}>
                <line x1={frame.xScale(tick)} x2={frame.xScale(tick)} y1={frame.plotBottom} y2={frame.plotBottom + 6} stroke="#cbd5e1" />
                <text x={frame.xScale(tick)} y={frame.plotBottom + 18} textAnchor="middle" fontSize="12" fill="#94a3b8">
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            {yTicks.map((tick) => (
              <g key={`tick-y-${tick}`}>
                <line x1={frame.plotLeft - 6} x2={frame.plotLeft} y1={frame.yScale(tick)} y2={frame.yScale(tick)} stroke="#cbd5e1" />
                <text x={frame.plotLeft - 10} y={frame.yScale(tick) + 4} textAnchor="end" fontSize="12" fill="#94a3b8">
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Percentage labels */}
        <div className="flex items-center justify-center gap-4 border-t border-slate-100 px-4 py-2 text-[10px] font-medium dark:border-slate-700">
          <span className="text-blue-600">1{"\u03C3"}: 68.27%</span>
          <span className="text-blue-400">2{"\u03C3"}: 95.45%</span>
          <span className="text-blue-300">3{"\u03C3"}: 99.73%</span>
        </div>
      </div>
    </div>
  )
}
