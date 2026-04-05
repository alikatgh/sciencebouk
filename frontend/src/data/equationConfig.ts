import { equations, type EquationEntry, type EquationLesson } from "./equations"
import type { Variable, LessonStep, GlossaryTerm } from "../components/teaching/types"
import { VAR_COLORS } from "../components/teaching/types"
import type { Preset } from "../components/teaching/TeachableEquation"

const COLOR_MAP: Record<string, string> = {
  primary: VAR_COLORS.primary,
  secondary: VAR_COLORS.secondary,
  tertiary: VAR_COLORS.tertiary,
  quaternary: VAR_COLORS.quaternary,
  result: VAR_COLORS.result,
  constant: VAR_COLORS.constant,
}

export interface EquationConfig {
  id: number
  title: string
  formula: string
  author: string
  year: string
  category: string
  hook: string
  hookAction: string
  variables: Variable[]
  presets: Preset[]
  lessonSteps: LessonStep[]
  glossary: GlossaryTerm[]
}

function mapLesson(l: EquationLesson): LessonStep {
  return {
    id: l.id,
    instruction: l.instruction,
    hint: l.hint,
    highlightElements: l.unlocked,
    unlockedVariables: l.unlocked,
    successCondition: {
      type: l.successType as LessonStep['successCondition']['type'],
      target: l.successTarget,
      value: l.successValue,
      tolerance: l.successTolerance,
      duration: (l as unknown as Record<string, unknown>).successDuration as number | undefined,
    },
    celebration: l.celebration as LessonStep['celebration'],
    insight: l.insight,
  }
}

export function getEquationConfig(id: number): EquationConfig | null {
  const eq = equations.find((e) => e.id === id)
  if (!eq) return null

  return {
    id: eq.id,
    title: eq.title,
    formula: eq.formula,
    author: eq.author,
    year: eq.year,
    category: eq.category,
    hook: eq.hook,
    hookAction: eq.hookAction,
    variables: eq.variables.map((v) => ({
      name: v.name,
      symbol: v.symbol,
      latex: v.name,
      value: v.default,
      min: v.min,
      max: v.max,
      step: v.step,
      color: COLOR_MAP[v.color] ?? v.color,
      unit: v.unit ?? undefined,
      constant: v.constant,
      description: v.description,
    })),
    presets: eq.presets,
    lessonSteps: eq.lessons.map(mapLesson),
    glossary: (eq.glossary ?? []).map((g) => ({
      words: g.words,
      highlightClass: g.highlightClass,
      color: g.color,
      tooltip: g.tooltip,
    })),
  }
}

export function getAllConfigs(): EquationConfig[] {
  return equations.map((eq) => getEquationConfig(eq.id)!).filter(Boolean)
}
