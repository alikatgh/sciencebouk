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

  it("keeps preset values within declared variable ranges", () => {
    for (const equation of equations) {
      const variableByName = new Map(equation.variables.map((variable) => [variable.name, variable]))

      for (const preset of equation.presets) {
        for (const [name, value] of Object.entries(preset.values)) {
          const variable = variableByName.get(name)
          expect(variable, `${equation.title} preset ${preset.label} references ${name}`).toBeDefined()
          expect(value).toBeGreaterThanOrEqual(variable!.min)
          expect(value).toBeLessThanOrEqual(variable!.max)
        }
      }
    }
  })

  it("uses r consistently in the chaos formula", () => {
    const chaos = equations.find((equation) => equation.id === 16)
    expect(chaos?.formula).toContain("r")
    expect(chaos?.formula).not.toContain("k x_t")
  })

  it("keeps the Black-Scholes metadata year historically correct", () => {
    const blackScholes = equations.find((equation) => equation.id === 17)
    expect(blackScholes?.year).toBe("1973")
  })
})
