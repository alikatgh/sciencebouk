const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

// NOTE: The refresh token remains in localStorage until the backend is updated
// to set it via an HttpOnly cookie. At that point, remove REFRESH_TOKEN_KEY
// storage and let the browser handle the cookie automatically.
export const ACCESS_TOKEN_KEY = "sciencebouk-access"
export const REFRESH_TOKEN_KEY = "sciencebouk-refresh"

export interface Tokens {
  access: string
  refresh: string
}

// Access token lives only in memory to reduce XSS exposure.
// On first read after a page reload, we fall back to localStorage so the user
// does not have to re-authenticate, then promote the value back to memory.
let _accessTokenMemory: string | null = null

let refreshPromise: Promise<string | null> | null = null

export function saveTokens(tokens: Tokens): void {
  _accessTokenMemory = tokens.access
  // Do NOT persist the access token to localStorage — memory only.
  // The refresh token must stay in localStorage until the backend supports
  // HttpOnly cookies for it.
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function clearTokens(): void {
  _accessTokenMemory = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken(): string | null {
  if (_accessTokenMemory) return _accessTokenMemory
  // Page-reload fallback: if an old access token was stored in localStorage
  // (from a previous session before this change), read and promote it to memory,
  // then remove it from storage so it is no longer persisted there.
  const stored = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (stored) {
    _accessTokenMemory = stored
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
  return _accessTokenMemory
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        })

        if (!response.ok) {
          clearTokens()
          return null
        }

        const data = (await response.json()) as { access: string; refresh?: string }
        saveTokens({
          access: data.access,
          refresh: data.refresh ?? refresh,
        })

        return data.access
      } catch (err) {
        // Only clear tokens on actual HTTP failures (response.ok === false), not
        // on TypeError or other network-level errors so a momentary network blip
        // does not permanently log the user out.
        if (!(err instanceof TypeError)) {
          clearTokens()
        }
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}
