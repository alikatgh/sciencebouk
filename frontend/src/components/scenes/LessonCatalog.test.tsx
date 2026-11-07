import type { ComponentType } from "react"
import { cleanup, render } from "@testing-library/react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import subjectPayloads from "../../data/content/subject-equations-fallback.json"
import { getConceptCheck } from "../../data/conceptChecks"
import { getLessonCopy } from "../teaching/lessonContent"
import { applyLessonAction, applyLessonVariableInteraction, createLessonAttempt } from "../teaching/lessonInteraction"
import type { LessonStep, Variable } from "../teaching/types"
import { PythagorasScene } from "./PythagorasScene"
import { LogarithmScene } from "./LogarithmScene"
import { CalculusScene } from "./CalculusScene"
import { GravityScene } from "./GravityScene"
import { WaveScene } from "./WaveScene"
import { ComplexScene } from "./ComplexScene"
import { EulerPolyhedraScene } from "./EulerPolyhedraScene"
import { NormalDistributionScene } from "./NormalDistributionScene"
import { FourierScene } from "./FourierScene"
import { FluidScene } from "./FluidScene"
import { MaxwellScene } from "./MaxwellScene"
import { EntropyScene } from "./EntropyScene"
import { RelativityScene } from "./RelativityScene"
import { SchrodingerScene } from "./SchrodingerScene"
import { InformationScene } from "./InformationScene"
import { ChaosScene } from "./ChaosScene"
import { BlackScholesScene } from "./BlackScholesScene"
import { ConfigurableEquationScene } from "./ConfigurableEquationScene"

interface CapturedScene {
  equationId?: number
  variables: Variable[]
  lessonSteps: LessonStep[]
  buildResultLine?: (values: Record<string, number>) => string
}

const state = vi.hoisted(() => ({
  equationId: 0,
  equation: undefined as (typeof subjectPayloads)[number] | undefined,
  catalog: new Map<number, CapturedScene>(),
}))

vi.mock("../../settings/SettingsContext", () => ({ useSettings: () => ({ settings: { language: "en" } }) }))
vi.mock("../teaching/EquationContext", () => ({ useEquationId: () => state.equationId }))
vi.mock("../../api/hooks", () => ({
  useEquation: () => ({ data: state.equation, isLoading: false, isError: false }),
}))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: (props: CapturedScene) => {
    state.catalog.set(state.equationId, props)
    // Capture the production configuration without mounting its simulation.
    return null
  },
}))

const bespokeScenes: Array<{ id: number; slug: string; Scene: ComponentType }> = [
  { id: 1, slug: "pythagoras", Scene: PythagorasScene },
  { id: 2, slug: "logarithm", Scene: LogarithmScene },
  { id: 3, slug: "calculus", Scene: CalculusScene },
  { id: 4, slug: "gravity", Scene: GravityScene },
  { id: 5, slug: "wave", Scene: WaveScene },
  { id: 6, slug: "complex", Scene: ComplexScene },
  { id: 7, slug: "euler-polyhedra", Scene: EulerPolyhedraScene },
  { id: 8, slug: "normal-distribution", Scene: NormalDistributionScene },
  { id: 9, slug: "fourier", Scene: FourierScene },
  { id: 10, slug: "fluid", Scene: FluidScene },
  { id: 11, slug: "maxwell", Scene: MaxwellScene },
  { id: 12, slug: "entropy", Scene: EntropyScene },
  { id: 13, slug: "relativity", Scene: RelativityScene },
  { id: 14, slug: "schrodinger", Scene: SchrodingerScene },
  { id: 15, slug: "information", Scene: InformationScene },
  { id: 16, slug: "chaos", Scene: ChaosScene },
  { id: 17, slug: "black-scholes", Scene: BlackScholesScene },
]

beforeAll(() => {
  for (const { id, Scene } of bespokeScenes) {
    state.equationId = id
    render(<Scene />).unmount()
  }
  for (const equation of subjectPayloads) {
    state.equationId = equation.id
    state.equation = equation
    render(<ConfigurableEquationScene />).unmount()
  }
})

afterAll(cleanup)

function initialValues(config: CapturedScene): Record<string, number> {
  return Object.fromEntries(config.variables.map((variable) => [variable.name, variable.value]))
}

function alternativeValue(variable: Variable, value: number): number {
  const alternative = [variable.min, variable.max].find((candidate) => !Object.is(candidate, value))
  expect(alternative, `${variable.name} needs a different reachable input`).toBeDefined()
  return alternative!
}

