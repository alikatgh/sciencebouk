import type { ReactElement } from "react"
import { useCallback, useMemo, useState } from "react"
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Tooltip as RTooltip,
} from "recharts"
import { TeachableEquation } from "../teaching/TeachableEquation"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const t = 1 / (1 + p * Math.abs(x))
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2)
  return 0.5 * (1 + sign * y)
}

function normalPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
}

function blackScholes(S: number, K: number, T: number, r: number, sigma: number) {
  if (T <= 0.001 || sigma <= 0.001) {
    return {
      call: Math.max(S - K, 0),
      put: Math.max(K - S, 0),
      delta: S > K ? 1 : S < K ? 0 : 0.5,
      gamma: 0,
    }
  }
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  const call = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)
  const put = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1)
  const delta = normalCDF(d1)
  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T))
  return { call, put, delta, gamma }
}

const variables: Variable[] = [
  { name: 'K', symbol: 'K', latex: 'K', value: 100, min: 50, max: 150, step: 1, color: VAR_COLORS.primary, unit: '$', description: 'Strike price' },
  { name: 'sigma', symbol: '\u03C3', latex: '\\sigma', value: 0.3, min: 0.05, max: 1.0, step: 0.01, color: VAR_COLORS.secondary, description: 'Volatility' },
  { name: 'T', symbol: 'T', latex: 'T', value: 0.5, min: 0.01, max: 2.0, step: 0.01, color: VAR_COLORS.tertiary, unit: 'yr', description: 'Time to expiry' },
  { name: 'r', symbol: 'r', latex: 'r', value: 0.05, min: 0.01, max: 0.15, step: 0.005, color: VAR_COLORS.quaternary, description: 'Risk-free rate' },
]

const lessons: LessonStep[] = [
  {
    id: 'strike-price',
    instruction: "The blue curve is the call option price. Drag the strike price K to see how it affects the option value. Higher K means the right to buy is less valuable (you'd have to pay more).",
    hint: "Drag the blue K in the formula to change the strike price. Watch how the call curve shifts.",
    highlightElements: ['K'],
    unlockedVariables: ['K'],
    lockedVariables: ['sigma', 'T', 'r'],
    successCondition: { type: 'variable_changed', target: 'K' },
    celebration: 'subtle',
    insight: "The call option (right to BUY) gets cheaper as the strike price rises, because a higher strike means you'd pay more to exercise. The put option (right to SELL) does the opposite. The dashed lines show the 'intrinsic value' -- what the option would be worth if it expired right now.",
  },
  {
    id: 'volatility',
    instruction: "Now drag volatility (sigma) upward. This is the key insight of Black-Scholes: uncertainty has measurable value.",
    hint: "Increase the yellow sigma. Watch both curves rise.",
    highlightElements: ['sigma'],
    unlockedVariables: ['sigma'],
    lockedVariables: ['K', 'T', 'r'],
    successCondition: { type: 'variable_changed', target: 'sigma' },
    celebration: 'subtle',
    insight: "Higher volatility means the stock price could swing wildly. For an option buyer, this is pure upside -- if the stock goes way up, you profit; if it goes way down, you just don't exercise. More uncertainty = more valuable options. This is why options get expensive before earnings reports.",
  },
  {
    id: 'time-decay',
    instruction: "Drag T (time to expiry) toward zero. Watch how the smooth option price curve approaches the sharp 'hockey stick' of intrinsic value.",
    hint: "Decrease the green T toward 0.01 and watch the curves change shape.",
    highlightElements: ['T'],
    unlockedVariables: ['K', 'sigma', 'T', 'r'],
    successCondition: { type: 'variable_changed', target: 'T' },
    celebration: 'big',
    insight: "As expiration approaches, the 'time value' of the option evaporates. The smooth curve collapses into a sharp corner at the strike price. This is 'theta decay' -- options lose value every day just from the passage of time. The Black-Scholes formula quantifies exactly how much.",
  },
]

