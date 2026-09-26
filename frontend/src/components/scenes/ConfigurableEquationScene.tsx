import type { ReactElement } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { BlockMath } from "react-katex"
import { Check, Copy, Link2, RotateCcw, Shuffle } from "lucide-react"
import { copyText } from "../../lib/clipboard"
import { decodeVarsFromParam, encodeVarsToParam } from "../../lib/equationShareUrl"
import { pushToast } from "../../lib/toast"
import { buildCitation } from "../../lib/citation"
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

const COPY_LABELS: Record<string, string> = {
  share: "Link copied",
  latex: "LaTeX copied",
  result: "Result copied",
  cite: "Citation copied",
}

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
        <GenericMetersVisual key={equationId} equationId={equationId} variables={variables} vars={vars} setVar={setVar} formula={equation.formula} citation={buildCitation(equation)} />
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
  citation,
}: {
  equationId: number
  variables: Variable[]
  vars: Record<string, number>
  setVar: (name: string, value: number) => void
  formula: string
  citation: string
}): ReactElement {
  const meters = variables.filter((v) => !v.constant)
  const result = subjectResults[equationId]
  const resultValue = result ? result.compute(vars) : null
  const [sweepName, setSweepName] = useState<string | null>(null)
  // Memoised so pickSweepVariable doesn't re-run on every drag frame (vars change
  // each frame, but the sweep choice only depends on result/variables/sweepName).
  const activeSweep = useMemo(
    () => (result ? sweepName ?? pickSweepVariable(result, variables)?.name ?? null : null),
    [result, sweepName, variables],
  )

  const [copied, setCopied] = useState<string | null>(null)
  const copy = (key: string, text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) {
        pushToast("Couldn’t copy to clipboard", "error")
        return
      }
      setCopied(key)
      pushToast(COPY_LABELS[key] ?? "Copied", "success")
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500)
    })
  }

  // Restore a shared configuration from ?v= ONCE per mount (the component remounts
  // per equation via its key). The ref guard prevents re-applying over the user's
  // edits if `variables`/`setVar` change identity after the first restore.
  const sharedRestoredRef = useRef(false)
  useEffect(() => {
    if (sharedRestoredRef.current || variables.length === 0) return
    const encoded = new URLSearchParams(window.location.search).get("v")
    if (!encoded) return
    sharedRestoredRef.current = true
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
    <div className="scene-stage studio-surface flex h-full w-full min-h-0 flex-col rounded-2xl border">
      <div className="relative flex shrink-0 flex-wrap items-center gap-1 px-3 py-2 sm:pr-44">
        <button
          type="button"
          onClick={resetInputs}
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
        </button>
        <button
          type="button"
          onClick={randomizeInputs}
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Randomize
        </button>
        <details className="group relative ml-auto sm:ml-0">
          <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg px-3 text-xs font-semibold text-slate-600 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ocean dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
            Copy &amp; share
          </summary>
          <div className="absolute right-0 top-full z-30 grid w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-0 sm:right-auto">
        <button
          type="button"
          onClick={shareConfiguration}
          aria-label="Copy a shareable link to this exact configuration"
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {copied === "share" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === "share" ? "Link copied" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => copy("latex", formula)}
          aria-label="Copy formula as LaTeX"
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {copied === "latex" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === "latex" ? "Copied" : "LaTeX"}
        </button>
        <button
          type="button"
          onClick={() => copy("cite", citation)}
          aria-label="Copy a citation for this equation"
          className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {copied === "cite" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === "cite" ? "Copied" : "Cite"}
        </button>
        {result && resultValue !== null && Number.isFinite(resultValue) && (
          <button
            type="button"
            onClick={() => copy("result", `${result.symbol} = ${formatResultValue(resultValue)}${result.unit ? ` ${result.unit}` : ""}`)}
            aria-label="Copy the computed result"
            className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {copied === "result" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied === "result" ? "Copied" : "Result"}
          </button>
        )}
          </div>
        </details>
      </div>

      {result && resultValue !== null && Number.isFinite(resultValue) && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Result: ${result.symbol} equals ${formatResultValue(resultValue)}${result.unit ? ` ${result.unit}` : ""}`}
          className="shrink-0 px-4 py-1 text-center font-mono text-xl font-semibold tabular-nums"
          style={{ color: VAR_COLORS.result }}
        >
          {result.symbol} = {formatResultValue(resultValue)}
          {result.unit ? ` ${result.unit}` : ""}
        </div>
      )}

      {result ? (
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <ResponseCurve equationId={equationId} variables={variables} vars={vars} sweepOverride={sweepName ?? undefined} />
          {meters.length > 1 && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-3 pb-2">
              <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">
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
                    className={`min-h-9 min-w-9 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
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
        <div className="flex w-full flex-1 flex-col justify-center gap-3.5 px-8">
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

      <p className="hidden shrink-0 px-4 pb-3 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:block">
        {result
          ? `Drag a slider — the curve traces ${result.symbol} across its range, and reshapes as you change the other inputs.`
          : "Drag the sliders — each bar tracks a variable across its range."}
      </p>
    </div>
  )
}
