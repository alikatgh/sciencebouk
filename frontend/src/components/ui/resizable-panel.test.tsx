import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
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
})
