import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "./client"
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../auth/tokenStorage"

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

function jsonResponse(status: number, body: unknown, statusText = "OK"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock())
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("exports api object with expected methods", () => {
    expect(api.equations).toBeDefined()
    expect(api.equations.list).toBeTypeOf("function")
    expect(api.equations.get).toBeTypeOf("function")
    expect(api.equations.updateProgress).toBeTypeOf("function")
    expect(api.courses).toBeDefined()
    expect(api.courses.get).toBeTypeOf("function")
    expect(api.search).toBeTypeOf("function")
  })

  it("refreshes expired access tokens and retries the request", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "expired-access")
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token")

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "token_not_valid" }, "Unauthorized"))
      .mockResolvedValueOnce(jsonResponse(200, { access: "fresh-access", refresh: "fresh-refresh" }))
      .mockResolvedValueOnce(jsonResponse(200, []))

    vi.stubGlobal("fetch", fetchMock)

    await expect(api.progress.getAll()).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/api/progress/")
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:8000/api/auth/refresh/")
    expect(fetchMock.mock.calls[2]?.[0]).toBe("http://localhost:8000/api/progress/")

    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit)
    const retriedHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers as HeadersInit)

    expect(firstHeaders.get("Authorization")).toBe("Bearer expired-access")
    expect(retriedHeaders.get("Authorization")).toBe("Bearer fresh-access")
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("fresh-access")
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("fresh-refresh")
  })

  it("does not force json content headers for avatar uploads", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "active-access")

    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        avatar_url: "/media/avatar.png",
      }),
    )

    vi.stubGlobal("fetch", fetchMock)

    const file = new File(["avatar"], "avatar.png", { type: "image/png" })
    await api.profile.uploadAvatar(file)

    const request = fetchMock.mock.calls[0]?.[1]
    const headers = new Headers(request?.headers as HeadersInit)

    expect(headers.get("Authorization")).toBe("Bearer active-access")
    expect(headers.has("Content-Type")).toBe(false)
    expect(request?.body).toBeInstanceOf(FormData)
  })

  it("sends the selected plan when starting checkout", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { url: "https://checkout.example" }))

    vi.stubGlobal("fetch", fetchMock)

    await expect(api.payments.checkout("yearly")).resolves.toEqual({ url: "https://checkout.example" })

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/api/payments/checkout/")
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ price_type: "yearly" }))
  })
})
