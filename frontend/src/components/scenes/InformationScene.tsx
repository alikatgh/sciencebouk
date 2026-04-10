import type { ReactElement } from "react"
import { useMemo, useState, useCallback } from "react"
import {
  buildAreaPath,
  buildLinePath,
  getTicks,
  useChartFrame,
} from "../charts/simpleChart"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { getLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

function shannonEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)
}

const variables: Variable[] = [
  { name: 'p', symbol: 'p', latex: 'p', value: 0.5, min: 0.01, max: 0.99, step: 0.01, color: VAR_COLORS.primary, description: 'Probability of outcome A' },
]

const lessonCopy = getLessonCopy("information")

const lessons: LessonStep[] = [
  { id: 'max-entropy', instruction: lessonCopy["max-entropy"].instruction, hint: lessonCopy["max-entropy"].hint, highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'value_reached', target: 'p', value: 0.5, tolerance: 0.05 }, celebration: 'subtle', insight: lessonCopy["max-entropy"].insight },
  { id: 'low-entropy', instruction: lessonCopy["low-entropy"].instruction, hint: lessonCopy["low-entropy"].hint, highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'value_reached', target: 'p', value: 0.99, tolerance: 0.03 }, celebration: 'subtle', insight: lessonCopy["low-entropy"].insight },
  { id: 'explore-curve', instruction: lessonCopy["explore-curve"].instruction, hint: lessonCopy["explore-curve"].hint, highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'variable_changed', target: 'p' }, celebration: 'big', insight: lessonCopy["explore-curve"].insight },
]

export function InformationScene(): ReactElement {
  return (
    <TeachableEquation
      hook="You're playing 20 Questions. If the answer is almost certainly 'yes', the question was useless. The most useful question is the one you're most uncertain about."
      hookAction="Drag the probability to see how uncertainty changes."
      formula="{H} = -{p}\u00D7log({p}) - (1-{p})\u00D7log(1-{p})"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        const H = shannonEntropy(v.p)
        return `H = -{\\color{#3b82f6}${v.p.toFixed(2)}}\\log({\\color{#3b82f6}${v.p.toFixed(2)}}) - ${(1 - v.p).toFixed(2)}\\log(${(1 - v.p).toFixed(2)}) = {\\color{#ef4444}${H.toFixed(3)}}`
      }}
      buildResultLine={(v) => `H = ${shannonEntropy(v.p).toFixed(4)} \\;\\text{bits}`}
      describeResult={(v) => {
        const H = shannonEntropy(v.p)
        if (H > 0.95) return "Maximum uncertainty -- a fair coin"
        if (H < 0.2) return "Almost certain -- very little information"
        return `${H.toFixed(2)} bits of uncertainty per outcome`
      }}
      presets={[
        { label: "Fair coin (p=0.5)", values: { p: 0.5 } },
        { label: "Biased (p=0.9)", values: { p: 0.9 } },
        { label: "Certain (p=0.99)", values: { p: 0.99 } },
      ]}
    >
      {({ vars, setVar }) => (
        <InformationChart prob={vars.p} onVarChange={setVar} />
      )}
    </TeachableEquation>
  )
}

interface InformationChartProps {
  prob: number
  onVarChange?: (name: string, value: number) => void
}

