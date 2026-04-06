import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ResizablePanel } from "./resizable-panel"

describe("ResizablePanel", () => {
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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("falls back to the default width when storage access throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => {
        throw new Error("Storage blocked")
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage blocked")
      }),
    })

    render(
      <ResizablePanel edge="right" defaultWidth={220} storageKey="panel-width">
        <div>Storage-safe panel</div>
      </ResizablePanel>,
    )

    expect(screen.getByText("Storage-safe panel")).toBeInTheDocument()
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
