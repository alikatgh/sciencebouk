import { describe, expect, it } from "vitest"
import { DEFAULT_LOCALE, normalizeLocale, resolveLocaleCandidates } from "./locales"

describe("locales", () => {
  it("normalizes empty locale input to english", () => {
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE)
  })

  it("normalizes case and separators", () => {
    expect(normalizeLocale("DE_de")).toBe("de-de")
  })

  it("builds locale fallback candidates ending in english", () => {
    expect(resolveLocaleCandidates("de-DE")).toEqual(["de-de", "de", "en"])
  })
})
