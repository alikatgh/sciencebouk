import type { ReactElement, ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

interface User {
  id: number
  email: string
  username: string
  profile: {
    tier: 'free' | 'pro'
    display_name: string
    avatar_url: string
    daily_goal_minutes: number
    preferred_difficulty: string
    onboarding_completed: boolean
  }
}

interface Tokens {
  access: string
  refresh: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isPro: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? body.email?.[0] ?? body.password?.[0] ?? `Error ${res.status}`)
  }
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const saveTokens = useCallback((tokens: Tokens) => {
    localStorage.setItem("formulas-access", tokens.access)
    localStorage.setItem("formulas-refresh", tokens.refresh)
  }, [])

  const clearTokens = useCallback(() => {
    localStorage.removeItem("formulas-access")
    localStorage.removeItem("formulas-refresh")
  }, [])

  const getAccessToken = useCallback(() => localStorage.getItem("formulas-access"), [])

  const fetchMe = useCallback(async (token: string) => {
    const data = await fetchJSON<User>("/auth/me/", {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
    setUser(data)
  }, [])

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const refresh = localStorage.getItem("formulas-refresh")
    if (!refresh) return null
    try {
      const data = await fetchJSON<{ access: string; refresh?: string }>("/auth/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      })
      localStorage.setItem("formulas-access", data.access)
      if (data.refresh) localStorage.setItem("formulas-refresh", data.refresh)
      return data.access
    } catch {
      clearTokens()
      return null
    }
  }, [clearTokens])

  // Boot: check for existing tokens
  useEffect(() => {
    const boot = async () => {
      const access = localStorage.getItem("formulas-access")
      if (!access) { setLoading(false); return }
      try {
        await fetchMe(access)
      } catch {
        const newAccess = await refreshToken()
        if (newAccess) {
          try { await fetchMe(newAccess) } catch { clearTokens() }
        }
      }
      setLoading(false)
    }
    boot()
  }, [fetchMe, refreshToken, clearTokens])

  const login = useCallback(async (email: string, password: string) => {
    const data = await fetchJSON<{ access: string; refresh: string }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username: email, password }),
    })
    saveTokens(data)
    await fetchMe(data.access)
  }, [saveTokens, fetchMe])

  const register = useCallback(async (email: string, password: string) => {
    const data = await fetchJSON<{ user: User; tokens: Tokens }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    saveTokens(data.tokens)
    setUser(data.user)
  }, [saveTokens])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [clearTokens])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isPro: user?.profile.tier === 'pro',
    loading,
    login,
    register,
    logout,
    getAccessToken,
  }), [user, loading, login, register, logout, getAccessToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
