import { formatResultValue } from "../../data/subjectResults"
import type { ExperimentChange, ExperimentMeasurement, ExperimentSnapshot, Variable } from "./types"

function textInMath(text: string): string {
  return text.replace(/[\\{}_$%&#]/g, (character) => character === "\\" ? "\\textbackslash{}" : `\\${character}`)
}

/** Display only the existing model's actual finite output. */
export function experimentResultLine(
  values: Record<string, number>,
  measurement?: ExperimentMeasurement,
  buildResultLine?: (values: Record<string, number>) => string,
): string | undefined {
  try {
    if (measurement) {
      const result = measurement.compute(values)
      if (!Number.isFinite(result)) return undefined
      const number = formatResultValue(result).replace(/e([+-]?\d+)$/, "\\times 10^{$1}")
      return `\\text{${textInMath(measurement.symbol)}} = ${number}${measurement.unit ? `\\,\\text{${textInMath(measurement.unit)}}` : ""}`
    }
    const result = buildResultLine?.(values)
    return result && !/NaN|Infinity|undefined/.test(result) ? result : undefined
  } catch {
    return undefined
  }
}

export function captureExperiment(
  equationId: number,
  values: Record<string, number>,
  measurement?: ExperimentMeasurement,
  buildResultLine?: (values: Record<string, number>) => string,
): ExperimentSnapshot {
  const captured = { ...values }
  return {
    equationId,
    values: captured,
    resultLine: experimentResultLine(captured, measurement, buildResultLine),
    resultNote: measurement?.note,
  }
}

export function experimentRestorePlan(
  snapshot: ExperimentSnapshot | null,
  equationId: number,
  variables: Variable[],
  values: Record<string, number>,
): { changes: Record<string, number>; disabledReason?: string } {
  const changes: Record<string, number> = {}
  if (!snapshot || snapshot.equationId !== equationId) return { changes, disabledReason: "Capture a baseline for this equation first." }
  const inputs = variables.filter((variable) => !variable.constant)
  if (inputs.length === 0) return { changes, disabledReason: "Use the diagram controls to change these readouts." }
  for (const variable of inputs) {
    const value = snapshot.values[variable.name]
    if (!Number.isFinite(value) || value < variable.min || value > variable.max) {
      return { changes: {}, disabledReason: "The available inputs have changed. Capture a new baseline." }
    }
    if (Object.is(values[variable.name], value)) continue
    if (variable.locked) return { changes: {}, disabledReason: "Choose Explore freely to restore inputs locked by this lesson." }
    changes[variable.name] = value
  }
  return Object.keys(changes).length > 0
    ? { changes }
    : { changes, disabledReason: "The inputs already match the baseline." }
}

/** Reject an old prediction if any input or the lesson's permissions changed. */
export function experimentChangeAllowed(
  change: ExperimentChange,
  variables: Variable[],
  values: Record<string, number>,
): boolean {
  const variable = variables.find((entry) => entry.name === change.variableName)
  if (!variable || variable.constant || variable.locked || !Number.isFinite(change.value)
    || change.value < variable.min || change.value > variable.max
    || Object.is(values[variable.name], change.value)) return false
  if (!Number.isFinite(variable.step) || variable.step <= 0) return false
  if (Math.abs(change.value - values[variable.name]) / variable.step <= 1e-7) return false
  const tick = (change.value - variable.min) / variable.step
  if (Math.abs(tick - Math.round(tick)) > 1e-7) return false
  const names = Object.keys(values)
  return names.length === Object.keys(change.expectedValues).length
    && names.every((name) => Object.is(values[name], change.expectedValues[name]))
}
