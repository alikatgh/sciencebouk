export interface Variable {
  name: string
  symbol: string
  latex: string
  value: number
  min: number
  max: number
  step: number
  color: string
  unit?: string
  constant?: boolean
  locked?: boolean
  description?: string
}

/** Why a scene is changing a value; only deliberate learner input earns a step. */
export type EquationVariableSource = 'learner' | 'preset' | 'reset' | 'restore' | 'system'

export type SetEquationVariable = (
  name: string,
  value: number,
  options?: { source: EquationVariableSource },
) => void

/** A bounded in-memory observation, scoped to one equation. */
export interface ExperimentSnapshot {
  equationId: number
  values: Record<string, number>
  resultLine?: string
  resultNote?: string
}

/** Reuses an equation's existing numeric model; no formula parsing. */
export interface ExperimentMeasurement {
  symbol: string
  unit?: string
  note?: string
  compute: (values: Record<string, number>) => number
}

export interface ExperimentChange {
  variableName: string
  value: number
  expectedValues: Record<string, number>
}

export interface LessonStep {
  id: string
  instruction: string
  hint?: string
  highlightElements: string[]
  lockedVariables?: string[]
  unlockedVariables: string[]
  successCondition: {
    type: 'variable_changed' | 'value_reached' | 'time_elapsed' | 'clicked'
    target?: string
    value?: number
    tolerance?: number
    additionalTargets?: Array<{ target: string; value: number; tolerance?: number }>
    duration?: number
  }
  celebration: 'subtle' | 'medium' | 'big'
  insight: string
}

export interface EquationTeachingConfig {
  id: number
  hook: string
  hookAction: string
  variables: Variable[]
  lessons: LessonStep[]
  ahaDescription: string
}

export interface GlossaryTerm {
  /** Words/phrases that trigger this highlight (case-insensitive) */
  words: string[]
  /** CSS class or element ID to highlight in the D3 visualization */
  highlightClass: string
  /** Color for the hover underline */
  color: string
  /** Tooltip explanation shown on hover */
  tooltip?: string
}

export const VAR_COLORS = {
  primary: '#3b82f6',
  secondary: '#f59e0b',
  tertiary: '#10b981',
  quaternary: '#a855f7',
  result: '#ef4444',
  constant: '#6b7280',
} as const
