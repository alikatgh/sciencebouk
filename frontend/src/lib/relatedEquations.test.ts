import { describe, expect, it } from "vitest"
import { getRelatedEquations } from "./relatedEquations"
import type { EquationSummary } from "../data/equationManifest"

function eq(id: number, category: string): EquationSummary {
  return { id, title: `Eq ${id}`, formula: "", author: "", year: "", category, slug: `eq-${id}`, description: "" } as EquationSummary
}

const manifest = [eq(1, "physics"), eq(2, "physics"), eq(3, "algebra"), eq(4, "physics"), eq(5, "algebra")]

describe("getRelatedEquations", () => {
  it("prefers same-category equations, nearest by id first", () => {
    const related = getRelatedEquations(1, manifest, 4)
    // same category (physics): 2 and 4 (2 is nearer), then fill from rest by distance
    expect(related.slice(0, 2).map((e) => e.id)).toEqual([2, 4])
  })

  it("never includes the current equation and respects the limit", () => {
    const related = getRelatedEquations(3, manifest, 2)
    expect(related).toHaveLength(2)
    expect(related.some((e) => e.id === 3)).toBe(false)
  })

  it("falls back gracefully when the id is unknown", () => {
    const related = getRelatedEquations(999, manifest, 3)
    expect(related).toHaveLength(3)
    expect(related.every((e) => e.id !== 999)).toBe(true)
  })
})
