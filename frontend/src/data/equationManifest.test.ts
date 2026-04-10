import { describe, expect, it } from "vitest"
import {
  coreEquationManifest,
  resolveEquationManifest,
  searchEquationManifest,
} from "./equationManifest"

describe("equation manifest helpers", () => {
  it("provides a stable canonical fallback manifest", () => {
    expect(coreEquationManifest).toHaveLength(17)
    expect(coreEquationManifest[0]).toMatchObject({
      id: 1,
      slug: "pythagorass-theorem",
      title: "Pythagoras's Theorem",
    })
  })

  it("falls back to the canonical manifest when API data is unavailable", () => {
    expect(resolveEquationManifest(undefined)).toEqual(coreEquationManifest)
    expect(resolveEquationManifest([])).toEqual(coreEquationManifest)
  })

  it("searches manifest entries by title, author, and category", () => {
    expect(searchEquationManifest(coreEquationManifest, "einstein")[0]?.id).toBe(13)
    expect(searchEquationManifest(coreEquationManifest, "finance")[0]?.id).toBe(17)
    expect(searchEquationManifest(coreEquationManifest, "")).toEqual(coreEquationManifest)
  })
})
