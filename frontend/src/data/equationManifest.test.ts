import { describe, expect, it } from "vitest"
import {
  coreEquationManifest,
  getRandomEquationId,
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

  it("matches formula symbols", () => {
    // E=mc^2 — searching the symbols finds Relativity even though "mc" is in no title.
    expect(searchEquationManifest(coreEquationManifest, "mc").map((e) => e.id)).toContain(13)
  })

  it("ranks a title-prefix match first and requires every token (AND)", () => {
    expect(searchEquationManifest(coreEquationManifest, "wave")[0]?.id).toBe(5)
    // both tokens present, order-independent → Second Law of Thermodynamics
    expect(searchEquationManifest(coreEquationManifest, "law second")[0]?.id).toBe(12)
    // a token that matches nothing eliminates the result
    expect(searchEquationManifest(coreEquationManifest, "wave zzzzz")).toHaveLength(0)
  })

  it("folds diacritics so plain ASCII finds accented titles", () => {
    const accented = { ...coreEquationManifest[0], id: 99, title: "Schrödinger Café" }
    expect(searchEquationManifest([accented], "schrodinger cafe")).toHaveLength(1)
  })

  it("returns a different random equation id, never the current one", () => {
    for (let i = 0; i < 50; i += 1) {
      const id = getRandomEquationId(coreEquationManifest, 5)
      expect(id).not.toBe(5)
      expect(coreEquationManifest.some((e) => e.id === id)).toBe(true)
    }
    expect(getRandomEquationId([], 1)).toBeNull()
    expect(getRandomEquationId([coreEquationManifest[0]], coreEquationManifest[0].id)).toBe(coreEquationManifest[0].id)
  })
})
