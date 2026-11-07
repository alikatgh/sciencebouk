import { describe, expect, it, vi } from "vitest"
import { subjectResults } from "../../data/subjectResults"
import { comparePredictionResults, createPredictionExperiment, predictionInputsKey } from "./predictionExperiment"
import type { Variable } from "./types"

function variable(name: string, value: number, overrides: Partial<Variable> = {}): Variable {
  return { name, symbol: name, latex: name, value, min: 0, max: 10, step: 1, color: "#315cdd", ...overrides }
}

describe("bounded prediction experiments", () => {
  it("calculates Ohm's law from the actual current values and changes exactly one input", () => {
    const values = { I: 2, R: 10, unchanged: 7 }
    const experiment = createPredictionExperiment(subjectResults[37], [variable("I", 1), variable("R", 10)], values)
    expect(experiment).toMatchObject({ variableName: "I", from: 2, to: 3, before: 20, after: 30, direction: "increase" })
    expect(experiment?.expectedValues).toEqual(values)
    expect(experiment?.expectedValues).not.toBe(values)
    expect(Object.isFrozen(experiment)).toBe(true)
    expect(Object.isFrozen(experiment?.expectedValues)).toBe(true)
    values.I = 9
    expect(experiment?.expectedValues.I).toBe(2)
    expect(experiment?.before).toBe(20)
  })

  it("passes separate frozen current and candidate snapshots to the existing evaluator", () => {
    const compute = vi.fn(subjectResults[37].compute)
    const values = { I: 2, R: 10 }
    const experiment = createPredictionExperiment({ ...subjectResults[37], compute }, [variable("I", 2)], values)
    expect(experiment).not.toBeNull()
    expect(compute.mock.calls).toHaveLength(2)
    expect(compute.mock.calls[0][0]).toEqual({ I: 2, R: 10 })
    expect(compute.mock.calls[1][0]).toEqual({ I: 3, R: 10 })
    expect(Object.isFrozen(compute.mock.calls[0][0])).toBe(true)
    expect(Object.isFrozen(compute.mock.calls[1][0])).toBe(true)
    expect(values).toEqual({ I: 2, R: 10 })
  })

  it.each([
    [41, [variable("m", 1), variable("v", 1)], { m: 1, v: 1 }],
    [42, [variable("dx", 1)], { dx: 1 }],
  ] as const)("recognizes a real decrease in very small outputs for model %s", (id, variables, values) => {
    const experiment = createPredictionExperiment(subjectResults[id], [...variables], values)
    expect(experiment).not.toBeNull()
    expect(experiment?.before).toBeGreaterThan(0)
    expect(experiment?.before).toBeLessThan(1e-20)
    expect(experiment?.after).toBeLessThan(experiment!.before)
    expect(experiment?.direction).toBe("decrease")
  })

  it("compares the actual pair for a nonmonotonic model rather than assuming a trend", () => {
    const experiment = createPredictionExperiment(subjectResults[45], [variable("p", 0.75, { min: 0, max: 1, step: 0.05 })], { p: 0.75 })
    expect(experiment?.to).toBeCloseTo(0.8)
    expect(experiment?.before).toBeCloseTo(0.375)
    expect(experiment?.after).toBeCloseTo(0.32)
    expect(experiment?.direction).toBe("decrease")
  })

  it("allows symmetric inputs and logarithmic plateaus to stay the same", () => {
    const symmetric = createPredictionExperiment(subjectResults[45], [variable("p", 0.25, { min: 0.25, max: 0.75, step: 0.5 })], { p: 0.25 })
    expect(symmetric).toMatchObject({ from: 0.25, to: 0.75, before: 0.375, after: 0.375, direction: "same" })
    const plateau = createPredictionExperiment(subjectResults[19], [variable("n", 5, { min: 1, max: 16 })], { n: 5 })
    expect(plateau).toMatchObject({ from: 5, to: 6, before: 3, after: 3, direction: "same" })
  })

  it("accepts a finite zero result as an unchanged observation", () => {
    const experiment = createPredictionExperiment(subjectResults[37], [variable("I", 2), variable("R", 0, { constant: true })], { I: 2, R: 0 })
    expect(experiment).toMatchObject({ from: 2, to: 3, before: 0, after: 0, direction: "same" })
  })

  it("skips invalid Snell and SVD starting results without proposing a run", () => {
    expect(createPredictionExperiment(subjectResults[38], [variable("theta1", 80, { max: 90 })], { n1: 2, theta1: 80, n2: 1 })).toBeNull()
    expect(createPredictionExperiment(subjectResults[79], [variable("s2", 0)], { s1: 5, s2: 0 })).toBeNull()
  })

  it("tries a finite candidate in the other direction when a Snell candidate is invalid", () => {
    const experiment = createPredictionExperiment(subjectResults[38], [variable("n1", 1.9, { min: 1.4, max: 2.4, step: 0.5 })], { n1: 1.9, theta1: 30, n2: 1 })
    expect(experiment?.to).toBeCloseTo(1.4)
    expect(Number.isFinite(experiment?.before)).toBe(true)
    expect(Number.isFinite(experiment?.after)).toBe(true)
    expect(experiment?.direction).toBe("decrease")
  })

  it("returns no trial if every distinct SVD candidate has an invalid result", () => {
    expect(createPredictionExperiment(subjectResults[79], [variable("s2", 0.5, { min: 0, max: 0.5, step: 0.5 })], { s1: 5, s2: 0.5 })).toBeNull()
  })

  it("respects locks, constants, boundaries and the input step grid", () => {
    const values = { fixed: 3, locked: 4, x: 0.95 }
    const variables = [
      variable("fixed", 3, { constant: true }), variable("locked", 4, { locked: true }),
      variable("x", 0.95, { min: 0.05, max: 0.95, step: 0.1 }),
    ]
    const experiment = createPredictionExperiment({ symbol: "y", compute: (v) => v.x + v.fixed + v.locked }, variables, values)
    expect(experiment?.variableName).toBe("x")
    expect(experiment!.to).toBeGreaterThanOrEqual(0.05)
    expect(experiment!.to).toBeLessThanOrEqual(0.95)
    const gridPosition = (experiment!.to - 0.05) / 0.1
    expect(gridPosition).toBeCloseTo(Math.round(gridPosition))
    const after = { ...experiment!.expectedValues, [experiment!.variableName]: experiment!.to }
    expect(Object.keys(values).filter((name) => after[name as keyof typeof values] !== values[name as keyof typeof values])).toEqual(["x"])
    expect(createPredictionExperiment(subjectResults[37], [variable("I", 2, { locked: true }), variable("R", 10, { constant: true })], { I: 2, R: 10 })).toBeNull()
  })

  it.each([0, 1, 2, 3])("moves to a different Fisher grid stop from the upper endpoint on trial %s", (trialIndex) => {
    const rate = variable("r", 0.1, { min: -0.05, max: 0.1, step: 0.001 })
    const values = { r: 0.1, pi: 0.02 }
    const experiment = createPredictionExperiment(subjectResults[54], [rate], values, trialIndex)
    expect(experiment).not.toBeNull()
    expect(experiment!.from).toBe(0.1)
    expect(experiment!.to).toBeLessThan(0.1)
    expect(Math.abs(experiment!.to - experiment!.from) / rate.step).toBeGreaterThanOrEqual(1 - 1e-7)
    expect(Math.round((experiment!.to - rate.min) / rate.step)).not.toBe(Math.round((values.r - rate.min) / rate.step))
    expect(experiment!.before).toBe(subjectResults[54].compute(values))
    expect(experiment!.after).toBe(subjectResults[54].compute({ ...values, r: experiment!.to }))
    expect(experiment!.direction).toBe("decrease")
  })

  it("uses exact Fisher endpoints when a candidate reaches either end of its lattice", () => {
    const rate = variable("r", 0.099, { min: -0.05, max: 0.1, step: 0.001 })
    const upper = createPredictionExperiment(subjectResults[54], [rate], { r: 0.099, pi: 0.02 })
    expect(upper?.to).toBe(rate.max)
    const lower = createPredictionExperiment(subjectResults[54], [{ ...rate, value: -0.049 }], { r: -0.049, pi: 0.02 }, 1)
    expect(lower?.to).toBe(rate.min)
    expect(lower?.direction).toBe("decrease")
  })

  it("keeps negative lattice endpoints exact and skips their recomputed epsilon neighbors", () => {
    const input = variable("x", -0.1, { min: -0.3, max: -0.1, step: 0.1 })
    const measurement = { symbol: "x", compute: (values: Record<string, number>) => values.x }
    const fromUpper = createPredictionExperiment(measurement, [input], { x: -0.1 })
    expect(fromUpper?.to).toBeCloseTo(-0.2)
    expect(fromUpper?.direction).toBe("decrease")
    expect(Math.abs(fromUpper!.to - fromUpper!.from) / input.step).toBeGreaterThan(0.99)
    expect(createPredictionExperiment(measurement, [input], { x: -0.2 })?.to).toBe(input.max)
    expect(createPredictionExperiment(measurement, [input], { x: -0.2 }, 1)?.to).toBe(input.min)
  })

  it("does not invent a grid stop at a maximum outside the step lattice", () => {
    const input = variable("x", 0.02, { min: -0.05, max: 0.12, step: 0.05 })
    const measurement = { symbol: "x", compute: (values: Record<string, number>) => values.x }
    for (const trialIndex of [0, 1, 2, 3]) {
      const experiment = createPredictionExperiment(measurement, [input], { x: input.max }, trialIndex)
      expect(experiment).not.toBeNull()
      expect(experiment!.to).toBeLessThanOrEqual(input.max)
      const gridPosition = (experiment!.to - input.min) / input.step
      expect(gridPosition).toBeCloseTo(Math.round(gridPosition))
      expect(Math.abs(experiment!.to - experiment!.from) / input.step).toBeGreaterThan(1e-7)
    }
  })

  it("preserves real input steps at tiny scales without an absolute epsilon floor", () => {
    const input = variable("x", 1e-34, { min: -5e-35, max: 1e-34, step: 1e-36 })
    const measurement = { symbol: "x", compute: (values: Record<string, number>) => values.x }
    const experiment = createPredictionExperiment(measurement, [input], { x: input.max })
    expect(experiment).not.toBeNull()
    expect(experiment!.to).toBeLessThan(input.max)
    expect((experiment!.from - experiment!.to) / input.step).toBeCloseTo(1)
    expect(experiment!.direction).toBe("decrease")
  })

  it("cycles editable parameters deterministically and bounds the search", () => {
    const variables = [variable("I", 2), variable("R", 5)]
    expect(createPredictionExperiment(subjectResults[37], variables, { I: 2, R: 5 }, 0)?.variableName).toBe("I")
    expect(createPredictionExperiment(subjectResults[37], variables, { I: 2, R: 5 }, 1)?.variableName).toBe("R")
    const compute = vi.fn((v: Record<string, number>) => v.x === 5 && v.y === 5 ? 1 : Number.NaN)
    expect(createPredictionExperiment({ symbol: "y", compute }, [variable("x", 5), variable("y", 5)], { x: 5, y: 5 })).toBeNull()
    expect(compute.mock.calls.length).toBeLessThanOrEqual(9)
  })

  it("rejects unusable input ranges and evaluator exceptions", () => {
    const measurement = { symbol: "y", compute: (v: Record<string, number>) => v.x }
    for (const overrides of [{ step: 0 }, { step: -1 }, { max: 0 }, { min: Number.NaN }, { max: Infinity }]) {
      expect(createPredictionExperiment(measurement, [variable("x", 5, overrides)], { x: 5 })).toBeNull()
    }
    expect(createPredictionExperiment({ symbol: "y", compute: () => { throw new Error("undefined") } }, [variable("x", 5)], { x: 5 })).toBeNull()
  })

  it("uses relative numerical tolerance without an absolute floor", () => {
    expect(comparePredictionResults(1e-34, 2e-34)).toBe("increase")
    expect(comparePredictionResults(2e-34, 1e-34)).toBe("decrease")
    expect(comparePredictionResults(0, Number.MIN_VALUE)).toBe("increase")
    expect(comparePredictionResults(0, 0)).toBe("same")
    expect(comparePredictionResults(0.32, 0.32000000000000006)).toBe("same")
  })

  it("keys fresh inputs by actual values and permissions, independent of object recreation", () => {
    const variables = [variable("I", 2), variable("R", 5)]
    const initial = predictionInputsKey(variables, { I: 2, R: 5 })
    expect(predictionInputsKey(variables.map((entry) => ({ ...entry })), { R: 5, I: 2 })).toBe(initial)
    expect(predictionInputsKey(variables, { I: 3, R: 5 })).not.toBe(initial)
    expect(predictionInputsKey([{ ...variables[0], locked: true }, variables[1]], { I: 2, R: 5 })).not.toBe(initial)
  })
})
