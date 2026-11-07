import { describe, expect, it } from "vitest"
import { subjectResults } from "../../data/subjectResults"
import subjectPayloads from "../../data/content/subject-equations-fallback.json"
import { captureExperiment, experimentChangeAllowed, experimentRestorePlan, experimentResultLine } from "./experimentComparison"
import type { Variable } from "./types"
import { createPredictionExperiment } from "./predictionExperiment"

const variables: Variable[] = [
  { name: "I", symbol: "I", latex: "I", value: 2, min: 0, max: 10, step: .1, color: "blue", unit: "A" },
  { name: "R", symbol: "R", latex: "R", value: 10, min: 1, max: 100, step: 1, color: "orange", unit: "Ω" },
  { name: "constant", symbol: "c", latex: "c", value: 3, min: 3, max: 3, step: 1, color: "gray", constant: true },
]

describe("experiment observations", () => {
  it("freezes the captured observation while the live inputs change", () => {
    const values = { I: 2, R: 10 }
    const snapshot = captureExperiment(37, values, subjectResults[37])
    values.I = 4
    expect(snapshot.values).toEqual({ I: 2, R: 10 })
    expect(snapshot.resultLine).toContain("20")
    expect(experimentResultLine(values, subjectResults[37])).toContain("40")
  })

  it("uses the actual small result and keeps the model's assumptions", () => {
    const snapshot = captureExperiment(41, { m: 1, v: 1 }, subjectResults[41])
    expect(snapshot.resultLine).toContain("10^{-34}")
    expect(snapshot.resultNote).toBe(subjectResults[41].note)
    expect(experimentResultLine({ s1: 4, s2: 0 }, subjectResults[79])).toBeUndefined()
    expect(experimentResultLine({}, { symbol: "x", compute: () => { throw Error("undefined domain") } })).toBeUndefined()
  })

  it("keeps input-only observations honest and reuses authored result lines", () => {
    expect(captureExperiment(75, { rho: 1, k: 0 }).resultLine).toBeUndefined()
    expect(experimentResultLine({ a: 3, b: 4 }, undefined, ({ a, b }) => `${a}^2+${b}^2=25`)).toBe("3^2+4^2=25")
    expect(experimentResultLine({}, undefined, () => "NaN")).toBeUndefined()
  })
})

describe("restoring input values", () => {
  const snapshot = captureExperiment(37, { I: 2, R: 10, constant: 3 }, subjectResults[37])
  it("restores changed inputs, leaving computed/constant values to the scene", () => {
    expect(experimentRestorePlan(snapshot, 37, variables, { I: 4, R: 10, constant: 9 })).toEqual({ changes: { I: 2 } })
    expect(experimentRestorePlan(snapshot, 37, variables, snapshot.values).disabledReason).toContain("already match")
  })
  it("rejects a different equation, changed ranges, missing inputs and locked changes as a whole", () => {
    expect(experimentRestorePlan(snapshot, 38, variables, { I: 4, R: 20 }).disabledReason).toBeTruthy()
    expect(experimentRestorePlan(snapshot, 37, variables.map((v) => v.name === "I" ? { ...v, max: 1 } : v), { I: .5, R: 20 }).changes).toEqual({})
    expect(experimentRestorePlan(captureExperiment(37, { I: 2 }), 37, variables, { I: 4, R: 20 }).disabledReason).toBeTruthy()
    expect(experimentRestorePlan(snapshot, 37, variables.map((v) => v.name === "R" ? { ...v, locked: true } : v), { I: 4, R: 20 }).changes).toEqual({})
    expect(experimentRestorePlan(snapshot, 37, variables.filter((v) => v.constant), snapshot.values).disabledReason).toContain("diagram controls")
  })
})

describe("prediction execution boundary", () => {
  const values = { I: 2, R: 10, constant: 3 }
  const change = { variableName: "I", value: 4, expectedValues: values }
  it("accepts exactly a distinct legal input with a fresh complete baseline", () => {
    expect(experimentChangeAllowed(change, variables, values)).toBe(true)
    for (const value of [2, -1, 11, NaN, Infinity, 4.05]) {
      expect(experimentChangeAllowed({ ...change, value }, variables, values)).toBe(false)
    }
    expect(experimentChangeAllowed(change, variables, { ...values, R: 11 })).toBe(false)
    expect(experimentChangeAllowed({ ...change, expectedValues: { I: 2 } }, variables, values)).toBe(false)
    expect(experimentChangeAllowed({ ...change, variableName: "missing" }, variables, values)).toBe(false)
  })
  it("rejects locked and read-only targets", () => {
    expect(experimentChangeAllowed(change, variables.map((v) => ({ ...v, locked: true })), values)).toBe(false)
    expect(experimentChangeAllowed({ ...change, variableName: "constant", value: 4 }, variables, values)).toBe(false)
  })
  it("rejects a floating-point reconstruction of the same slider stop", () => {
    const fisher: Variable[] = [{ ...variables[0], name: "r", value: .1, min: -.05, max: .1, step: .001 }]
    expect(experimentChangeAllowed({ variableName: "r", value: -.05 + 150 * .001, expectedValues: { r: .1 } }, fisher, { r: .1 })).toBe(false)
    expect(experimentChangeAllowed({ variableName: "r", value: .099, expectedValues: { r: .1 } }, fisher, { r: .1 })).toBe(true)
  })
})

describe("live scalar curriculum coverage", () => {
  const scalarEquations = subjectPayloads.filter((equation) => subjectResults[equation.id])
  it("provides existing models for exactly 56 subjects, keeping the other eight input-only", () => {
    expect(scalarEquations).toHaveLength(56)
    expect(subjectPayloads.filter((equation) => !subjectResults[equation.id]).map((equation) => equation.id)).toEqual([18, 48, 50, 52, 56, 63, 75, 77])
  })
  it.each(scalarEquations)("equation $id can run its generated trial through the real execution guard", (equation) => {
    const controls: Variable[] = equation.variables_data.map((variable) => ({
      ...variable, latex: variable.symbol, value: variable.default, unit: variable.unit ?? undefined,
    }))
    const current = Object.fromEntries(controls.map((variable) => [variable.name, variable.value]))
    const trial = createPredictionExperiment(subjectResults[equation.id], controls, current)
    expect(trial).not.toBeNull()
    expect(experimentChangeAllowed({ variableName: trial!.variableName, value: trial!.to, expectedValues: trial!.expectedValues }, controls, current)).toBe(true)
    expect(Number.isFinite(trial!.before) && Number.isFinite(trial!.after)).toBe(true)
  })
})