/** Find a legal slider stop inside the goal's tolerance, rather than assuming its exact value is selectable. */
function reachableValue(variable: Variable, value: number, tolerance: number): number {
  expect(Number.isFinite(value)).toBe(true)
  expect(Number.isFinite(tolerance) && tolerance >= 0).toBe(true)
  const index = (value - variable.min) / variable.step
  const candidates = [variable.min, variable.max, ...[Math.floor(index), Math.ceil(index)].map((stop) =>
    Number((variable.min + stop * variable.step).toPrecision(14)),
  )]
  const reachable = candidates.find((candidate) => candidate >= variable.min && candidate <= variable.max
    && Math.abs(candidate - value) <= tolerance)
  expect(reachable, `${variable.name} goal ${value} ± ${tolerance} must have a selectable value`).toBeDefined()
  return reachable!
}

function exerciseNumericGoal(id: number, config: CapturedScene, step: LessonStep): void {
  const condition = step.successCondition
  const values = initialValues(config)
  const target = config.variables.find((variable) => variable.name === condition.target)!
  expect(target, `${id}/${step.id} target must exist`).toBeDefined()

  if (condition.type === "variable_changed") {
    expect(step.unlockedVariables).toContain(target.name)
    const next = { ...values, [target.name]: alternativeValue(target, values[target.name]) }
    const attempt = createLessonAttempt(0, values)
    expect(applyLessonVariableInteraction(attempt, step, target.name, values, next, "system").stepCompleted).toBe(false)
    expect(applyLessonVariableInteraction(attempt, step, target.name, values, next, "learner").stepCompleted).toBe(true)
    return
  }

  if (!step.unlockedVariables.includes(target.name)) {
    // Calculus is the one derived lesson target: changing t updates the slope readout.
    // Find its witness through the actual scene result callback, without duplicating f′.
    expect(id, "an unrecognized derived target needs an explicit reachability check").toBe(3)
    expect(target.name).toBe("slope")
    expect(target.constant).toBe(true)
    expect(config.buildResultLine).toBeTypeOf("function")
    const driver = config.variables.find((variable) => variable.name === "t")!
    expect(step.unlockedVariables).toContain(driver.name)
    let witness: { input: number; output: number } | undefined
    for (let stop = 0; stop <= Math.round((driver.max - driver.min) / driver.step); stop += 1) {
      const input = Number((driver.min + stop * driver.step).toPrecision(14))
      const result = config.buildResultLine!({ ...values, [driver.name]: input })
      const output = Number(result.match(/=\s*(-?\d+(?:\.\d+)?)/)?.[1])
      if (Number.isFinite(output) && Math.abs(output - condition.value!) <= (condition.tolerance ?? 0.5)) {
        witness = { input, output }
        break
      }
    }
    expect(witness, "an unlocked t setting must reach the authored flat-slope goal").toBeDefined()
    const attempt = createLessonAttempt(0, values)
    const driverValues = { ...values, t: witness!.input }
    const derivedValues = { ...driverValues, slope: witness!.output }
    expect(applyLessonVariableInteraction(attempt, step, "slope", driverValues, derivedValues, "system").stepCompleted).toBe(false)
    const driven = applyLessonVariableInteraction(attempt, step, "t", values, driverValues, "learner")
    expect(driven.stepCompleted).toBe(false)
    expect(applyLessonVariableInteraction(driven, step, "slope", driverValues, derivedValues, "system").stepCompleted).toBe(true)
    return
  }

  const targets = [
    { target: condition.target!, value: condition.value!, tolerance: condition.tolerance },
    ...(condition.additionalTargets ?? []),
  ]
  expect(new Set(targets.map((goal) => goal.target)).size).toBe(targets.length)
  const goalValues = { ...values }
  for (const goal of targets) {
    const variable = config.variables.find((candidate) => candidate.name === goal.target)!
    expect(variable, `${id}/${step.id}/${goal.target} target must exist`).toBeDefined()
    expect(step.unlockedVariables).toContain(goal.target)
    goalValues[goal.target] = reachableValue(variable, goal.value, goal.tolerance ?? 0.5)
  }
  const previous = { ...goalValues, [target.name]: alternativeValue(target, goalValues[target.name]) }
  const attempt = createLessonAttempt(0, previous)
  expect(applyLessonVariableInteraction(attempt, step, target.name, previous, goalValues, "system").stepCompleted).toBe(false)
  expect(applyLessonVariableInteraction(attempt, step, target.name, previous, goalValues, "preset").stepCompleted).toBe(false)
  expect(applyLessonVariableInteraction(attempt, step, target.name, previous, goalValues, "learner").stepCompleted).toBe(true)
}

