import { StrictMode } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./AuthContext"
import { resetTokenStorageForTests } from "./tokenStorage"

function createStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function AuthProbe() {
  const { user, login } = useAuth()

  return (
    <div>
      <button type="button" onClick={() => void login("login@example.com", "correctpass1")}>
        Login
      </button>
      <span data-testid="auth-email">{user?.email ?? "signed-out"}</span>
    </div>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock())
    resetTokenStorageForTests()
  })

  afterEach(() => {
    resetTokenStorageForTests()
    vi.unstubAllGlobals()
  })

  it("keeps auth state updates working inside StrictMode", async () => {
    const user = {
      id: 1,
      email: "login@example.com",
      username: "login@example.com",
      profile: {
        tier: "free",
        display_name: "",
        avatar_url: "",
        daily_goal_minutes: 10,
        preferred_difficulty: "beginner",
        onboarding_completed: false,
      },
    }

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/auth/login/")) {
        return Promise.resolve(
          jsonResponse(200, {
            access: "access-token",
            refresh: "refresh-token",
            user,
          }),
        )
      }
      if (url.endsWith("/auth/me/")) {
        return Promise.resolve(jsonResponse(200, user))
      }
      if (url.endsWith("/auth/refresh/")) {
        return Promise.resolve(
          jsonResponse(200, {
            access: "refreshed-access",
            refresh: "refreshed-refresh",
          }),
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <StrictMode>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    )

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("auth-email").textContent).toBe("login@example.com")
    })
  })
})
