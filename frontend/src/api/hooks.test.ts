import { afterEach, describe, expect, it, vi } from "vitest"
import { api } from "./client"
import { loadEquationWithFallback } from "./hooks"
import { fallbackEquationManifest } from "../data/equationManifest"
import subjectPayloads from "../data/content/subject-equations-fallback.json"

afterEach(() => vi.restoreAllMocks())

describe("equation teaching content fallback", () => {
  it("opens the Newton starter with its actual variables and lessons when the API fails", async () => {
    vi.spyOn(api.equations, "get").mockRejectedValue(new TypeError("Failed to fetch"))
    const equation = await loadEquationWithFallback(34, "fr")

    expect(equation).toMatchObject({ id: 34, title: "Newton's Second Law", formula: "F=ma" })
    expect(equation.variables_data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "m" }),
      expect.objectContaining({ name: "a" }),
    ]))
    expect(equation.lessons_data.length).toBeGreaterThan(0)
    expect(equation.presets_data.length).toBeGreaterThan(0)
  })

  it("keeps a successful localized API payload instead of substituting bundled English", async () => {
    const localized = { ...subjectPayloads[0], title: "Localized title" }
    const request = vi.spyOn(api.equations, "get").mockResolvedValue(localized)
    expect(await loadEquationWithFallback(localized.id, "fr")).toBe(localized)
    expect(request).toHaveBeenCalledWith(localized.id, "fr")
  })

  it("does not invent lessons for an unknown equation", async () => {
    const failure = new Error("Equation unavailable")
    vi.spyOn(api.equations, "get").mockRejectedValue(failure)
    await expect(loadEquationWithFallback(9999)).rejects.toBe(failure)
  })

  it("pairs every added offline manifest entry with curated interactive teaching data", () => {
    expect(subjectPayloads.map((equation) => equation.id)).toEqual(
      fallbackEquationManifest.filter((equation) => equation.id > 17).map((equation) => equation.id),
    )
    for (const equation of subjectPayloads) {
      expect(equation.variables_data.length).toBeGreaterThan(0)
      expect(equation.lessons_data.length).toBeGreaterThan(0)
      expect(equation.hook).not.toBe("")
    }
  })
})
