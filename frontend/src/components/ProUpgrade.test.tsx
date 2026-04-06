import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { ProSuccessPage } from "./ProUpgrade"

const authState = {
  isAuthenticated: true,
  isPro: false,
  loading: false,
  refreshUser: vi.fn().mockResolvedValue(undefined),
}

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}))

vi.mock("./TopNav", () => ({
  TopNav: () => <div data-testid="top-nav" />,
}))

vi.mock("./Footer", () => ({
  Footer: () => <div data-testid="footer" />,
}))

describe("ProPricingPage", () => {
  beforeEach(() => {
    authState.isAuthenticated = true
    authState.isPro = false
    authState.loading = false
    authState.refreshUser.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows a bounded fallback instead of spinning forever on /pro/success", async () => {
    render(
      <MemoryRouter initialEntries={["/pro/success"]}>
        <Routes>
          <Route path="/pro/success" element={<ProSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // Initially the loading/verifying state is shown
    expect(screen.getByText(/verifying payment/i)).toBeInTheDocument()
    expect(screen.queryByText(/still checking/i)).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(12000)
      // Flush the promise queue so refreshUser resolves before assertions
      await Promise.resolve()
      await Promise.resolve()
    })

    // After the 12-second timeout the fallback must appear and the spinner must disappear
    expect(screen.queryByText(/verifying payment/i)).not.toBeInTheDocument()
    expect(screen.getByText(/still checking your subscription/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument()
  })
})
