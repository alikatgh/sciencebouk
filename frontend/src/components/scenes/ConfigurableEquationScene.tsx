import type { ReactElement } from "react"
import { useMemo } from "react"
import { BlockMath } from "react-katex"
import { TeachableEquation, type Preset } from "../teaching/TeachableEquation"
import { useEquationId } from "../teaching/EquationContext"
import type { GlossaryTerm, LessonStep, Variable } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useEquation } from "../../api/hooks"

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
      {({ vars }) => <GenericMetersVisual variables={variables} vars={vars} formula={equation.formula} />}
    </TeachableEquation>
  )
}

function GenericMetersVisual({
  variables,
  vars,
  formula,
}: {
  variables: Variable[]
  vars: Record<string, number>
  formula: string
}): ReactElement {
  const meters = variables.filter((v) => !v.constant)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-slate-700 dark:bg-slate-800">
      <div className="rounded-2xl bg-slate-50 px-8 py-5 dark:bg-slate-900">
        <BlockMath math={formula} />
      </div>

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

      <p className="max-w-sm text-center text-xs text-slate-400 dark:text-slate-500">
        Drag the sliders — each bar tracks a variable across its range.
      </p>
    </div>
  )
}
