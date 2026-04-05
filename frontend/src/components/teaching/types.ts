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
