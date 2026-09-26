import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { SettingsProvider } from "../settings/SettingsContext"
import ProfilePage from "./ProfilePage"

const authState = {
  isAuthenticated: false,
  isPro: false,
  user: null as { email: string; profile: { display_name: string; avatar_url: string } } | null,
  logout: vi.fn(),
  refreshUser: vi.fn(),
}

vi.mock("../auth/AuthContext", () => ({ useAuth: () => authState }))
vi.mock("./TopNav", () => ({ TopNav: () => null }))
vi.mock("./Footer", () => ({ Footer: () => null }))
vi.mock("../progress/useProgress", () => ({
  useAllProgress: () => ({ completedCount: 0, totalTimeMinutes: 0, total: 1, progressByEquation: new Map() }),
}))
vi.mock("../data/equationManifest", () => ({
  useEquationManifest: () => ({ data: [] }),
  resolveEquationManifest: () => [{ id: 1, title: "Pythagoras", category: "Geometry" }],
}))

function Profile() {
  return <SettingsProvider><MemoryRouter><ProfilePage /></MemoryRouter></SettingsProvider>
}

describe("ProfilePage", () => {
  it("keeps the profile usable when authentication resolves and when it expires", () => {
    const { rerender } = render(<Profile />)
    expect(screen.queryByRole("button", { name: "Edit display name" })).not.toBeInTheDocument()

    authState.isAuthenticated = true
    authState.user = { email: "learner@example.com", profile: { display_name: "Ada", avatar_url: "" } }
    rerender(<Profile />)
    expect(screen.getByRole("heading", { name: "Ada" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit display name" })).toBeInTheDocument()

    authState.isAuthenticated = false
    authState.user = null
    rerender(<Profile />)
    expect(screen.queryByRole("button", { name: "Edit display name" })).not.toBeInTheDocument()
  })
})
