import type { ExperimentMeasurement, Variable } from "./types"

export type PredictionDirection = "increase" | "decrease" | "same"

/** One local observation, calculated from the exact inputs shown to the learner. */
export interface PredictionExperiment {
  variableName: string
  variableSymbol: string
  variableUnit?: string
  from: number
  to: number
  before: number
  after: number
  direction: PredictionDirection
  expectedValues: Record<string, number>
  measurement: Readonly<Pick<ExperimentMeasurement, "symbol" | "unit" | "note">>
}

/** Relative comparison preserves changes even when both outputs are very small. */
export function comparePredictionResults(before: number, after: number): PredictionDirection {
  if (before === after) return "same"
  const scale = Math.max(Math.abs(before), Math.abs(after))
  if (Math.abs(after - before) <= scale * 1e-12) return "same"
  return after > before ? "increase" : "decrease"
}

function candidateValues(variable: Variable, current: number): number[] {
  const { min, max, step } = variable
  const span = max - min
  if (![min, max, step, current, span].every(Number.isFinite)
    || step <= 0 || span <= 0 || current < min || current > max) return []

  const gridSize = span / step
  if (!Number.isFinite(gridSize) || gridSize > Number.MAX_SAFE_INTEGER) return []
  const gridTolerance = Number.EPSILON * Math.max(1, gridSize) * 8
  const lastIndex = Math.floor(gridSize + gridTolerance)
  const maxIsGridStop = Math.abs(gridSize - lastIndex) <= gridTolerance
  const currentIndex = Math.round((current - min) / step)
  const quarterRange = Math.max(1, Math.round(gridSize / 4))
  // Four bounded attempts: one step and a quarter range in either direction.
  const indices = [currentIndex + 1, currentIndex - 1, currentIndex + quarterRange, currentIndex - quarterRange]
  const distinctStops = [...new Set(indices.map((index) => Math.max(0, Math.min(lastIndex, index))))]
    .filter((index) => index !== currentIndex)
  return [...new Set(distinctStops.map((index) => {
    // Preserve the actual endpoints instead of recomputing an epsilon neighbor.
    if (index === 0) return min
    if (index === lastIndex && maxIsGridStop) return max
    return min + index * step
  }))].filter((value) => Number.isFinite(value) && value >= min && value <= max
    && Math.abs(value - current) / step > 1e-7)
}

function finiteResult(measurement: ExperimentMeasurement, values: Record<string, number>): number | null {
  try {
    const result = measurement.compute(values)
    return Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

/**
 * Reuses the existing scalar evaluator; it makes no claim about global trends.
 * Next trials cycle through editable inputs, then their bounded candidate values.
 */
export function createPredictionExperiment(
  measurement: ExperimentMeasurement,
  variables: Variable[],
  values: Record<string, number>,
  trialIndex = 0,
): PredictionExperiment | null {
  const expectedValues = Object.freeze({ ...values })
  const before = finiteResult(measurement, expectedValues)
  if (before === null) return null

  const editable = variables.filter((variable) => !variable.constant && !variable.locked)
  if (editable.length === 0) return null
  const index = Number.isSafeInteger(trialIndex) && trialIndex >= 0 ? trialIndex : 0
  const firstVariable = index % editable.length
  const candidateOffset = Math.floor(index / editable.length)

  for (let offset = 0; offset < editable.length; offset += 1) {
    const variable = editable[(firstVariable + offset) % editable.length]
    const from = expectedValues[variable.name]
    const candidates = candidateValues(variable, from)
    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      const to = candidates[(candidateOffset + attempt) % candidates.length]
      const afterValues = Object.freeze({ ...expectedValues, [variable.name]: to })
      const after = finiteResult(measurement, afterValues)
      if (after === null) continue
      return Object.freeze({
        variableName: variable.name,
        variableSymbol: variable.symbol || variable.name,
        variableUnit: variable.unit,
        from,
        to,
        before,
        after,
        direction: comparePredictionResults(before, after),
        expectedValues,
        measurement: Object.freeze({ symbol: measurement.symbol, unit: measurement.unit, note: measurement.note }),
      })
    }
  }
  return null
}

/** Stable across harmless object recreation, sensitive to values, limits and locks. */
export function predictionInputsKey(variables: Variable[], values: Record<string, number>): string {
  return JSON.stringify([
    Object.keys(values).sort().map((name) => [name, String(values[name])]),
    variables.map(({ name, symbol, unit, value, min, max, step, constant, locked }) => (
      [name, symbol, unit, String(value), String(min), String(max), String(step), !!constant, !!locked]
    )),
  ])
}
