import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  REFRESH_TOKEN_KEY,
  getAccessToken,
  isTransientRefreshFailure,
  refreshAccessToken,
  resetTokenStorageForTests,
  saveTokens,
} from "./tokenStorage"

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

describe("tokenStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock())
    resetTokenStorageForTests()
  })

  afterEach(() => {
    resetTokenStorageForTests()
    vi.unstubAllGlobals()
  })

  it("deduplicates concurrent refresh requests", async () => {
    saveTokens({ access: "expired-access", refresh: "refresh-token" })

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { access: "fresh-access", refresh: "fresh-refresh" }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(first).toEqual({ ok: true, access: "fresh-access" })
    expect(second).toEqual({ ok: true, access: "fresh-access" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe("fresh-access")
  })

  it("reports network failures without clearing refresh tokens", async () => {
    saveTokens({ access: "expired-access", refresh: "refresh-token" })

    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    vi.stubGlobal("fetch", fetchMock)

    const result = await refreshAccessToken()

    expect(result).toEqual({ ok: false, reason: "network" })
    expect(isTransientRefreshFailure(result)).toBe(true)
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-token")
  })
})
