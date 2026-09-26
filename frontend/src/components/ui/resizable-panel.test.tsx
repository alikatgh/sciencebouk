import { fireEvent, render, screen } from "@testing-library/react"
import { StrictMode, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readStoredPanelWidth, ResizablePanel } from "./resizable-panel"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("readStoredPanelWidth", () => {
  it.each([null, "", "   ", "invalid", "NaN", "Infinity", "0", "-100"])(
    "uses the configured default for missing or invalid storage: %s",
    (stored) => {
      vi.stubGlobal("localStorage", { getItem: vi.fn(() => stored) })

      expect(readStoredPanelWidth("panel-width", 300, 240, 520)).toBe(300)
    },
  )

  it.each([
    ["380", 380],
    [" 360 ", 360],
    ["200", 240],
    ["700", 520],
  ])("restores and clamps the saved width %s", (stored, expected) => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => stored) })

    expect(readStoredPanelWidth("panel-width", 300, 240, 520)).toBe(expected)
  })

  it("clamps the configured default even without a storage key", () => {
    expect(readStoredPanelWidth(undefined, 100, 240, 520)).toBe(240)
    expect(readStoredPanelWidth(undefined, 700, 240, 520)).toBe(520)
  })
})

describe("ResizablePanel", () => {
  it.each([
    [null, 300],
    ["", 300],
    ["invalid", 300],
    ["380", 380],
    ["700", 520],
  ])("reports and persists the actual initial width from %s", (stored, expected) => {
    const handleWidthChange = vi.fn()
    const setItem = vi.fn()
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => stored), setItem })

    render(
      <ResizablePanel
        edge="left"
        defaultWidth={300}
        minWidth={240}
        maxWidth={520}
        storageKey="panel-width"
        onWidthChange={handleWidthChange}
      >
        <div>Content</div>
      </ResizablePanel>,
    )

    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", String(expected))
    expect(handleWidthChange).toHaveBeenCalledExactlyOnceWith(expected)
    expect(setItem).toHaveBeenCalledWith("panel-width", String(expected))
  })

  it("does not report the same width again when an inline callback rerenders its parent", () => {
    const handleWidthChange = vi.fn()
    function Parent() {
      const [reportedWidth, setReportedWidth] = useState(0)
      return (
        <ResizablePanel
          edge="right"
          defaultWidth={300}
          onWidthChange={(width) => {
            handleWidthChange(width)
            setReportedWidth(width)
          }}
        >
          <output>{reportedWidth}</output>
        </ResizablePanel>
      )
    }

    render(<StrictMode><Parent /></StrictMode>)

    expect(handleWidthChange).toHaveBeenCalledExactlyOnceWith(300)
    expect(screen.getByRole("status")).toHaveTextContent("300")

    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" })

    expect(handleWidthChange).toHaveBeenCalledTimes(2)
    expect(handleWidthChange).toHaveBeenLastCalledWith(320)
    expect(screen.getByRole("status")).toHaveTextContent("320")
  })

  it("keeps resizing when the pointer moves outside the handle", () => {
    const handleWidthChange = vi.fn()

    const { container } = render(
      <ResizablePanel edge="right" defaultWidth={220} onWidthChange={handleWidthChange}>
        <div>Content</div>
      </ResizablePanel>,
    )

    const handle = container.querySelector("[data-resize-handle]") as HTMLElement | null
    expect(handle).not.toBeNull()

    Object.defineProperty(handle!, "setPointerCapture", {
      value: vi.fn(),
      configurable: true,
    })

    fireEvent.pointerDown(handle!, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 140 })

    expect(handleWidthChange).toHaveBeenLastCalledWith(260)
  })

  it("falls back to the default width when storage access throws", () => {
    const handleWidthChange = vi.fn()
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => {
        throw new Error("Storage blocked")
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage blocked")
      }),
    })

    render(
      <ResizablePanel edge="right" defaultWidth={220} storageKey="panel-width" onWidthChange={handleWidthChange}>
        <div>Storage-safe panel</div>
      </ResizablePanel>,
    )

    expect(screen.getByText("Storage-safe panel")).toBeInTheDocument()
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "220")
    expect(handleWidthChange).toHaveBeenCalledExactlyOnceWith(220)
  })

  it("applies wrapper and content classes to the correct elements", () => {
    const { container } = render(
      <ResizablePanel
        edge="right"
        defaultWidth={220}
        wrapperClassName="hidden lg:flex"
        className="flex-col border-r"
      >
        <div>Panel content</div>
      </ResizablePanel>,
    )

    const outer = container.firstElementChild
    const inner = outer?.children[0]

    expect(outer).toHaveClass("hidden", "lg:flex")
    expect(inner).toHaveClass("flex-col", "border-r")
  })
})
