import { describe, expect, it, vi } from "vitest"
import { isStaleChunkError, reloadOnceForStaleChunk, staleChunkUrl } from "./staleChunk"

describe("staleChunk", () => {
  it("detects Vite dynamic-import fetch failures", () => {
    const error = new Error(
      "Failed to fetch dynamically imported module: https://sciencebo.uk/assets/ChaosScene-D7CujcjI.js",
    )
    expect(isStaleChunkError(error)).toBe(true)
    expect(staleChunkUrl(error)).toBe("https://sciencebo.uk/assets/ChaosScene-D7CujcjI.js")
  })

  it("ignores ordinary scene errors", () => {
    expect(isStaleChunkError(new Error("d3 is not defined"))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })

  it("reloads once per module URL and not again", () => {
    const reload = vi.fn()
    const storage = new Map<string, string>()
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    }
    const error = new Error(
      "Failed to fetch dynamically imported module: https://sciencebo.uk/assets/ChaosScene-D7CujcjI.js",
    )
    expect(reloadOnceForStaleChunk(error, reload, store)).toBe(true)
    expect(reload).toHaveBeenCalledOnce()
    expect(reloadOnceForStaleChunk(error, reload, store)).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })
})
