import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"
import { BlockMath } from "react-katex"
import { Check, Copy, Link2, RotateCcw, Shuffle } from "lucide-react"
import { copyText } from "../../lib/clipboard"
import { decodeVarsFromParam, encodeVarsToParam } from "../../lib/equationShareUrl"
import { TeachableEquation, type Preset } from "../teaching/TeachableEquation"
import { useEquationId } from "../teaching/EquationContext"
import type { GlossaryTerm, LessonStep, Variable } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useEquation } from "../../api/hooks"
import { subjectResults, formatResultValue } from "../../data/subjectResults"
import { ResponseCurve, pickSweepVariable } from "./ResponseCurve"

/**
 * A data-driven scene used for every equation that does not ship a bespoke
 * D3 visualization. It reads the equation's teaching payload from the API
 * (variables / presets / lesson steps / glossary) and renders the shared
 * TeachableEquation panel — so the equation gets draggable sliders, guided
 * lessons, presets and glossary highlights without a hand-written scene.
 *
 * The visualization surface is a generic "live meters" stage: each non-constant
 * variable is drawn as a bar showing its current value within its range, so the
 * learner gets visual feedback as they drag the sliders and step through the
 * lesson.
 */

const COLOR_MAP: Record<string, string> = {
  primary: VAR_COLORS.primary,
  secondary: VAR_COLORS.secondary,
  tertiary: VAR_COLORS.tertiary,
  quaternary: VAR_COLORS.quaternary,
  result: VAR_COLORS.result,
  constant: VAR_COLORS.constant,
}

interface RawVariable {
  name: string
  symbol?: string
  description?: string
  min?: number
  max?: number
  step?: number
  default?: number
  unit?: string | null
  color?: string
  constant?: boolean
}

interface RawLesson {
  id: string
  instruction?: string
  hint?: string
  unlocked?: string[]
  successType?: string
  successTarget?: string
  successValue?: number
  successTolerance?: number
  successDuration?: number
  celebration?: string
  insight?: string
}

interface RawPreset {
  label: string
  values: Record<string, number>
}

