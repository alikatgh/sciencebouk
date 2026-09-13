import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ErrorBoundary } from "./ErrorBoundary"

const STALE_CHUNK_MESSAGE =
  "Failed to fetch dynamically imported module: https://sciencebo.uk/assets/ChaosScene-D7CujcjI.js"

function ThrowingComponent(): never {
  throw new Error("Test error")
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText("Hello")).toBeInTheDocument()
  })

  it("renders error UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("Test error")).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("auto-resets when resetKey changes (navigating to a healthy scene)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    let shouldThrow = true
    function MaybeThrow() {
      if (shouldThrow) throw new Error("scene crash")
      return <div>New scene</div>
    }

    const { rerender } = render(
      <ErrorBoundary resetKey={1}>
        <MaybeThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()

    // Navigate to another equation: the new scene is healthy and resetKey changes.
    shouldThrow = false
    rerender(
      <ErrorBoundary resetKey={2}>
        <MaybeThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText("New scene")).toBeInTheDocument()
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("can recover with Try Again button", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    let shouldThrow = true
    function MaybeThrow() {
      if (shouldThrow) throw new Error("Test")
      return <div>Recovered</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()

    shouldThrow = false
    await userEvent.click(screen.getByText("Try Again"))

    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText("Recovered")).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("reloads once on a stale hashed-chunk import, then shows Reload", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const reload = vi.fn()
    vi.stubGlobal("location", { ...window.location, reload })
    sessionStorage.clear()

    function ThrowStaleChunk(): never {
      throw new Error(STALE_CHUNK_MESSAGE)
    }

    render(
      <ErrorBoundary>
        <ThrowStaleChunk />
      </ErrorBoundary>,
    )
    expect(reload).toHaveBeenCalledOnce()
    expect(screen.getByText("Reload")).toBeInTheDocument()

    reload.mockClear()
    render(
      <ErrorBoundary>
        <ThrowStaleChunk />
      </ErrorBoundary>,
    )
    expect(reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })
})
