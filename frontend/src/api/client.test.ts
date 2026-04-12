import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "./client"
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, getAccessToken, resetTokenStorageForTests, saveTokens } from "../auth/tokenStorage"

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
    resetTokenStorageForTests()
  })

  afterEach(() => {
    resetTokenStorageForTests()
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
    saveTokens({ access: "expired-access", refresh: "refresh-token" })

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
    expect(getAccessToken()).toBe("fresh-access")
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("fresh-refresh")
  })

  it("does not force json content headers for avatar uploads", async () => {
    saveTokens({ access: "active-access", refresh: "refresh-token" })

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

  it("unwraps paginated search responses", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, title: "Pythagoras", formula: "a^2+b^2=c^2", author: "Pythagoras", year: "530 BC", category: "geometry", description: "", stage: "live" }],
    }))

    vi.stubGlobal("fetch", fetchMock)

    await expect(api.search("pyth")).resolves.toEqual([
      expect.objectContaining({ id: 1, title: "Pythagoras" }),
    ])
  })

  it("appends locale to equation detail requests when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {
      id: 1,
      slug: "pythagoras",
      title: "Satz des Pythagoras",
      formula: "a^2+b^2=c^2",
      author: "Pythagoras",
      year: "530 BC",
      category: "geometry",
      description: "",
      stage: "live",
      hook: "Du baust eine Rampe.",
      hook_action: "Ziehe die Seiten.",
      variables_data: [],
      presets_data: [],
      lessons_data: [],
      glossary_data: [],
    }))

    vi.stubGlobal("fetch", fetchMock)

    await api.equations.get(1, "de-DE")

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/api/equations/1/?locale=de-DE")
  })

  it("appends locale to search requests when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, {
      count: 0,
      next: null,
      previous: null,
      results: [],
    }))

    vi.stubGlobal("fetch", fetchMock)

    await api.search("satz", "de")

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/api/search/?q=satz&locale=de")
  })

  it("flattens paginated progress responses across pages", async () => {
    saveTokens({ access: "active-access", refresh: "refresh-token" })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, {
        count: 2,
        next: "http://localhost:8000/api/progress/?page=2",
        previous: null,
        results: [{ equation_id: 1, completed: true, completed_at: null, lesson_step: "", time_spent_seconds: 10, variables_explored: [], notes: "", bookmarked: false, last_viewed: null }],
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        count: 2,
        next: null,
        previous: "http://localhost:8000/api/progress/",
        results: [{ equation_id: 2, completed: false, completed_at: null, lesson_step: "step-2", time_spent_seconds: 20, variables_explored: ["x"], notes: "", bookmarked: true, last_viewed: null }],
      }))

    vi.stubGlobal("fetch", fetchMock)

    await expect(api.progress.getAll()).resolves.toEqual([
      expect.objectContaining({ equation_id: 1 }),
      expect.objectContaining({ equation_id: 2 }),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/api/progress/")
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:8000/api/progress/?page=2")
  })
})
