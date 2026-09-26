import { describe, expect, it } from "vitest"
import {
  coreEquationManifest,
  fallbackEquationManifest,
  getRandomEquationId,
  resolveEquationManifest,
  searchEquationManifest,
} from "./equationManifest"
import { activeSubjects } from "./subjects"

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
    expect(resolveEquationManifest(undefined)).toBe(fallbackEquationManifest)
    expect(resolveEquationManifest([])).toBe(fallbackEquationManifest)
    expect(resolveEquationManifest(null)).toBe(fallbackEquationManifest)
  })

  it("resolves every equation advertised by the subject library without the API", () => {
    const fallback = resolveEquationManifest(undefined)
    const ids = new Set(fallback.map((equation) => equation.id))
    const libraryIds = new Set(activeSubjects.flatMap((subject) => subject.formulas.map((formula) => formula.id)))
    expect(ids).toEqual(libraryIds)
    expect(ids.size).toBe(fallback.length)
    expect(fallback.find((equation) => equation.id === 34)).toMatchObject({ title: "Newton's Second Law", formula: "F=ma" })
    expect(fallback.find((equation) => equation.id === 51)?.title).toBe("Compound Interest")
  })

  it("keeps API metadata and translations authoritative when available", () => {
    const apiManifest = [{ ...coreEquationManifest[0], title: "Localized title" }]
    expect(resolveEquationManifest(apiManifest)).toBe(apiManifest)
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
