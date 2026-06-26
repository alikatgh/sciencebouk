import { describe, expect, it } from "vitest"
import { getWhatItMeans, whatItMeans } from "./whatItMeans"

describe("whatItMeans", () => {
  const entries = Object.entries(whatItMeans)

  it("has at least the seed exemplars", () => {
    expect(entries.length).toBeGreaterThanOrEqual(2)
  })

  it("every entry is well-formed", () => {
    for (const [id, entry] of entries) {
      expect(entry.plainEnglish.trim().length, `#${id} plainEnglish`).toBeGreaterThan(0)
      expect(entry.result.trim().length, `#${id} result`).toBeGreaterThan(0)
      expect(entry.interpretation.trim().length, `#${id} interpretation`).toBeGreaterThan(0)
      expect(entry.variables.length, `#${id} variables`).toBeGreaterThan(0)
      for (const v of entry.variables) {
        expect(v.symbol.trim().length, `#${id} symbol`).toBeGreaterThan(0)
        expect(v.name.trim().length, `#${id} name`).toBeGreaterThan(0)
        expect(v.meaning.trim().length, `#${id} meaning`).toBeGreaterThan(0)
      }
    }
  })

  it("keys are positive integers", () => {
    for (const [id] of entries) {
      expect(Number.isInteger(Number(id)) && Number(id) > 0, `key ${id}`).toBe(true)
    }
  })

  it("getWhatItMeans returns an entry for a seeded id and null otherwise", () => {
    expect(getWhatItMeans(21)).not.toBeNull()
    expect(getWhatItMeans(99999)).toBeNull()
  })
})
