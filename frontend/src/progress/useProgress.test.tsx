import type { ReactElement } from "react"
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearStoredProgress, useAllProgress, useProgress } from "./useProgress"

const { authState, progressApi } = vi.hoisted(() => ({
  authState: {
    user: null as { id: number } | null,
    isAuthenticated: false,
    isPro: false,
  },
  progressApi: {
    getAll: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}))

vi.mock("../api/client", () => ({
  api: {
    progress: progressApi,
  },
}))

const localAuthState = authState as {
  user: { id: number } | null
  isAuthenticated: boolean
  isPro: boolean
}
const localProgressApi = progressApi as {
  getAll: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

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

describe("useProgress hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock())
    localAuthState.user = null
    localAuthState.isAuthenticated = false
    localAuthState.isPro = false
    localProgressApi.getAll.mockReset()
    localProgressApi.update.mockReset()
    clearStoredProgress()
  })

  afterEach(() => {
    clearStoredProgress()
    vi.unstubAllGlobals()
  })

  it("persists local progress updates", () => {
    const { result } = renderHook(() => useProgress(1))

    act(() => {
      result.current.updateProgress({ completed: true, lessonStep: "observe" })
    })

    expect(result.current.progress.completed).toBe(true)
    expect(result.current.progress.lessonStep).toBe("observe")
    expect(JSON.parse(localStorage.getItem("eq-progress-1") ?? "{}")).toMatchObject({
      completed: true,
      lessonStep: "observe",
    })
  })

  it("keeps server sync errors visible across rerenders", async () => {
    localAuthState.user = { id: 7 }
    localAuthState.isAuthenticated = true
    localAuthState.isPro = true
    localProgressApi.getAll.mockRejectedValue(new Error("sync down"))

    const { result, rerender } = renderHook(() => useAllProgress())

    await waitFor(() => {
      expect(result.current.serverSyncError).toBe(true)
    })

    rerender()

    expect(result.current.serverSyncError).toBe(true)
  })

  it("does not warn about cross-component updates when progress changes", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    function Harness(): ReactElement {
      useAllProgress()
      const { updateProgress } = useProgress(1)

      return (
        <button type="button" onClick={() => updateProgress({ completed: true, lessonStep: "observe" })}>
          Save progress
        </button>
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Save progress" }))

    expect(
      consoleError.mock.calls.some((args) =>
        args.some((value) => typeof value === "string" && value.includes("Cannot update a component")),
      ),
    ).toBe(false)

    consoleError.mockRestore()
  })
})
