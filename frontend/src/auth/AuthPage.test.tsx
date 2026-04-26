import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import AuthPage from "./AuthPage"

const authState = {
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  loginWithGoogle: vi.fn(),
  isAuthenticated: false,
  loading: false,
}

vi.mock("./AuthContext", () => ({
  useAuth: () => authState,
}))

describe("AuthPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-google-client-id")
    authState.login.mockClear()
    authState.register.mockClear()
    authState.isAuthenticated = false
    authState.loading = false
    authState.loginWithGoogle.mockReset()
    window.__formulasGoogleInitClientId = undefined
    window.google = undefined
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("uses distinct labels for password and confirm-password visibility toggles", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<AuthPage mode="signup" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show confirm password" })).toBeInTheDocument()
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
  })

  it("blocks signup when passwords do not match", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<AuthPage mode="signup" />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } })
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different123" } })
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form")!)

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument()
    expect(authState.register).not.toHaveBeenCalled()
  })

  it("passes the invite code when creating an account", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/" element={<div>Home target</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } })
    fireEvent.change(screen.getByLabelText("Invite code"), { target: { value: "SCB-ABCD-EFGH-IJKL" } })
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } })
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form")!)

    await waitFor(() => {
      expect(authState.register).toHaveBeenCalledWith("user@example.com", "password123", "SCB-ABCD-EFGH-IJKL")
    })
  })

  it("redirects authenticated users to the sanitized next path", async () => {
    authState.isAuthenticated = true

    render(
      <MemoryRouter initialEntries={["/login?next=/profile"]}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/profile" element={<div>Profile target</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText("Profile target")).toBeInTheDocument()
    })
  })

  it("initializes Google Identity Services only once for the same client id", async () => {
    const initialize = vi.fn()
    const renderButton = vi.fn()
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
          prompt: vi.fn(),
        },
      },
    }

    const { rerender } = render(
      <MemoryRouter>
        <AuthPage mode="login" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1)
      expect(renderButton).toHaveBeenCalledTimes(1)
    })

    rerender(
      <MemoryRouter>
        <AuthPage mode="signup" />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1)
      expect(renderButton).toHaveBeenCalledTimes(2)
    })
  })
})
