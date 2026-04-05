const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

export const ACCESS_TOKEN_KEY = "sciencebouk-access"
export const REFRESH_TOKEN_KEY = "sciencebouk-refresh"

export interface Tokens {
  access: string
  refresh: string
}

let refreshPromise: Promise<string | null> | null = null

export function saveTokens(tokens: Tokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
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
      } catch {
        clearTokens()
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}
