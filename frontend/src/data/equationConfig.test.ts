import { describe, expect, it } from "vitest"
import { getEquationConfig } from "./equationConfig"

describe("equationConfig", () => {
  it("preserves time-elapsed lesson durations from the source data", () => {
    const calculus = getEquationConfig(3)
    const exploreStep = calculus?.lessonSteps.find((step) => step.id === "explore")

    expect(exploreStep?.successCondition.type).toBe("time_elapsed")
    expect(exploreStep?.successCondition.duration).toBe(15000)
  })

  it("does not invent highlight elements from unlocked variable names", () => {
    const gravity = getEquationConfig(4)
    const touchStep = gravity?.lessonSteps.find((step) => step.id === "touch")

    expect(touchStep?.highlightElements).toEqual([])
  })
})