export function BlackScholesScene(): ReactElement {
  return (
    <TeachableEquation
      hook="You can buy the RIGHT to purchase a stock at today's price, but in the future. How much is that right worth?"
      hookAction="Drag volatility and time to see how option prices change."
      formula="\\frac{1}{2}{\\sigma}^2S^2\\frac{\\partial^2V}{\\partial S^2}+{r}S\\frac{\\partial V}{\\partial S}+\\frac{\\partial V}{\\partial {T}}-{r}V=0"
      variables={variables}
      lessonSteps={lessons}
      buildLiveFormula={(v) => {
        return `\\frac{1}{2}{\\color{#f59e0b}${v.sigma.toFixed(2)}}^2 S^2 V_{SS} + {\\color{#8b5cf6}${v.r.toFixed(3)}} S V_S + V_t - {\\color{#8b5cf6}${v.r.toFixed(3)}} V = 0`
      }}
      buildResultLine={(v) => {
        const bs = blackScholes(v.K, v.K, v.T, v.r, v.sigma)
        return `\\text{ATM Call} = \\$${bs.call.toFixed(2)},\\; \\text{Put} = \\$${bs.put.toFixed(2)}`
      }}
      describeResult={(v) => {
        const bs = blackScholes(v.K, v.K, v.T, v.r, v.sigma)
        if (v.T < 0.05) return "Near expiry -- time value almost gone"
        if (v.sigma > 0.6) return "High volatility -- options are expensive"
        if (v.sigma < 0.1) return "Low volatility -- options are cheap"
        return `ATM call costs $${bs.call.toFixed(2)} with ${(v.sigma * 100).toFixed(0)}% vol`
      }}
      presets={[
        { label: "Low vol", values: { K: 100, sigma: 0.1, T: 0.5, r: 0.05 } },
        { label: "High vol", values: { K: 100, sigma: 0.8, T: 0.5, r: 0.05 } },
        { label: "Near expiry", values: { K: 100, sigma: 0.3, T: 0.02, r: 0.05 } },
      ]}
    >
      {({ vars, setVar }) => (
        <BlackScholesChart K={vars.K} sigma={vars.sigma} T={vars.T} rRate={vars.r} onVarChange={setVar} />
      )}
    </TeachableEquation>
  )
}

interface BlackScholesChartProps {
  K: number
  sigma: number
  T: number
  rRate: number
  onVarChange?: (name: string, value: number) => void
}

