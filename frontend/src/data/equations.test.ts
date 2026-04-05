import { describe, it, expect } from "vitest"
import { equations } from "./equations"

describe("equations data", () => {
  it("contains exactly 17 equations", () => {
    expect(equations).toHaveLength(17)
  })

  it("has unique ids from 1 to 17", () => {
    const ids = equations.map((e) => e.id)
    expect(ids).toEqual(Array.from({ length: 17 }, (_, i) => i + 1))
  })

  it("every equation has required fields", () => {
    for (const eq of equations) {
      expect(eq.title).toBeTruthy()
      expect(eq.formula).toBeTruthy()
      expect(eq.author).toBeTruthy()
      expect(eq.year).toBeTruthy()
      expect(eq.category).toBeTruthy()
    }
  })

  it("formulas contain valid LaTeX (no empty strings)", () => {
    for (const eq of equations) {
      expect(eq.formula.trim().length).toBeGreaterThan(0)
    }
  })
})
