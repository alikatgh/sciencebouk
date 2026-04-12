import { useMemo } from "react"
import {
  equations,
  type EquationEntry,
  type EquationGlossaryTerm,
  type EquationLesson,
  type EquationPreset,
  type EquationVariable,
} from "./equations"
import type { Variable, LessonStep, GlossaryTerm } from "../components/teaching/types"
import { VAR_COLORS } from "../components/teaching/types"
import { useSettings } from "../settings/SettingsContext"
import { DEFAULT_LOCALE, resolveLocaleCandidates } from "../i18n/locales"

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
  presets: EquationPreset[]
  lessonSteps: LessonStep[]
  glossary: GlossaryTerm[]
}

type LocalizedEquationVariable = Pick<EquationVariable, "name"> & Partial<Omit<EquationVariable, "name">>
type LocalizedEquationLesson = Pick<EquationLesson, "id"> & Partial<Omit<EquationLesson, "id">>
type LocalizedEquationGlossaryTerm = Pick<EquationGlossaryTerm, "highlightClass"> & Partial<Omit<EquationGlossaryTerm, "highlightClass">>

export interface LocalizedEquationEntry extends Partial<Omit<EquationEntry, "id" | "variables" | "presets" | "lessons" | "glossary">> {
  variables?: LocalizedEquationVariable[]
  presets?: Array<Partial<EquationPreset>>
  lessons?: LocalizedEquationLesson[]
  glossary?: LocalizedEquationGlossaryTerm[]
}

type LocalizedEquationMap = Record<string, LocalizedEquationEntry>

const localizedEquationFiles = import.meta.glob("./content/equation-locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, LocalizedEquationMap>

function localeFromPath(path: string): string {
  const match = path.match(/\/([A-Za-z0-9-]+)\.json$/)
  if (!match) {
    throw new Error(`Invalid localized equation content path: ${path}`)
  }

  return match[1].toLowerCase()
}

const localizedEquationsByLocale = Object.fromEntries(
  Object.entries(localizedEquationFiles).map(([path, localizedContent]) => [
    localeFromPath(path),
    localizedContent,
  ]),
) as Record<string, LocalizedEquationMap>

function mapLesson(l: EquationLesson): LessonStep {
  return {
    id: l.id,
    instruction: l.instruction,
    hint: l.hint,
    // Raw JSON lessons only declare unlocked variables. Scene-specific
    // highlight elements live with the scene definitions themselves.
    highlightElements: [],
    unlockedVariables: l.unlocked,
    successCondition: {
      type: l.successType as LessonStep["successCondition"]["type"],
      target: l.successTarget,
      value: l.successValue,
      tolerance: l.successTolerance,
      duration: l.successDuration,
    },
    celebration: l.celebration as LessonStep["celebration"],
    insight: l.insight,
  }
}

function mergeVariableTranslations(
  baseVariables: EquationVariable[],
  localizedVariables?: LocalizedEquationVariable[],
): EquationVariable[] {
  if (!localizedVariables?.length) return baseVariables

  const localizedByName = new Map(
    localizedVariables.map((variable) => [variable.name, variable]),
  )

  return baseVariables.map((variable) => {
    const localized = localizedByName.get(variable.name)
    if (!localized) return variable

    return {
      ...variable,
      ...localized,
      name: variable.name,
    }
  })
}

function mergePresetTranslations(
  basePresets: EquationPreset[],
  localizedPresets?: Array<Partial<EquationPreset>>,
): EquationPreset[] {
  if (!localizedPresets?.length) return basePresets

  return basePresets.map((preset, index) => {
    const localized = localizedPresets[index]
    if (!localized) return preset

    return {
      ...preset,
      ...localized,
      values: localized.values ?? preset.values,
    }
  })
}

function mergeLessonTranslations(
  baseLessons: EquationLesson[],
  localizedLessons?: LocalizedEquationLesson[],
): EquationLesson[] {
  if (!localizedLessons?.length) return baseLessons

  const localizedById = new Map(
    localizedLessons.map((lesson) => [lesson.id, lesson]),
  )

  return baseLessons.map((lesson) => {
    const localized = localizedById.get(lesson.id)
    if (!localized) return lesson

    return {
      ...lesson,
      ...localized,
      id: lesson.id,
      unlocked: localized.unlocked ?? lesson.unlocked,
    }
  })
}

function mergeGlossaryTranslations(
  baseGlossary: EquationGlossaryTerm[] | undefined,
  localizedGlossary?: LocalizedEquationGlossaryTerm[],
): EquationGlossaryTerm[] | undefined {
  if (!localizedGlossary?.length) return baseGlossary
  if (!baseGlossary?.length) {
    return localizedGlossary as EquationGlossaryTerm[]
  }

  const localizedByClass = new Map(
    localizedGlossary.map((term) => [term.highlightClass, term]),
  )

  return baseGlossary.map((term) => {
    const localized = localizedByClass.get(term.highlightClass)
    if (!localized) return term

    return {
      ...term,
      ...localized,
      highlightClass: term.highlightClass,
    }
  })
}

export function mergeLocalizedEquation(
  baseEquation: EquationEntry,
  localizedEquation?: LocalizedEquationEntry,
): EquationEntry {
  if (!localizedEquation) return baseEquation

  return {
    ...baseEquation,
    ...localizedEquation,
    variables: mergeVariableTranslations(baseEquation.variables, localizedEquation.variables),
    presets: mergePresetTranslations(baseEquation.presets, localizedEquation.presets),
    lessons: mergeLessonTranslations(baseEquation.lessons, localizedEquation.lessons),
    glossary: mergeGlossaryTranslations(baseEquation.glossary, localizedEquation.glossary),
  }
}

function getLocalizedEquationEntry(id: number, locale?: string | null): EquationEntry | null {
  const baseEquation = equations.find((equation) => equation.id === id)
  if (!baseEquation) return null

  const localizedCandidates = resolveLocaleCandidates(locale)
    .filter((candidate) => candidate !== DEFAULT_LOCALE)
    .reverse()

  return localizedCandidates.reduce((equation, candidate) => {
    const localizedEquation = localizedEquationsByLocale[candidate]?.[String(id)]
    return mergeLocalizedEquation(equation, localizedEquation)
  }, baseEquation)
}

export function getEquationConfig(id: number, locale?: string | null): EquationConfig | null {
  const eq = getLocalizedEquationEntry(id, locale)
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
      latex: v.symbol,
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

export function useEquationConfig(id: number): EquationConfig | null {
  const { settings } = useSettings()

  return useMemo(() => getEquationConfig(id, settings.language), [id, settings.language])
}

export function getAllConfigs(locale?: string | null): EquationConfig[] {
  return equations.map((eq) => getEquationConfig(eq.id, locale)!).filter(Boolean)
}

export function useAllEquationConfigs(): EquationConfig[] {
  const { settings } = useSettings()

  return useMemo(() => getAllConfigs(settings.language), [settings.language])
}
