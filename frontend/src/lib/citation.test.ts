import { describe, expect, it } from "vitest"
import { buildCitation } from "./citation"

describe("buildCitation", () => {
  it("formats author, year and title", () => {
    expect(buildCitation({ title: "Ohm's Law", author: "Georg Ohm", year: "1827" })).toBe(
      "Georg Ohm (1827). Ohm's Law. ScienceBouk — Equations That Changed the World.",
    )
  })

  it("degrades gracefully when author/year are missing", () => {
    expect(buildCitation({ title: "Mystery", author: null, year: null })).toBe(
      "Unknown. Mystery. ScienceBouk — Equations That Changed the World.",
    )
    expect(buildCitation({ title: "Half", author: "Ada", year: "" })).toBe(
      "Ada. Half. ScienceBouk — Equations That Changed the World.",
    )
  })
})
