import { describe, expect, it } from "vitest"
import { equationFacts, getEquationFact } from "./equationFacts"

describe("equationFacts", () => {
  it("returns the curated fact for a known equation", () => {
    expect(getEquationFact(37)).toMatch(/Ohm/)
    expect(getEquationFact(21)).toMatch(/Bayes/)
  })

  it("returns null outside the subject-equation range", () => {
    expect(getEquationFact(999)).toBeNull()
    expect(getEquationFact(1)).toBeNull() // core-17 equations use bespoke scenes, not this data
  })

  it("covers EVERY subject equation (ids 18-81) — the Learn-more panel is always available", () => {
    for (let id = 18; id <= 81; id += 1) {
      expect(getEquationFact(id), `fact missing for equation ${id}`).not.toBeNull()
    }
  })

  it("every fact is non-trivial and keyed to a subject equation", () => {
    for (const [id, fact] of Object.entries(equationFacts)) {
      expect(Number(id)).toBeGreaterThanOrEqual(18)
      expect(Number(id)).toBeLessThanOrEqual(81)
      expect(fact.length).toBeGreaterThan(40)
    }
  })
})
