import type { ReactElement } from "react"
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearStoredProgress, getLocalProgress, getLocalProgressSyncItems, registerEquationIds, syncLocalProgressToServer, useAllProgress, useProgress } from "./useProgress"
import { fallbackEquationManifest } from "../data/equationManifest"
import type { ProgressItem } from "../api/client"

const { authState, progressApi } = vi.hoisted(() => ({
  authState: {
    user: null as { id: number } | null,
    isAuthenticated: false,
    isPro: false,
  },
  progressApi: {
    getAll: vi.fn(),
    update: vi.fn(),
    bulkSync: vi.fn(),
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
  bulkSync: ReturnType<typeof vi.fn>
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

function serverItem(overrides: Partial<ProgressItem> = {}): ProgressItem {
  return {
    equation_id: 1, completed: false, completed_at: null, lesson_step: "observe",
    time_spent_seconds: 0, variables_explored: [], notes: "", bookmarked: false,
    last_viewed: "2026-11-07T10:00:00.000Z", ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function signIn(userId = 7) {
  localAuthState.user = { id: userId }
  localAuthState.isAuthenticated = true
  localAuthState.isPro = true
}

describe("useProgress hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock())
    localAuthState.user = null
    localAuthState.isAuthenticated = false
    localAuthState.isPro = false
    localProgressApi.getAll.mockReset()
    localProgressApi.update.mockReset()
    localProgressApi.bulkSync.mockReset()
    clearStoredProgress()
  })

  afterEach(() => {
    act(() => {
      clearStoredProgress()
      registerEquationIds(fallbackEquationManifest.map((equation) => equation.id))
    })
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("counts the complete library initially and preserves progress when the API registers IDs", () => {
    localStorage.setItem("eq-progress-34", JSON.stringify({ completed: true, lessonStep: "grow" }))
    const { result } = renderHook(() => useAllProgress())

    expect(result.current.total).toBe(81)
    expect(result.current.completedCount).toBe(1)
    expect(result.current.progressByEquation.has(81)).toBe(true)

    act(() => registerEquationIds([1, 34]))
    expect(result.current.total).toBe(2)
    expect(result.current.completedCount).toBe(1)
    expect(result.current.progressByEquation.get(34)).toMatchObject({ completed: true, lessonStep: "grow" })
    expect(JSON.parse(localStorage.getItem("eq-progress-34") ?? "{}")).toMatchObject({ completed: true })
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

  it("keeps a newer local cursor while monotonically merging server history", async () => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: "try", lastViewed: "2026-11-07T12:00:00.000Z",
      timeSpentSeconds: 10, variablesExplored: ["a"] }))
    localProgressApi.getAll.mockResolvedValue([serverItem({ lesson_step: "a-long-step", completed: true,
      time_spent_seconds: 120, variables_explored: ["b"] })])
    const { result } = renderHook(() => useProgress(1))
    await waitFor(() => expect(result.current.progress.completed).toBe(true))
    expect(result.current.progress).toMatchObject({ lessonStep: "try", timeSpentSeconds: 120, variablesExplored: ["a", "b"] })
  })

  it.each([
    { localStep: "observe", localTime: "2026-11-07T09:00:00.000Z", serverStep: "", expected: "" },
    { localStep: "", localTime: "2026-11-07T12:00:00.000Z", serverStep: "observe", expected: "" },
    { localStep: "old", localTime: "2026-11-07T09:00:00.000Z", serverStep: "x", expected: "x" },
  ])("merges explicit cursor clears and newer server cursors ($localStep / $serverStep)", async ({ localStep, localTime, serverStep, expected }) => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: localStep, lastViewed: localTime, lessonStepUpdatedAt: localTime }))
    localProgressApi.getAll.mockResolvedValue([serverItem({ lesson_step: serverStep, completed: true })])
    const { result } = renderHook(() => useProgress(1))
    await waitFor(() => expect(result.current.progress.completed).toBe(true))
    expect(result.current.progress.lessonStep).toBe(expected)
    expect(JSON.parse(localStorage.getItem("eq-progress-1") ?? "{}").lessonStep).toBe(expected)
  })

  it("preserves an omitted cursor and monotonic fields in local updates", () => {
    const { result } = renderHook(() => useProgress(1))
    act(() => result.current.updateProgress({ completed: true, lessonStep: "long-step", timeSpentSeconds: 120, variablesExplored: ["a"] }))
    act(() => result.current.updateProgress({ completed: false, timeSpentSeconds: 10, variablesExplored: ["b"] }))
    expect(result.current.progress).toMatchObject({ completed: true, lessonStep: "long-step", timeSpentSeconds: 120, variablesExplored: ["a", "b"] })
    act(() => result.current.updateProgress({ lessonStep: "" }))
    expect(result.current.progress.lessonStep).toBe("")
  })

  it("retains an explicit cursor clear in bulk-sync items even without other progress", () => {
    const { result } = renderHook(() => useProgress(1))
    act(() => result.current.updateProgress({ lessonStep: "" }))
    expect(getLocalProgressSyncItems()).toEqual([expect.objectContaining({ equation_id: 1, lesson_step: "" })])
  })

  it("does not send a cursor with unrelated updates and carries an explicit clear through debounce", async () => {
    signIn()
    localProgressApi.getAll.mockResolvedValue([])
    localProgressApi.update.mockImplementation((_id, payload) => Promise.resolve(serverItem(payload)))
    const { result } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ timeSpentSeconds: 10 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(localProgressApi.update.mock.calls[0][1]).not.toHaveProperty("lesson_step")
    act(() => result.current.updateProgress({ lessonStep: "" }))
    act(() => result.current.updateProgress({ timeSpentSeconds: 20 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(localProgressApi.update.mock.calls[1][1]).toMatchObject({ lesson_step: "", time_spent_seconds: 20 })
  })

  it("keeps a local cursor edit when an older read resolves after the edit", async () => {
    signIn()
    const read = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValue(read.promise)
    const { result } = renderHook(() => useProgress(1))
    act(() => result.current.updateProgress({ lessonStep: "" }))
    await act(async () => read.resolve([serverItem({ lesson_step: "old-step", last_viewed: "2099-01-01T00:00:00.000Z" })]))
    expect(result.current.progress.lessonStep).toBe("")
    expect(getLocalProgress(1).lessonStep).toBe("")
  })

  it("preserves a saved server cursor when a time-only update precedes the initial read", async () => {
    signIn()
    const read = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValue(read.promise)
    const { result } = renderHook(() => useProgress(1))
    act(() => result.current.updateProgress({ timeSpentSeconds: 5 }))
    expect(result.current.progress.lessonStepUpdatedAt).toBe("")
    expect(getLocalProgressSyncItems()[0]).not.toHaveProperty("lesson_step")
    await act(async () => read.resolve([serverItem({ lesson_step: "squares" })]))
    expect(result.current.progress.lessonStep).toBe("squares")
    expect(result.current.progress.timeSpentSeconds).toBe(5)
    expect(getLocalProgress(1).lessonStep).toBe("squares")
  })

  it("treats a legacy blank cursor with recent activity as no cursor edit", async () => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: "", lastViewed: "2099-01-01T00:00:00.000Z",
      timeSpentSeconds: 5, variablesExplored: ["a"] }))
    const read = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValue(read.promise)
    const { result } = renderHook(() => useProgress(1))
    expect(result.current.progress.lessonStepUpdatedAt).toBe("")
    expect(getLocalProgressSyncItems()[0]).not.toHaveProperty("lesson_step")
    await act(async () => read.resolve([serverItem({ lesson_step: "squares" })]))
    expect(result.current.progress.lessonStep).toBe("squares")
    expect(result.current.progress.timeSpentSeconds).toBe(5)
    expect(result.current.progress.variablesExplored).toEqual(["a"])
  })

  it("does not refresh a stored cursor's clock when activity changes", async () => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: "old-local",
      lastViewed: "2026-11-07T09:00:00.000Z", lessonStepUpdatedAt: "2026-11-07T08:00:00.000Z" }))
    const read = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValue(read.promise)
    const { result } = renderHook(() => useProgress(1))
    act(() => result.current.markVariableExplored("a"))
    expect(result.current.progress.lessonStepUpdatedAt).toBe("2026-11-07T08:00:00.000Z")
    await act(async () => read.resolve([serverItem({ lesson_step: "squares" })]))
    expect(result.current.progress.lessonStep).toBe("squares")
    expect(result.current.progress.variablesExplored).toEqual(["a"])
  })

  it("serializes this session's writes and ignores an earlier response after a newer edit", async () => {
    signIn()
    localProgressApi.getAll.mockResolvedValue([])
    const first = deferred<ProgressItem>()
    const second = deferred<ProgressItem>()
    localProgressApi.update.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "first-long-step" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    act(() => result.current.updateProgress({ lessonStep: "x" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(localProgressApi.update).toHaveBeenCalledTimes(1)
    await act(async () => first.resolve(serverItem({ lesson_step: "first-long-step", last_viewed: "2099-01-01T00:00:00.000Z" })))
    expect(localProgressApi.update).toHaveBeenCalledTimes(2)
    expect(localProgressApi.update.mock.calls[1][1].lesson_step).toBe("x")
    expect(getLocalProgress(1).lessonStep).toBe("x")
    await act(async () => second.resolve(serverItem({ lesson_step: "x", last_viewed: "2099-01-02T00:00:00.000Z" })))
    expect(getLocalProgress(1).lessonStep).toBe("x")
  })

  it("retains the latest local cursor after an earlier write fails", async () => {
    signIn()
    localProgressApi.getAll.mockResolvedValue([serverItem()])
    const first = deferred<ProgressItem>()
    const second = deferred<ProgressItem>()
    localProgressApi.update.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useProgress(1))
    await waitFor(() => expect(result.current.progress.lessonStep).toBe("observe"))
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "first-long-step" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    act(() => result.current.updateProgress({ lessonStep: "" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await act(async () => first.reject(new Error("offline")))
    expect(localProgressApi.update).toHaveBeenCalledTimes(2)
    expect(getLocalProgress(1).lessonStep).toBe("")
    await act(async () => second.reject(new Error("still offline")))
    expect(getLocalProgress(1).lessonStep).toBe("")
  })

  it("does not let an old list response replace an acknowledged write", async () => {
    signIn()
    const read = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValue(read.promise)
    localProgressApi.update.mockResolvedValue(serverItem({ lesson_step: "x", last_viewed: "2099-01-01T00:00:00.000Z" }))
    const { result } = renderHook(() => useProgress(1))
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "x" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await act(async () => read.resolve([serverItem({ lesson_step: "stale", last_viewed: "2099-01-02T00:00:00.000Z" })]))
    expect(result.current.progress.lessonStep).toBe("x")
    expect(getLocalProgress(1).lessonStep).toBe("x")
  })

  it("finishes a pending bulk snapshot before sending a newer live cursor", async () => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: "touch", lastViewed: "2026-11-07T09:00:00.000Z" }))
    localProgressApi.getAll.mockResolvedValue([])
    const bulk = deferred<ProgressItem[]>()
    const patch = deferred<ProgressItem>()
    localProgressApi.bulkSync.mockReturnValue(bulk.promise)
    localProgressApi.update.mockReturnValue(patch.promise)
    const { result } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    let sync!: Promise<ProgressItem[]>
    await act(async () => { sync = syncLocalProgressToServer(7); await Promise.resolve() })
    expect(localProgressApi.bulkSync.mock.calls[0][0][0].lesson_step).toBe("touch")
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "squares" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(localProgressApi.update).not.toHaveBeenCalled()
    await act(async () => { bulk.resolve([serverItem({ lesson_step: "touch" })]); await sync })
    expect(localProgressApi.update.mock.calls[0][1].lesson_step).toBe("squares")
    await act(async () => patch.resolve(serverItem({ lesson_step: "squares", last_viewed: "2099-01-01T00:00:00.000Z" })))
    expect(getLocalProgress(1).lessonStep).toBe("squares")
  })

  it("waits for an earlier PATCH and refreshes the bulk cursor before uploading", async () => {
    signIn()
    localProgressApi.getAll.mockResolvedValue([])
    const firstPatch = deferred<ProgressItem>()
    const latestPatch = deferred<ProgressItem>()
    const bulk = deferred<ProgressItem[]>()
    localProgressApi.update.mockReturnValueOnce(firstPatch.promise).mockReturnValueOnce(latestPatch.promise)
    localProgressApi.bulkSync.mockReturnValue(bulk.promise)
    const { result } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "touch" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    let sync!: Promise<ProgressItem[]>
    act(() => { sync = syncLocalProgressToServer(7) })
    act(() => result.current.updateProgress({ lessonStep: "squares" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(localProgressApi.bulkSync).not.toHaveBeenCalled()
    expect(localProgressApi.update).toHaveBeenCalledTimes(1)
    await act(async () => firstPatch.resolve(serverItem({ lesson_step: "touch" })))
    expect(localProgressApi.bulkSync.mock.calls[0][0][0].lesson_step).toBe("squares")
    expect(localProgressApi.update).toHaveBeenCalledTimes(1)
    await act(async () => { bulk.resolve([serverItem({ lesson_step: "squares" })]); await sync })
    expect(localProgressApi.update).toHaveBeenCalledTimes(2)
    expect(localProgressApi.update.mock.calls[1][1].lesson_step).toBe("squares")
    await act(async () => latestPatch.resolve(serverItem({ lesson_step: "squares", last_viewed: "2099-01-01T00:00:00.000Z" })))
    expect(getLocalProgress(1).lessonStep).toBe("squares")
  })

  it("releases a queued live cursor when bulk sync fails", async () => {
    signIn()
    localStorage.setItem("eq-progress-1", JSON.stringify({ lessonStep: "touch", lastViewed: "2026-11-07T09:00:00.000Z" }))
    localProgressApi.getAll.mockResolvedValue([])
    const bulk = deferred<ProgressItem[]>()
    localProgressApi.bulkSync.mockReturnValue(bulk.promise)
    localProgressApi.update.mockResolvedValue(serverItem({ lesson_step: "squares" }))
    const { result } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    let sync!: Promise<ProgressItem[]>
    await act(async () => { sync = syncLocalProgressToServer(7); await Promise.resolve() })
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "squares" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await act(async () => { bulk.reject(new Error("offline")); await expect(sync).rejects.toThrow("offline") })
    expect(localProgressApi.update.mock.calls[0][1].lesson_step).toBe("squares")
    expect(getLocalProgress(1).lessonStep).toBe("squares")
  })

  it("fetches the new user's list and ignores the old user's late read", async () => {
    signIn(7)
    const oldRead = deferred<ProgressItem[]>()
    const newRead = deferred<ProgressItem[]>()
    localProgressApi.getAll.mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise)
    const { result, rerender } = renderHook(() => useAllProgress())
    signIn(8)
    rerender()
    expect(localProgressApi.getAll).toHaveBeenCalledTimes(2)
    await act(async () => newRead.resolve([serverItem({ lesson_step: "new-user" })]))
    expect(result.current.progressByEquation.get(1)?.lessonStep).toBe("new-user")
    await act(async () => oldRead.resolve([serverItem({ lesson_step: "old-user", last_viewed: "2099-01-01T00:00:00.000Z" })]))
    expect(result.current.progressByEquation.get(1)?.lessonStep).toBe("new-user")
  })

  it("ignores an old user's in-flight PATCH response after switching users", async () => {
    signIn(7)
    localProgressApi.getAll.mockResolvedValue([])
    const oldWrite = deferred<ProgressItem>()
    const newWrite = deferred<ProgressItem>()
    localProgressApi.update.mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise)
    const { result, rerender } = renderHook(() => useProgress(1))
    await act(async () => { await Promise.resolve() })
    vi.useFakeTimers()
    act(() => result.current.updateProgress({ lessonStep: "old-user" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    signIn(8)
    rerender()
    await act(async () => { await Promise.resolve() })
    act(() => result.current.updateProgress({ lessonStep: "new-user" }))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    await act(async () => newWrite.resolve(serverItem({ lesson_step: "new-user", last_viewed: "2099-01-01T00:00:00.000Z" })))
    await act(async () => oldWrite.resolve(serverItem({ lesson_step: "old-user", last_viewed: "2099-01-02T00:00:00.000Z" })))
    expect(getLocalProgress(1).lessonStep).toBe("new-user")
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