function BlackScholesChart({ K, sigma, T, rRate, onVarChange }: BlackScholesChartProps): ReactElement {
  const [showGreeks, setShowGreeks] = useState(false)
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
        if (editingVar === "K") onVarChange("K", Math.max(50, Math.min(150, Math.round(val))))
        if (editingVar === "sigma") onVarChange("sigma", Math.max(0.05, Math.min(1.0, Math.round(val * 100) / 100)))
        if (editingVar === "T") onVarChange("T", Math.max(0.01, Math.min(2.0, Math.round(val * 100) / 100)))
        if (editingVar === "r") onVarChange("r", Math.max(0.01, Math.min(0.15, Math.round(val * 1000) / 1000)))
      }
    }
    setEditingVar(null)
  }, [editingVar, editValue, onVarChange])

  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.S != null && onVarChange) {
      const s = Number(data.activePayload[0].payload.S)
      onVarChange("K", Math.max(50, Math.min(150, Math.round(s))))
    }
  }, [onVarChange])

  const data = useMemo(() => {
    const pts: Array<{
      S: number
      call: number
      put: number
      intrinsicCall: number
      intrinsicPut: number
      delta?: number
      gamma?: number
    }> = []
    for (let S = 20; S <= 200; S += 2) {
      const bs = blackScholes(S, K, T, rRate, sigma)
      pts.push({
        S,
        call: Math.round(bs.call * 100) / 100,
        put: Math.round(bs.put * 100) / 100,
        intrinsicCall: Math.max(S - K, 0),
        intrinsicPut: Math.max(K - S, 0),
        delta: Math.round(bs.delta * 10000) / 10000,
        gamma: Math.round(bs.gamma * 10000) / 10000,
      })
    }
    return pts
  }, [K, sigma, T, rRate])

  const maxPrice = useMemo(() => {
    const maxCall = Math.max(...data.map(p => p.call))
    const maxPut = Math.max(...data.map(p => p.put))
    return Math.max(maxCall, maxPut, 50) * 1.1
  }, [data])

  const renderBadge = (varName: string, label: string, value: number, format: (v: number) => string, color: string) => {
    if (editingVar === varName) {
      return (
        <input key={varName} type="number" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit} onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingVar(null) }}
          className="w-20 rounded-lg border-2 px-2 py-1 text-xs font-bold outline-none" style={{ borderColor: color, color }} />
      )
    }
    return (
      <button key={varName} onClick={() => handleBadgeClick(varName, value)} className="cursor-text rounded-lg border px-2 py-1 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800" style={{ borderColor: color, color }} type="button" title="Click to type a value">
        {label} = {format(value)}
      </button>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-full flex-col">
        {/* Info bar -- clickable badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          {renderBadge("K", "K", K, (v) => `$${v}`, VAR_COLORS.primary)}
          {renderBadge("sigma", "\u03C3", sigma, (v) => v.toFixed(2), VAR_COLORS.secondary)}
          {renderBadge("T", "T", T, (v) => `${v.toFixed(2)}yr`, VAR_COLORS.tertiary)}
          {renderBadge("r", "r", rRate, (v) => `${(v * 100).toFixed(1)}%`, VAR_COLORS.quaternary)}
        </div>

        {/* Chart */}
        <div className="min-h-0 flex-1" style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 24, right: 30, bottom: 24, left: 10 }} onClick={handleChartClick} style={{ cursor: "crosshair" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="S" type="number"
                domain={[20, 200]}
                tickCount={10}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Underlying Price (S)", position: "bottom", offset: 2, fill: "#64748b", fontSize: 13, fontWeight: 600 }}
              />
              <YAxis
                domain={[0, Math.ceil(maxPrice)]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(v: number) => v.toFixed(0)}
                width={50}
                label={{ value: "Option Price", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 13, fontWeight: 600 }}
              />
              <RTooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                formatter={(value: any, name: any) => {
                  const label = name === "call" ? "Call" : name === "put" ? "Put" : name === "intrinsicCall" ? "Intrinsic Call" : name === "intrinsicPut" ? "Intrinsic Put" : name === "delta" ? "Delta" : name === "gamma" ? "Gamma" : name
                  return [`$${Number(value).toFixed(2)}`, label]
                }}
                labelFormatter={(label: any) => `S = $${label}`}
              />

              {/* Intrinsic values (dashed) */}
              <Line dataKey="intrinsicCall" stroke="#5a79ff" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} opacity={0.4} />
              <Line dataKey="intrinsicPut" stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} opacity={0.4} />

              {/* Option price curves */}
              <Line dataKey="call" stroke="#5a79ff" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line dataKey="put" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />

              {/* Greeks (conditional) */}
              {showGreeks && (
                <Line dataKey="delta" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} yAxisId="greeks" />
              )}
              {showGreeks && (
                <Line dataKey="gamma" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} yAxisId="greeks" />
              )}
              {showGreeks && (
                <YAxis
                  yAxisId="greeks"
                  orientation="right"
                  domain={[0, 1.2]}
                  tick={{ fontSize: 10, fill: "#f59e0b" }}
                  axisLine={{ stroke: "#f59e0b" }}
                  width={40}
                />
              )}

              {/* Strike price line */}
              <ReferenceLine
                x={K}
                stroke={VAR_COLORS.primary}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{ value: `K = ${K}`, position: "top", fill: VAR_COLORS.primary, fontSize: 14, fontWeight: 700 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend + Greeks toggle */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[#5a79ff]" style={{ height: 3 }} />
            <span className="text-xs font-semibold text-[#5a79ff]">Call</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-emerald-500" style={{ height: 3 }} />
            <span className="text-xs font-semibold text-emerald-500">Put</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Intrinsic</span>
          </div>
          <button
            onClick={() => setShowGreeks(v => !v)}
            className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: showGreeks ? "#4f73ff" : "white",
              borderColor: showGreeks ? "#4f73ff" : "#e2e8f0",
              color: showGreeks ? "white" : "#64748b",
            }}
          >
            {showGreeks ? "Hide Greeks" : "Show Greeks"}
          </button>
        </div>
      </div>
    </div>
  )
}
