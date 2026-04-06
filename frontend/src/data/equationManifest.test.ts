import { describe, expect, it } from "vitest"
import {
  equationIndexById,
  equationManifest,
  equationSummaryById,
  getEquationSummary,
  hasEquation,
  searchEquations,
} from "./equationManifest"

describe("equationManifest helpers", () => {
  it("provides O(1)-style lookup helpers consistent with the manifest", () => {
    for (const [index, equation] of equationManifest.entries()) {
      expect(getEquationSummary(equation.id)).toEqual(equation)
      expect(equationSummaryById.get(equation.id)).toEqual(equation)
      expect(equationIndexById.get(equation.id)).toBe(index)
      expect(hasEquation(equation.id)).toBe(true)
    }
  })

  it("returns case-insensitive search matches by title, author, and category", () => {
    expect(searchEquations("pythagoras").map((equation) => equation.id)).toEqual([1])
    expect(searchEquations("gauss").map((equation) => equation.id)).toEqual([8])
    expect(searchEquations("physics").map((equation) => equation.id)).toEqual([4, 5, 13])
  })
})
