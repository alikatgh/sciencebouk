import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { ProGate } from "./ProGate"

const navigateMock = vi.fn()
const authState = {
  isAuthenticated: false,
  isPro: false,
}

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock("./AuthContext", () => ({
  useAuth: () => authState,
}))

vi.mock("../config/billing", () => ({
  BILLING_ENABLED: true,
  BILLING_DISABLED_COPY: {
    badge: "Free beta",
    detail: "No subscriptions yet.",
  },
  useBillingDisabledCopy: () => ({
    badge: "Free beta",
    detail: "No subscriptions yet.",
  }),
}))

describe("ProGate", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    authState.isAuthenticated = false
    authState.isPro = false
  })

  it("renders children for pro users", () => {
    authState.isPro = true

    render(
      <MemoryRouter>
        <ProGate feature="Analytics">
          <div>Unlocked</div>
        </ProGate>
      </MemoryRouter>,
    )

    expect(screen.getByText("Unlocked")).toBeInTheDocument()
  })

  it("shows locked state for non-pro users", () => {
    render(
      <MemoryRouter>
        <ProGate feature="Analytics">
          <div>Unlocked</div>
        </ProGate>
      </MemoryRouter>,
    )

    expect(screen.getByText("Analytics")).toBeInTheDocument()
    expect(screen.queryByText("Unlocked")).not.toBeInTheDocument()
  })

  it("routes signed-in free users to /pro", () => {
    authState.isAuthenticated = true

    render(
      <MemoryRouter>
        <ProGate feature="Analytics">
          <div>Unlocked</div>
        </ProGate>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText("Analytics"))
    expect(navigateMock).toHaveBeenCalledWith("/pro")
  })

  it("routes signed-out users to /signup?next=/pro", () => {
    render(
      <MemoryRouter>
        <ProGate feature="Analytics">
          <div>Unlocked</div>
        </ProGate>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText("Analytics"))
    expect(navigateMock).toHaveBeenCalledWith("/signup?next=/pro")
  })

  it("supports keyboard activation", () => {
    authState.isAuthenticated = true

    render(
      <MemoryRouter>
        <ProGate feature="Analytics">
          <div>Unlocked</div>
        </ProGate>
      </MemoryRouter>,
    )

    fireEvent.keyDown(screen.getByRole("button", { name: "Analytics: Upgrade to Pro" }), { key: "Enter" })
    expect(navigateMock).toHaveBeenCalledWith("/pro")
  })
})
