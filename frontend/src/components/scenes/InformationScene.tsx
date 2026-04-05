import type { ReactElement } from "react"
import { useMemo, useState, useCallback } from "react"
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceDot, Tooltip as RTooltip,
} from "recharts"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

function shannonEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)
}

const variables: Variable[] = [
  { name: 'p', symbol: 'p', latex: 'p', value: 0.5, min: 0.01, max: 0.99, step: 0.01, color: VAR_COLORS.primary, description: 'Probability of outcome A' },
]

const lessons: LessonStep[] = [
  { id: 'max-entropy', instruction: "Set p to 0.50 -- the fair coin. Notice the entropy is at its maximum: 1 bit.", hint: "Drag p to 0.50.", highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'value_reached', target: 'p', value: 0.5, tolerance: 0.05 }, celebration: 'subtle', insight: "When p=0.5, you have maximum uncertainty. You need exactly 1 bit (one yes/no question) to determine the outcome. This is why a fair coin flip is the fundamental unit of information." },
  { id: 'low-entropy', instruction: "Now drag p to 0.99 -- an almost-certain outcome. Watch entropy drop to nearly zero.", hint: "Drag p all the way up to 0.99.", highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'value_reached', target: 'p', value: 0.99, tolerance: 0.03 }, celebration: 'subtle', insight: "When the outcome is almost certain, there is almost no information in learning it. Asking 'Will the sun rise tomorrow?' gives you almost zero bits of information." },
  { id: 'explore-curve', instruction: "Explore the full curve. Notice it is perfectly symmetric around p=0.5.", hint: "Drag p around to see how entropy changes across the full range.", highlightElements: ['p'], unlockedVariables: ['p'], successCondition: { type: 'variable_changed', target: 'p' }, celebration: 'big', insight: "Shannon's key insight: information equals surprise. The most informative message is the one you least expected. This idea powers everything from ZIP files to 5G networks." },
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

  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.x != null && onVarChange) {
      const x = Number(data.activePayload[0].payload.x)
      onVarChange("p", Math.max(0.01, Math.min(0.99, Math.round(x * 100) / 100)))
    }
  }, [onVarChange])

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

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Info bar -- clickable badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {editingVar === "p" ? (
            <input type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
              className="w-20 rounded-lg border-2 px-2 py-1 text-sm font-bold outline-none" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} />
          ) : (
            <button onClick={() => handleBadgeClick("p", prob)} className="cursor-text rounded-lg border px-3 py-1 text-sm font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: VAR_COLORS.primary, color: VAR_COLORS.primary }} type="button" title="Click to type a value">
              p = {prob.toFixed(2)}
            </button>
          )}
          <span className="ml-auto rounded-lg border border-slate-200 px-3 py-1 text-sm font-extrabold dark:border-slate-600" style={{ color: VAR_COLORS.result }}>
            H = {entropy.toFixed(4)} bits
          </span>
        </div>

        {/* Chart area */}
        <div className="min-h-0 flex-1" style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 10 }} onClick={handleChartClick} style={{ cursor: "crosshair" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="x" type="number"
                domain={[0, 1]}
                tickCount={6}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Probability p", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 13 }}
              />
              <YAxis
                domain={[0, 1.1]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(v: number) => v.toFixed(1)}
                width={40}
                label={{ value: "H (bits)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 13 }}
              />
              <RTooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                formatter={(value: any) => [Number(value).toFixed(4), "H(p)"]}
                labelFormatter={(label: any) => `p = ${Number(label).toFixed(3)}`}
              />

              {/* Area fill up to current p */}
              <Area dataKey="fill" fill={VAR_COLORS.primary} stroke="none" fillOpacity={0.15} isAnimationActive={false} />

              {/* Entropy curve */}
              <Line dataKey="y" stroke="#1e40af" strokeWidth={2.5} dot={false} isAnimationActive={false} />

              {/* Max entropy reference line at H=1 */}
              <ReferenceLine
                y={1}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: "max = 1 bit", position: "right", fill: "#f59e0b", fontSize: 11, fontWeight: 600 }}
              />

              {/* p=0.5 reference line */}
              <ReferenceLine
                x={0.5}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              {/* Current p vertical reference */}
              <ReferenceLine
                x={prob}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1}
              />

              {/* Current point */}
              <ReferenceDot
                x={prob}
                y={entropy}
                r={7}
                fill="#ef4444"
                stroke="white"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Coin flip simulator + entropy display */}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
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
            className="rounded-lg bg-ocean px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
          >
            Flip
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg bg-slate-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
          >
            Reset
          </button>

          {/* Tally */}
          <div className="flex gap-3 text-sm font-semibold">
            <span className="text-blue-600">H: {heads}</span>
            <span className="text-emerald-600">T: {tails}</span>
            <span className="text-slate-500">Total: {flips.length}</span>
          </div>

          {/* Surprise */}
          <div className="ml-auto flex flex-col text-xs">
            <span className="text-blue-600">Surprise(H): {surpriseH === Infinity ? "\u221E" : surpriseH.toFixed(2)} bits</span>
            <span className="text-emerald-600">Surprise(T): {surpriseT === Infinity ? "\u221E" : surpriseT.toFixed(2)} bits</span>
          </div>
        </div>
      </div>
    </div>
  )
}
