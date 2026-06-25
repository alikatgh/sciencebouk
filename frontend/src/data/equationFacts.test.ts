import { describe, expect, it } from "vitest"
import { equationFacts, getEquationFact } from "./equationFacts"

describe("equationFacts", () => {
  it("returns the curated fact for a known equation", () => {
    expect(getEquationFact(37)).toMatch(/Ohm/)
    expect(getEquationFact(21)).toMatch(/Bayes/)
  })

  it("returns null for an equation with no curated fact", () => {
    expect(getEquationFact(999)).toBeNull()
    expect(getEquationFact(50)).toBeNull() // a valid id without a fact
  })

  it("every fact is a non-trivial, keyed to a subject equation (18-81)", () => {
    for (const [id, fact] of Object.entries(equationFacts)) {
      expect(Number(id)).toBeGreaterThanOrEqual(18)
      expect(Number(id)).toBeLessThanOrEqual(81)
      expect(fact.length).toBeGreaterThan(40)
    }
  })
})
