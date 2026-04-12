import { describe, expect, it } from "vitest"
import { getSceneCopy, interpolateSceneCopy, sceneCopyContent } from "./sceneCopy"

describe("sceneCopy", () => {
  it("falls back to english scene copy when a locale file is missing", () => {
    expect(getSceneCopy("pythagoras", "de")).toEqual(sceneCopyContent.pythagoras)
    expect(getSceneCopy("blackScholes", "mn")).toEqual(sceneCopyContent.blackScholes)
  })

  it("interpolates scene templates without touching unknown placeholders", () => {
    expect(
      interpolateSceneCopy("Speed = {{speed}} {{unit}}", { speed: 42 }),
    ).toBe("Speed = 42 {{unit}}")
  })
})