interface RawGlossaryTerm {
  words: string[]
  highlightClass: string
  color?: string
  tooltip?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function mapVariables(raw: unknown[]): Variable[] {
  return raw.filter(isRecord).filter((v): v is RawVariable & Record<string, unknown> => typeof v.name === "string").map((v) => {
    const variable = v as RawVariable
    const symbol = variable.symbol ?? variable.name
    return {
      name: variable.name,
      symbol,
      latex: symbol,
      value: variable.default ?? variable.min ?? 0,
      min: variable.min ?? 0,
      max: variable.max ?? 1,
      step: variable.step ?? 0.01,
      color: variable.color ? COLOR_MAP[variable.color] ?? variable.color : VAR_COLORS.primary,
      unit: variable.unit ?? undefined,
      constant: variable.constant,
      description: variable.description,
    }
  })
}

function mapLessons(raw: unknown[]): LessonStep[] {
  return raw.filter(isRecord).filter((l): l is RawLesson & Record<string, unknown> => typeof l.id === "string").map((l) => {
    const lesson = l as RawLesson
    return {
      id: lesson.id,
      instruction: lesson.instruction ?? "",
      hint: lesson.hint,
      highlightElements: [],
      unlockedVariables: lesson.unlocked ?? [],
      successCondition: {
        type: (lesson.successType as LessonStep["successCondition"]["type"]) ?? "variable_changed",
        target: lesson.successTarget,
        value: lesson.successValue,
        tolerance: lesson.successTolerance,
        duration: lesson.successDuration,
      },
      celebration: (lesson.celebration as LessonStep["celebration"]) ?? "subtle",
      insight: lesson.insight ?? "",
    }
  })
}

function mapPresets(raw: unknown[]): Preset[] {
  return raw
    .filter(isRecord)
    .filter((p): p is RawPreset & Record<string, unknown> => typeof p.label === "string" && isRecord(p.values))
    .map((p) => ({ label: (p as RawPreset).label, values: (p as RawPreset).values }))
}

function mapGlossary(raw: unknown[]): GlossaryTerm[] {
  return raw
    .filter(isRecord)
    .filter((g): g is RawGlossaryTerm & Record<string, unknown> => Array.isArray(g.words) && typeof g.highlightClass === "string")
    .map((g) => {
      const term = g as RawGlossaryTerm
      return {
        words: term.words,
        highlightClass: term.highlightClass,
        color: term.color ?? VAR_COLORS.primary,
        tooltip: term.tooltip,
      }
    })
}

export function ConfigurableEquationScene(): ReactElement {
  const equationId = useEquationId()
  const { data: equation, isError, isLoading } = useEquation(equationId)

  const variables = useMemo(() => mapVariables(equation?.variables_data ?? []), [equation?.variables_data])
  const lessonSteps = useMemo(() => mapLessons(equation?.lessons_data ?? []), [equation?.lessons_data])
  const presets = useMemo(() => mapPresets(equation?.presets_data ?? []), [equation?.presets_data])
  const glossary = useMemo(() => mapGlossary(equation?.glossary_data ?? []), [equation?.glossary_data])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
      </div>
    )
  }

  if (isError || !equation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Visualization unavailable
        </div>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          We could not load this equation’s teaching payload right now. Try refreshing the page in a moment.
        </p>
      </div>
    )
  }

  // No interactive variables to drive: fall back to a calm static formula card.
  if (variables.filter((v) => !v.constant).length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-10 dark:border-slate-700 dark:bg-slate-800">
        <div className="rounded-2xl bg-slate-50 px-8 py-6 dark:bg-slate-900">
          <BlockMath math={equation.formula} />
        </div>
        {equation.hook && (
          <p className="max-w-lg text-center text-base font-medium text-slate-700 dark:text-slate-200">{equation.hook}</p>
        )}
        <p className="text-xs text-slate-400">
          {equation.author}
          {equation.year ? `, ${equation.year}` : ""}
        </p>
      </div>
    )
  }

  return (
    <TeachableEquation
      equationId={equationId}
      hook={equation.hook}
      hookAction={equation.hook_action}
      formula={equation.formula}
      latexFormula={equation.formula}
      variables={variables}
      lessonSteps={lessonSteps}
      presets={presets}
      glossary={glossary}
    >
      {({ vars, setVar }) => (
        <GenericMetersVisual key={equationId} equationId={equationId} variables={variables} vars={vars} setVar={setVar} formula={equation.formula} />
      )}
    </TeachableEquation>
  )
}

