import { describe, expect, it } from "vitest"
import { presetIsActive, type Preset } from "./TeachableEquation"
import { applyLessonAction, applyLessonVariableInteraction, createLessonAttempt } from "./lessonInteraction"
import type { LessonStep } from "./types"

const balanced: Preset = { label: "Balanced", values: { K: 50, L: 50, alpha: 0.3 } }

describe("presetIsActive", () => {
  it("matches when every preset value equals current vars", () => {
    expect(presetIsActive(balanced, { K: 50, L: 50, alpha: 0.3 })).toBe(true)
  })

  it("does not match a partial or drifted set", () => {
    expect(presetIsActive(balanced, { K: 90, L: 20, alpha: 0.6 })).toBe(false)
    expect(presetIsActive(balanced, { K: 50, L: 50 })).toBe(false)
  })
})

const targetStep: LessonStep = {
  id: "reach-goal", instruction: "Reach the goal", highlightElements: [],
  unlockedVariables: ["a", "b"], successCondition: { type: "value_reached", target: "a", value: 5, tolerance: 0 },
  celebration: "subtle", insight: "A relationship changed.",
}

describe("purposeful lesson interactions", () => {
  it("requires fresh movement of the required value even when defaults already match", () => {
    const values = { a: 5, b: 1 }
    const initial = createLessonAttempt(0, values)
    expect(applyLessonVariableInteraction(initial, targetStep, "a", values, values, "learner").stepCompleted).toBe(false)
    const unrelated = applyLessonVariableInteraction(initial, targetStep, "b", values, { a: 5, b: 2 }, "learner")
    expect(unrelated.stepCompleted).toBe(false)
    const away = applyLessonVariableInteraction(unrelated, targetStep, "a", { a: 5, b: 2 }, { a: 4, b: 2 }, "learner")
    expect(applyLessonVariableInteraction(away, targetStep, "a", { a: 4, b: 2 }, { a: 5, b: 2 }, "learner").stepCompleted).toBe(true)
  })

  it.each(["preset", "reset", "restore"] as const)("does not earn completion from %s and invalidates an unearned attempt", (source) => {
    const initial = createLessonAttempt(0, { a: 3, b: 1 })
    const learnerAttempt = applyLessonVariableInteraction(initial, targetStep, "b", { a: 3, b: 1 }, { a: 3, b: 2 }, "learner")
    const changed = applyLessonVariableInteraction(learnerAttempt, targetStep, "a", { a: 3, b: 2 }, { a: 5, b: 2 }, source)
    expect(changed.stepCompleted).toBe(false)
    expect(changed.learnerVariables).toEqual([])
    expect(changed.revision).toBeGreaterThan(learnerAttempt.revision)
    expect(applyLessonVariableInteraction(changed, targetStep, "a", { a: 4, b: 2 }, { a: 5, b: 2 }, "system").stepCompleted).toBe(false)
  })

  it("allows a derived target only after a relevant learner driver changed", () => {
    const derivedStep: LessonStep = { ...targetStep, unlockedVariables: ["b"] }
    const initial = createLessonAttempt(0, { a: 3, b: 1 })
    expect(applyLessonVariableInteraction(initial, derivedStep, "a", { a: 3, b: 1 }, { a: 5, b: 1 }, "system").stepCompleted).toBe(false)
    const learnerAttempt = applyLessonVariableInteraction(initial, derivedStep, "b", { a: 3, b: 1 }, { a: 3, b: 2 }, "learner")
    expect(applyLessonVariableInteraction(learnerAttempt, derivedStep, "a", { a: 3, b: 2 }, { a: 5, b: 2 }, "system").stepCompleted).toBe(true)
  })

  it("requires every compound target and accepts the last required value the learner changes", () => {
    const step: LessonStep = {
      ...targetStep,
      successCondition: { type: "value_reached", target: "a", value: 3, tolerance: 0,
        additionalTargets: [{ target: "b", value: 4, tolerance: 0 }] },
    }
    const initial = createLessonAttempt(0, { a: 2, b: 2 })
    const firstValue = applyLessonVariableInteraction(initial, step, "a", { a: 2, b: 2 }, { a: 3, b: 2 }, "learner")
    expect(firstValue.stepCompleted).toBe(false)
    const bothValues = applyLessonVariableInteraction(firstValue, step, "b", { a: 3, b: 2 }, { a: 3, b: 4 }, "learner")
    expect(bothValues.stepCompleted).toBe(true)
    const defaultsAtGoal = createLessonAttempt(0, { a: 3, b: 4 })
    expect(applyLessonVariableInteraction(defaultsAtGoal, step, "b", { a: 3, b: 4 }, { a: 3, b: 4 }, "learner").stepCompleted).toBe(false)
  })

  it("accepts only the exact named scene action and never a timer", () => {
    const initial = createLessonAttempt(0, { a: 3 })
    const actionStep: LessonStep = { ...targetStep, successCondition: { type: "clicked", target: "measure" } }
    expect(applyLessonAction(initial, actionStep, "Measure").stepCompleted).toBe(false)
    expect(applyLessonAction(initial, actionStep, "").stepCompleted).toBe(false)
    expect(applyLessonAction(initial, actionStep, "measure").stepCompleted).toBe(true)
    const timerStep: LessonStep = { ...targetStep, successCondition: { type: "time_elapsed", duration: 1 } }
    expect(applyLessonVariableInteraction(initial, timerStep, "a", { a: 3 }, { a: 5 }, "learner").stepCompleted).toBe(false)
    expect(applyLessonAction(initial, timerStep, "measure").stepCompleted).toBe(false)
  })

  it("keeps an earned step after a preset and copies its starting values", () => {
    const values = { a: 3 }
    const initial = createLessonAttempt(0, values)
    values.a = 4
    expect(initial.stepStartValues).toEqual({ a: 3 })
    const earned = applyLessonVariableInteraction(initial, targetStep, "a", { a: 3 }, { a: 5 }, "learner")
    expect(applyLessonVariableInteraction(earned, targetStep, "a", { a: 5 }, { a: 3 }, "preset").stepCompleted).toBe(true)
  })
})
