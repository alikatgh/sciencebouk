import { describe, expect, it } from "vitest"
import { conceptChecks, getConceptCheck } from "./conceptChecks"

describe("conceptChecks", () => {
  it("returns a well-formed check for a known equation", () => {
    const check = getConceptCheck(37) // Ohm's law
    expect(check).not.toBeNull()
    expect(check?.question).toMatch(/current/i)
    expect(check?.options.length).toBeGreaterThanOrEqual(2)
  })

  it("returns null when no check is curated", () => {
    expect(getConceptCheck(999)).toBeNull()
  })

  it("covers EVERY subject equation (ids 18-81)", () => {
    for (let id = 18; id <= 81; id += 1) {
      expect(getConceptCheck(id), `concept check missing for equation ${id}`).not.toBeNull()
    }
  })

  it("every check is internally consistent (valid answer index, non-empty fields, subject id)", () => {
    for (const [id, check] of Object.entries(conceptChecks)) {
      expect(Number(id)).toBeGreaterThanOrEqual(18)
      expect(Number(id)).toBeLessThanOrEqual(81)
      expect(check.question.length).toBeGreaterThan(10)
      expect(check.options.length).toBeGreaterThanOrEqual(2)
      expect(check.correctIndex).toBeGreaterThanOrEqual(0)
      expect(check.correctIndex).toBeLessThan(check.options.length)
      expect(check.explanation.length).toBeGreaterThan(15)
      // options are distinct and non-empty
      expect(new Set(check.options).size).toBe(check.options.length)
      check.options.forEach((o) => expect(o.trim().length).toBeGreaterThan(0))
    }
  })
})
