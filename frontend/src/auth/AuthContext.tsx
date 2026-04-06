import type { ReactElement, ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  clearTokens as clearStoredTokens,
  getAccessToken as getStoredAccessToken,
  refreshAccessToken,
  saveTokens as saveStoredTokens,
  type Tokens,
} from "./tokenStorage"

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

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isPro: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  getAccessToken: () => string | null
  refreshUser: () => Promise<void>
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
    saveStoredTokens(tokens)
  }, [])

  const clearTokens = useCallback(() => {
    clearStoredTokens()
  }, [])

  const getAccessToken = useCallback(() => getStoredAccessToken(), [])

  const fetchMe = useCallback(async (token: string) => {
    const data = await fetchJSON<User>("/auth/me/", {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
    setUser(data)
  }, [])

  const refreshUser = useCallback(async () => {
    const access = getAccessToken()
    if (!access) {
      clearStoredTokens()
      setUser(null)
      return
    }

    try {
      await fetchMe(access)
      return
    } catch (firstError) {
      // Only attempt token refresh for auth failures; treat network errors as transient
      const isAuthError = firstError instanceof Error && /^Error 40(1|3)/.test(firstError.message)
      if (!isAuthError) {
        console.warn("[AuthContext] refreshUser: non-auth error, skipping token refresh", firstError)
        setUser(null)
        return
      }
      try {
        const newAccess = await refreshAccessToken()
        if (!newAccess) {
          clearStoredTokens()
          setUser(null)
          return
        }
        await fetchMe(newAccess)
      } catch (refreshError) {
        console.warn("[AuthContext] refreshUser: token refresh failed", refreshError)
        clearStoredTokens()
        setUser(null)
      }
    }
  }, [fetchMe, getAccessToken])

  // Boot: check for existing tokens
  useEffect(() => {
    const boot = async () => {
      try {
        await refreshUser()
      } catch {
        clearTokens()
        setUser(null)
      }
      setLoading(false)
    }
    boot()
  }, [refreshUser, clearTokens])

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
    refreshUser,
  }), [user, loading, login, register, logout, getAccessToken, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
