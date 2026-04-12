import { describe, expect, it } from "vitest"
import { getPagesContent, interpolateContent, pagesContent } from "./pageContent"

describe("pageContent", () => {
  it("falls back to english when a locale file is missing", () => {
    expect(getPagesContent("de")).toEqual(pagesContent)
    expect(getPagesContent("mn")).toEqual(pagesContent)
  })

  it("interpolates placeholders without dropping unknown values", () => {
    expect(interpolateContent("Hello {name} from {city}", { name: "Ada" })).toBe("Hello Ada from {city}")
  })
})
