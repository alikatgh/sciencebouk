import { afterEach, describe, expect, it, vi } from "vitest"
import { pushToast, dismissToast, getToasts, subscribeToasts, _resetToasts } from "./toast"

afterEach(() => {
  _resetToasts()
  vi.useRealTimers()
})

describe("toast store", () => {
  it("pushes, notifies subscribers, and dismisses", () => {
    const listener = vi.fn()
    const unsub = subscribeToasts(listener)
    const id = pushToast("Copied", "success", 0)
    expect(getToasts().map((t) => t.message)).toEqual(["Copied"])
    expect(listener).toHaveBeenCalledTimes(1)
    dismissToast(id)
    expect(getToasts()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
    unsub()
  })

  it("caps the visible stack at 4 (drops oldest)", () => {
    for (let i = 1; i <= 6; i += 1) pushToast(`t${i}`, "info", 0)
    expect(getToasts().map((t) => t.message)).toEqual(["t3", "t4", "t5", "t6"])
  })

  it("auto-expires after the duration", () => {
    vi.useFakeTimers()
    pushToast("bye", "success", 1000)
    expect(getToasts()).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(getToasts()).toHaveLength(0)
  })

  it("keeps a stable snapshot reference between mutations", () => {
    pushToast("a", "info", 0)
    const snapshot = getToasts()
    expect(getToasts()).toBe(snapshot) // no churn → same ref (safe for useSyncExternalStore)
  })
})
