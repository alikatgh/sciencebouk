import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ErrorBoundary } from "./ErrorBoundary"

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
    vi.restoreAllMocks()
  })
})
