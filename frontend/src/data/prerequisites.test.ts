import { describe, expect, it } from "vitest"
import { prerequisites, getPrerequisites } from "./prerequisites"

describe("prerequisites", () => {
  it("returns curated prerequisites for a known equation", () => {
    const pre = getPrerequisites(35) // Kinetic Energy builds on Newton's Second Law
    expect(pre).not.toBeNull()
    expect(pre?.[0]).toEqual({ id: 34, title: "Newton's Second Law" })
  })

  it("returns null when none are curated", () => {
    expect(getPrerequisites(999)).toBeNull()
  })

  it("every entry is well-formed and never self-referential", () => {
    for (const [idStr, list] of Object.entries(prerequisites)) {
      const id = Number(idStr)
      expect(id).toBeGreaterThanOrEqual(18) // subject equations point back to foundations
      expect(list.length).toBeGreaterThan(0)
      for (const pre of list) {
        expect(pre.id).toBeGreaterThanOrEqual(1)
        expect(pre.id).toBeLessThanOrEqual(81)
        expect(pre.id).not.toBe(id) // no equation is its own prerequisite
        expect(pre.title.trim().length).toBeGreaterThan(0)
      }
      // no duplicate prerequisite ids within one equation
      expect(new Set(list.map((p) => p.id)).size).toBe(list.length)
    }
  })
})