describe("effective lesson catalog", () => {
  it("captures 81 lessons and 246 interactive steps from the 17 scenes and 64 runtime subject payloads", () => {
    expect(bespokeScenes).toHaveLength(17)
    expect(subjectPayloads).toHaveLength(64)
    expect([...state.catalog.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 81 }, (_, index) => index + 1))
    expect(bespokeScenes.reduce((count, { id }) => count + state.catalog.get(id)!.lessonSteps.length, 0)).toBe(54)
    expect(subjectPayloads.reduce((count, { id }) => count + state.catalog.get(id)!.lessonSteps.length, 0)).toBe(192)
    expect([...state.catalog.values()].reduce((count, config) => count + config.lessonSteps.length, 0)).toBe(246)
  })

  it("retains authored English step identities and copy through both production configuration paths", () => {
    for (const { id, slug } of bespokeScenes) {
      const authored = getLessonCopy(slug, "en")
      const steps = state.catalog.get(id)!.lessonSteps
      expect(steps.map((step) => step.id), `${id} step identities`).toEqual(Object.keys(authored))
      for (const step of steps) {
        expect(step.instruction).toBe(authored[step.id].instruction)
        expect(step.insight).toBe(authored[step.id].insight)
      }
    }
    for (const equation of subjectPayloads) {
      const config = state.catalog.get(equation.id)!
      expect(config.equationId).toBe(equation.id)
      expect(config.lessonSteps.map((step) => step.id)).toEqual(equation.lessons_data.map((step) => step.id))
      config.lessonSteps.forEach((step, index) => {
        const authored = equation.lessons_data[index]
        expect(step.instruction).toBe(authored.instruction)
        expect(step.insight).toBe(authored.insight)
        expect(step.successCondition.additionalTargets).toEqual("successAdditionalTargets" in authored ? authored.successAdditionalTargets : undefined)
      })
    }
  })

  for (let id = 1; id <= 81; id += 1) {
    it(`equation ${id} has a curated check and uniquely identified, reachable learner actions`, () => {
      const config = state.catalog.get(id)!
      expect(config).toBeDefined()
      expect(getConceptCheck(id)).not.toBeNull()
      expect(config.lessonSteps.length).toBeGreaterThan(0)
      expect(new Set(config.lessonSteps.map((step) => step.id)).size).toBe(config.lessonSteps.length)
      const names = config.variables.map((variable) => variable.name)
      expect(new Set(names).size).toBe(names.length)
      for (const step of config.lessonSteps) {
        expect(step.id).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(step.instruction.trim().length).toBeGreaterThan(0)
        expect(step.insight.trim().length).toBeGreaterThan(0)
        expect(["variable_changed", "value_reached", "clicked"]).toContain(step.successCondition.type)
        for (const unlocked of step.unlockedVariables) expect(names).toContain(unlocked)
        const condition = step.successCondition
        if (condition.type === "clicked") {
          const actions: Record<number, string[]> = { 7: ["select-cube"], 11: ["move-charge", "show-em-wave"] }
          expect(actions[id], `${id}/${step.id} must name a supported scene action`).toContain(condition.target)
          const attempt = createLessonAttempt(0, initialValues(config))
          expect(applyLessonAction(attempt, step, "unrelated-action").stepCompleted).toBe(false)
          expect(applyLessonAction(attempt, step, condition.target!).stepCompleted).toBe(true)
        } else {
          exerciseNumericGoal(id, config, step)
        }
      }
    })
  }

  const compoundCases: Array<{
    id: number
    stepId: string
    start: Record<string, number>
    changes: Array<[string, number]>
  }> = [
    { id: 1, stepId: "classic", start: { a: 8, b: 8 }, changes: [["a", 3], ["b", 4]] },
    { id: 23, stepId: "equal", start: { z1: 2, z2: 1, z3: -1 }, changes: [["z1", 0], ["z2", 0], ["z3", 0]] },
    { id: 23, stepId: "dominate", start: { z1: 2, z2: 1, z3: -1 }, changes: [["z1", 5], ["z2", 0], ["z3", 0]] },
    { id: 68, stepId: "stable", start: { N: 2, P: 2 }, changes: [["N", 0], ["P", 0]] },
    { id: 68, stepId: "unstable", start: { N: -2, P: 2 }, changes: [["N", 2], ["P", 0]] },
    { id: 75, stepId: "closed", start: { rho: 1, k: -1 }, changes: [["k", 1], ["rho", 5]] },
  ]
  it.each(compoundCases)("equation $id / $stepId requires every authored setting after runtime mapping", ({ id, stepId, start, changes }) => {
    const config = state.catalog.get(id)!
    const step = config.lessonSteps.find((candidate) => candidate.id === stepId)!
    let previous = { ...initialValues(config), ...start }
    let attempt = createLessonAttempt(0, previous)
    changes.forEach(([name, value], index) => {
      const next = { ...previous, [name]: value }
      attempt = applyLessonVariableInteraction(attempt, step, name, previous, next, "learner")
      expect(attempt.stepCompleted).toBe(index === changes.length - 1)
      previous = next
    })
  })
})