function InformationChart({ prob, onVarChange }: InformationChartProps): ReactElement {
  const entropy = shannonEntropy(prob)
  const q = 1 - prob
  const frame = useChartFrame({
    margin: { top: 20, right: 30, bottom: 36, left: 50 },
    minHeight: 300,
    xDomain: [0, 1],
    yDomain: [0, 1.1],
  })

  const [flips, setFlips] = useState<boolean[]>([])
  const [lastOutcome, setLastOutcome] = useState<string | null>(null)
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const handleFlip = useCallback(() => {
    const r = Math.random() < prob
    setFlips(prev => [...prev.slice(-49), r])
    setLastOutcome(r ? "H" : "T")
  }, [prob])

  const handleReset = useCallback(() => {
    setFlips([])
    setLastOutcome(null)
  }, [])

  const handleBadgeClick = useCallback((varName: string, currentValue: number) => {
    setEditingVar(varName)
    setEditValue(String(currentValue))
  }, [])

  const handleEditSubmit = useCallback(() => {
    if (editingVar && onVarChange) {
      const val = Number(editValue)
      if (!isNaN(val)) {
        if (editingVar === "p") onVarChange("p", Math.max(0.01, Math.min(0.99, Math.round(val * 100) / 100)))
      }
    }
    setEditingVar(null)
  }, [editingVar, editValue, onVarChange])

  const handleChartClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onVarChange) {
      const x = frame.clientXToX(event.clientX)
      if (x == null) return
      onVarChange("p", Math.max(0.01, Math.min(0.99, Math.round(x * 100) / 100)))
    }
  }, [frame, onVarChange])

  const data = useMemo(() => {
    const pts: Array<{ x: number; y: number; fill?: number }> = []
    for (let x = 0.01; x <= 0.99; x += 0.005) {
      const y = shannonEntropy(x)
      pts.push({
        x: Math.round(x * 1000) / 1000,
        y,
        fill: x <= prob ? y : 0,
      })
    }
    return pts
  }, [prob])

  const heads = flips.filter(f => f).length
  const tails = flips.length - heads
  const surpriseH = prob > 0 ? -Math.log2(prob) : Infinity
  const surpriseT = q > 0 ? -Math.log2(q) : Infinity
  const compact = frame.width < 420
  const ultraCompact = frame.width < 380
  const xTicks = useMemo(() => getTicks([0, 1], ultraCompact ? 3 : compact ? 4 : 5), [compact, ultraCompact])
  const yTicks = useMemo(() => getTicks([0, 1.1], ultraCompact ? 3 : compact ? 4 : 5), [compact, ultraCompact])
  const fillPath = useMemo(() => buildAreaPath({
    data,
    xScale: frame.xScale,
    yScale: frame.yScale,
    x: (point) => point.x,
    y0: () => 0,
    y1: (point) => point.fill ?? 0,
  }), [data, frame.xScale, frame.yScale])
  const linePath = useMemo(() => buildLinePath({
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
          {editingVar === "p" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className={`w-20 rounded-lg border-2 px-2 py-1 font-bold outline-none ${ultraCompact ? "text-[11px]" : compact ? "text-xs" : "text-sm"}`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("p", prob)} className={`cursor-text rounded-lg border font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 ${ultraCompact ? "px-2 py-1 text-[11px]" : compact ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-sm"}`} style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              p = {prob.toFixed(2)}
            </button>
          )}
          <span className={`ml-auto rounded-lg border border-slate-200 font-extrabold dark:border-slate-600 ${ultraCompact ? "px-2 py-1 text-[11px]" : compact ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-sm"}`} style={{ color: VAR_COLORS.result }}>
            {ultraCompact ? `H ${entropy.toFixed(3)}` : `H = ${entropy.toFixed(4)} bits`}
          </span>
        </div>

        {/* Chart area */}
        <div
          ref={frame.containerRef}
          className="min-h-0 flex-1"
          style={{ minHeight: 300, cursor: "crosshair" }}
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

            {fillPath && <path d={fillPath} fill={VAR_COLORS.primary} opacity={0.15} />}
            <path d={linePath} fill="none" stroke="#1e40af" strokeWidth={2.5} />

            <line x1={frame.plotLeft} x2={frame.plotRight} y1={frame.yScale(1)} y2={frame.yScale(1)} stroke="#f59e0b" strokeDasharray="4 4" />
            <line x1={frame.xScale(0.5)} x2={frame.xScale(0.5)} y1={frame.plotTop} y2={frame.plotBottom} stroke="#f59e0b" strokeDasharray="4 4" />
            <line x1={frame.xScale(prob)} x2={frame.xScale(prob)} y1={frame.plotTop} y2={frame.plotBottom} stroke="#ef4444" strokeDasharray="4 3" />
            <circle cx={frame.xScale(prob)} cy={frame.yScale(entropy)} r={7} fill="#ef4444" stroke="white" strokeWidth={2} />

            <text x={frame.plotRight - 4} y={frame.yScale(1) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="#f59e0b">
              {ultraCompact ? "1b" : compact ? "max 1b" : "max = 1 bit"}
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
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}

            <text x={(frame.plotLeft + frame.plotRight) / 2} y={frame.height - 8} textAnchor="middle" fontSize="13" fill="#94a3b8">
              {compact ? "p" : "Probability p"}
            </text>
            <text
              x={16}
              y={(frame.plotTop + frame.plotBottom) / 2}
              textAnchor="middle"
              fontSize="13"
              fill="#94a3b8"
              transform={`rotate(-90 16 ${(frame.plotTop + frame.plotBottom) / 2})`}
            >
              {ultraCompact ? "H" : compact ? "H" : "H (bits)"}
            </text>
          </svg>
        </div>

        {/* Coin flip simulator + entropy display */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          {/* Coin display */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{
              backgroundColor: lastOutcome === "H" ? "#3b82f6" : lastOutcome === "T" ? "#10b981" : "#e2e8f0",
              color: lastOutcome ? "white" : "#94a3b8",
            }}
          >
            {lastOutcome ?? "?"}
          </div>

          {/* Buttons */}
          <button
            onClick={handleFlip}
            className={`rounded-lg bg-ocean font-semibold text-white transition-colors hover:bg-blue-900 ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-1.5 text-sm"}`}
          >
            Flip
          </button>
          <button
            onClick={handleReset}
            className={`rounded-lg bg-slate-500 font-semibold text-white transition-colors hover:bg-slate-600 ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-1.5 text-sm"}`}
          >
            Reset
          </button>

          {/* Tally */}
          <div className={`flex flex-wrap gap-3 font-semibold ${ultraCompact ? "text-[11px]" : compact ? "text-xs" : "text-sm"}`}>
            <span className="text-blue-600">H: {heads}</span>
            <span className="text-emerald-600">T: {tails}</span>
            <span className="text-slate-500">{ultraCompact ? `${flips.length}` : compact ? `n: ${flips.length}` : `Total: ${flips.length}`}</span>
          </div>

          {/* Surprise */}
          <div className={`ml-auto flex flex-col ${compact ? "w-full text-[11px]" : "text-xs"}`}>
            <span className="text-blue-600">{ultraCompact ? `H ${surpriseH === Infinity ? "\u221E" : surpriseH.toFixed(2)}b` : compact ? `H info: ${surpriseH === Infinity ? "\u221E" : surpriseH.toFixed(2)}b` : `Surprise(H): ${surpriseH === Infinity ? "\u221E" : surpriseH.toFixed(2)} bits`}</span>
            <span className="text-emerald-600">{ultraCompact ? `T ${surpriseT === Infinity ? "\u221E" : surpriseT.toFixed(2)}b` : compact ? `T info: ${surpriseT === Infinity ? "\u221E" : surpriseT.toFixed(2)}b` : `Surprise(T): ${surpriseT === Infinity ? "\u221E" : surpriseT.toFixed(2)} bits`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
