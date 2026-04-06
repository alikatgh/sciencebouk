import { describe, expect, it } from "vitest"
import { shouldUseStackedTeachingLayout } from "./layoutMode"

describe("shouldUseStackedTeachingLayout", () => {
  it("stacks when the overall container is clearly narrow", () => {
    expect(shouldUseStackedTeachingLayout({
      containerWidth: 760,
      containerHeight: 780,
      teachingPanelOpen: true,
      teachingPanelWidth: 320,
    })).toBe(true)
  })

  it("stacks when the remaining scene area becomes too skinny", () => {
    expect(shouldUseStackedTeachingLayout({
      containerWidth: 980,
      containerHeight: 780,
      teachingPanelOpen: true,
      teachingPanelWidth: 400,
    })).toBe(true)
  })

  it("keeps desktop split when there is enough room for both regions", () => {
    expect(shouldUseStackedTeachingLayout({
      containerWidth: 1240,
      containerHeight: 720,
      teachingPanelOpen: true,
      teachingPanelWidth: 272,
    })).toBe(false)
  })

  it("does not force stacking just because the panel is closed", () => {
    expect(shouldUseStackedTeachingLayout({
      containerWidth: 860,
      containerHeight: 760,
      teachingPanelOpen: false,
      teachingPanelWidth: 272,
    })).toBe(false)
  })
})
