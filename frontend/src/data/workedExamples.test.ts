import { describe, expect, it } from "vitest"
import { workedExamples, getWorkedExample } from "./workedExamples"

describe("workedExamples", () => {
  it("returns a worked example for a known equation", () => {
    const ex = getWorkedExample(37) // Ohm: V = I × R
    expect(ex).not.toBeNull()
    expect(ex?.steps.join(" ")).toMatch(/V = I/)
    expect(ex?.steps.at(-1)).toContain("20 V")
  })

  it("returns null when none is curated", () => {
    expect(getWorkedExample(999)).toBeNull()
  })

  it("every example is well-formed (scenario + at least two substitution steps, subject id)", () => {
    for (const [id, ex] of Object.entries(workedExamples)) {
      expect(Number(id)).toBeGreaterThanOrEqual(18)
      expect(Number(id)).toBeLessThanOrEqual(81)
      expect(ex.given.trim().length).toBeGreaterThan(10)
      expect(ex.steps.length).toBeGreaterThanOrEqual(2)
      ex.steps.forEach((s) => expect(s.trim().length).toBeGreaterThan(0))
    }
  })
})
