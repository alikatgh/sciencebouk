import { afterEach, describe, expect, it, vi } from "vitest"
import { copyText } from "./clipboard"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("copyText", () => {
  it("uses the async Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    await expect(copyText("E=mc^2")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("E=mc^2")
  })

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })
    const execCommand = vi.fn().mockReturnValue(true)
    // jsdom lacks execCommand; attach a spy.
    ;(document as unknown as { execCommand: typeof execCommand }).execCommand = execCommand
    await expect(copyText("hello")).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
  })

  it("returns false when no clipboard mechanism succeeds", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })
    ;(document as unknown as { execCommand: () => boolean }).execCommand = () => {
      throw new Error("unsupported")
    }
    await expect(copyText("x")).resolves.toBe(false)
  })
})
