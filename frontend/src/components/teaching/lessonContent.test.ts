import { describe, expect, it } from "vitest"
import { getLessonCopy } from "./lessonContent"

describe("lessonContent", () => {
  it("returns english copy by default", () => {
    const copy = getLessonCopy("pythagoras")
    expect(copy.touch.instruction.length).toBeGreaterThan(0)
    expect(copy.classic.insight.length).toBeGreaterThan(0)
  })

  it("falls back to english when a translated lesson does not exist yet", () => {
    const english = getLessonCopy("gravity", "en")
    const germanFallback = getLessonCopy("gravity", "de")
    expect(germanFallback).toEqual(english)
  })
})