function GenericMetersVisual({
  equationId,
  variables,
  vars,
  setVar,
  formula,
}: {
  equationId: number
  variables: Variable[]
  vars: Record<string, number>
  setVar: (name: string, value: number) => void
  formula: string
}): ReactElement {
  const meters = variables.filter((v) => !v.constant)
  const result = subjectResults[equationId]
  const resultValue = result ? result.compute(vars) : null
  const [sweepName, setSweepName] = useState<string | null>(null)
  const activeSweep = result ? sweepName ?? pickSweepVariable(result, variables)?.name ?? null : null

  const [copied, setCopied] = useState<string | null>(null)
  const copy = (key: string, text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return
      setCopied(key)
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500)
    })
  }

  // Restore a shared configuration from ?v= on first mount (remounts per equation via key).
  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("v")
    if (!encoded) return
    const restored = decodeVarsFromParam(encoded)
    for (const variable of variables) {
      if (variable.constant) continue
      const value = restored[variable.name]
      if (value !== undefined) setVar(variable.name, Math.min(variable.max, Math.max(variable.min, value)))
    }
  }, [variables, setVar])

  const shareConfiguration = () => {
    const current: Record<string, number> = {}
    for (const variable of meters) current[variable.name] = vars[variable.name] ?? variable.value
    copy("share", `${window.location.origin}/equation/${equationId}?v=${encodeVarsToParam(current)}`)
  }

  const resetInputs = () => {
    for (const variable of meters) setVar(variable.name, variable.value)
  }
  const randomizeInputs = () => {
    for (const variable of meters) {
      const step = variable.step || (variable.max - variable.min) / 100 || 1
      const steps = Math.max(1, Math.round((variable.max - variable.min) / step))
      const raw = variable.min + Math.round(Math.random() * steps) * step
      setVar(variable.name, Math.min(variable.max, Math.max(variable.min, Number(raw.toFixed(6)))))
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-700 dark:bg-slate-800">
      <div className="rounded-2xl bg-slate-50 px-8 py-5 dark:bg-slate-900">
        <BlockMath math={formula} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={resetInputs}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
        </button>
        <button
          type="button"
          onClick={randomizeInputs}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Randomize
        </button>
        <button
          type="button"
          onClick={shareConfiguration}
          aria-label="Copy a shareable link to this exact configuration"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {copied === "share" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === "share" ? "Link copied" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => copy("latex", formula)}
          aria-label="Copy formula as LaTeX"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {copied === "latex" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === "latex" ? "Copied" : "LaTeX"}
        </button>
        {result && resultValue !== null && (
          <button
            type="button"
            onClick={() => copy("result", `${result.symbol} = ${formatResultValue(resultValue)}${result.unit ? ` ${result.unit}` : ""}`)}
            aria-label="Copy the computed result"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {copied === "result" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied === "result" ? "Copied" : "Result"}
          </button>
        )}
      </div>

      {result && resultValue !== null && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Result: ${result.symbol} equals ${formatResultValue(resultValue)}${result.unit ? ` ${result.unit}` : ""}`}
          className="flex flex-col items-center gap-0.5 rounded-2xl px-7 py-3"
          style={{ backgroundColor: `${VAR_COLORS.result}1a`, border: `1px solid ${VAR_COLORS.result}55` }}
        >
          <span aria-hidden="true" className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Result</span>
          <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: VAR_COLORS.result }}>
            <span className="text-base font-semibold text-slate-500 dark:text-slate-400">{result.symbol} = </span>
            {formatResultValue(resultValue)}
            {result.unit ? <span className="ml-1 text-base font-semibold text-slate-500 dark:text-slate-400">{result.unit}</span> : null}
          </span>
          {result.note ? <span className="text-[0.65rem] text-slate-400 dark:text-slate-500">{result.note}</span> : null}
        </div>
      )}

      {result ? (
        <div className="flex w-full max-w-md flex-col items-center gap-2.5">
          <ResponseCurve equationId={equationId} variables={variables} vars={vars} sweepOverride={sweepName ?? undefined} />
          {meters.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="mr-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                x-axis
              </span>
              {meters.map((variable) => {
                const isActive = activeSweep === variable.name
                return (
                  <button
                    key={variable.name}
                    type="button"
                    onClick={() => setSweepName(variable.name)}
                    aria-pressed={isActive}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      isActive ? "" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: `${variable.color}22`, color: variable.color, boxShadow: `inset 0 0 0 1px ${variable.color}66` }
                        : undefined
                    }
                  >
                    {variable.symbol}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col gap-3.5">
          {meters.map((variable) => {
            const value = vars[variable.name] ?? variable.value
            const span = variable.max - variable.min
            const pct = span > 0 ? Math.min(100, Math.max(0, ((value - variable.min) / span) * 100)) : 0
            const decimals = variable.step >= 1 ? 0 : variable.step >= 0.1 ? 1 : variable.step >= 0.01 ? 2 : 3
            return (
              <div key={variable.name} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold" style={{ color: variable.color }}>
                    {variable.symbol}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {value.toFixed(decimals)}
                    {variable.unit ? ` ${variable.unit}` : ""}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full transition-[width] duration-150 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: variable.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="max-w-sm text-center text-xs text-slate-400 dark:text-slate-500">
        {result
          ? `Drag a slider — the curve traces ${result.symbol} across its range, and reshapes as you change the other inputs.`
          : "Drag the sliders — each bar tracks a variable across its range."}
      </p>
    </div>
  )
}
