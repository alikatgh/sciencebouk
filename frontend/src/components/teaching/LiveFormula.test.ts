import { describe, expect, it } from "vitest"
import { fitScale } from "./LiveFormula"

describe("fitScale", () => {
  it("stays at 1 when the formula already fits", () => {
    expect(fitScale(272, 200, 0.62)).toBe(1)
  })

  it("scales down to fit a too-wide formula, never below minScale", () => {
    expect(fitScale(272, 400, 0.62)).toBeCloseTo(0.68, 2)
    expect(fitScale(200, 800, 0.62)).toBe(0.62)
  })

  it("ignores empty measurements", () => {
    expect(fitScale(0, 400, 0.62)).toBe(1)
    expect(fitScale(272, 0, 0.62)).toBe(1)
  })
})
