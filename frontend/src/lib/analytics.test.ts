import { afterEach, describe, expect, it, vi } from "vitest"
import { track, onTrack, resetAnalyticsForTests } from "./analytics"

afterEach(() => resetAnalyticsForTests())

describe("analytics", () => {
  it("dispatches events with their props to subscribed sinks", () => {
    const seen: Array<{ event: string; props: unknown }> = []
    onTrack((event, props) => seen.push({ event, props }))
    track("concept_check_answered", { equationId: 37, correct: true })
    expect(seen).toEqual([{ event: "concept_check_answered", props: { equationId: 37, correct: true } }])
  })

  it("stops delivering after unsubscribe", () => {
    const sink = vi.fn()
    const off = onTrack(sink)
    track("a")
    off()
    track("b")
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it("never throws even if a sink throws", () => {
    onTrack(() => {
      throw new Error("boom")
    })
    expect(() => track("x")).not.toThrow()
  })

  it("defaults props to an empty object", () => {
    const sink = vi.fn()
    onTrack(sink)
    track("no_props")
    expect(sink).toHaveBeenCalledWith("no_props", {})
  })
})
