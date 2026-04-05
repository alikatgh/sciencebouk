import rawData from "./equations.json"

export interface EquationVariable {
  name: string
  symbol: string
  description: string
  min: number
  max: number
  step: number
  default: number
  unit: string | null
  color: string
  constant?: boolean
}

export interface EquationPreset {
  label: string
  values: Record<string, number>
}

export interface EquationLesson {
  id: string
  instruction: string
  hint?: string
  unlocked: string[]
  successType: string
  successTarget: string
  successValue?: number
  successTolerance?: number
  celebration: string
  insight: string
}

export interface EquationGlossaryTerm {
  words: string[]
  highlightClass: string
  color: string
  tooltip?: string
}

export interface EquationEntry {
  id: number
  title: string
  formula: string
  author: string
  year: string
  category: string
  hook: string
  hookAction: string
  variables: EquationVariable[]
  presets: EquationPreset[]
  lessons: EquationLesson[]
  glossary?: EquationGlossaryTerm[]
}

export const equations: EquationEntry[] = rawData as EquationEntry[]
