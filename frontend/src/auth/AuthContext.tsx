import type { ReactElement, ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  AUTH_STATE_EVENT,
  REFRESH_TOKEN_KEY,
  clearTokens as clearStoredTokens,
  getAccessToken as getStoredAccessToken,
  refreshAccessToken,
  saveTokens as saveStoredTokens,
  type Tokens,
} from "./tokenStorage"
import { API_BASE } from "../config/api"
import { createHttpError, hasHttpStatus } from "../api/httpError"

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
  register: (email: string, password: string, inviteCode?: string) => Promise<void>
  loginWithGoogle: (credential: string, inviteCode?: string) => Promise<void>
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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw createHttpError(
      res.status,
      body.detail ?? body.invite_code?.[0] ?? body.email?.[0] ?? body.password?.[0] ?? `HTTP ${res.status}`,
    )
  }
  return res.json()
}

export function isAuthFailureError(error: unknown): boolean {
  return hasHttpStatus(error, [401, 403])
}

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(false)

  useEffect(() => {
    // React StrictMode intentionally mounts, cleans up, and re-mounts effects in
    // development. Reset the flag on setup so auth state updates remain enabled.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
    if (mountedRef.current) {
      setUser(data)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    let access = getAccessToken()
    let hasRefreshed = false

    // No access token in memory (e.g. page reload) — try refresh token first
    if (!access) {
      access = await refreshAccessToken()
      hasRefreshed = true
      if (!access) {
        clearStoredTokens()
        if (mountedRef.current) setUser(null)
        return
      }
    }

    try {
      await fetchMe(access)
    } catch (firstError) {
      if (!isAuthFailureError(firstError)) {
        console.warn("[AuthContext] refreshUser: non-auth error, skipping token refresh", firstError)
        return
      }
      if (hasRefreshed) {
        clearStoredTokens()
        if (mountedRef.current) setUser(null)
        return
      }
      // Access token expired — try refresh
      try {
        const newAccess = await refreshAccessToken()
        hasRefreshed = true
        if (!newAccess) {
          clearStoredTokens()
          if (mountedRef.current) setUser(null)
          return
        }
        await fetchMe(newAccess)
      } catch (refreshError) {
        console.warn("[AuthContext] refreshUser: token refresh failed", refreshError)
        clearStoredTokens()
        if (mountedRef.current) setUser(null)
      }
    }
  }, [fetchMe, getAccessToken])

  // Boot: check for existing tokens
  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        await refreshUser()
      } catch {
        clearTokens()
        if (!cancelled && mountedRef.current) {
          setUser(null)
        }
      }
      if (!cancelled && mountedRef.current) {
        setLoading(false)
      }
    }

    void boot()

    return () => {
      cancelled = true
    }
  }, [refreshUser, clearTokens])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== REFRESH_TOKEN_KEY && event.key !== null) return

      if (event.newValue === null) {
        if (mountedRef.current) {
          setUser(null)
        }
        return
      }

      void refreshUser()
    }

    const handleAuthStateChange = (event: Event) => {
      const authenticated = (event as CustomEvent<{ authenticated?: boolean }>).detail?.authenticated
      if (authenticated === false) {
        if (mountedRef.current) {
          setUser(null)
        }
        return
      }

      if (authenticated === true) {
        void refreshUser()
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(AUTH_STATE_EVENT, handleAuthStateChange as EventListener)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthStateChange as EventListener)
    }
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const data = await fetchJSON<{ access: string; refresh: string; user?: User }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username: email, password }),
    })
    saveTokens(data)
    if (data.user) {
      if (mountedRef.current) {
        setUser(data.user)
      }
      return
    }
    await fetchMe(data.access)
  }, [saveTokens, fetchMe])

  const register = useCallback(async (email: string, password: string, inviteCode = "") => {
    const data = await fetchJSON<{ user: User; tokens: Tokens }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ email, password, invite_code: inviteCode.trim() }),
    })
    saveTokens(data.tokens)
    if (mountedRef.current) {
      setUser(data.user)
    }
  }, [saveTokens])

  const loginWithGoogle = useCallback(async (credential: string, inviteCode = "") => {
    const data = await fetchJSON<{ user: User; tokens: Tokens }>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ credential, invite_code: inviteCode.trim() }),
    })
    saveTokens(data.tokens)
    if (mountedRef.current) {
      setUser(data.user)
    }
  }, [saveTokens])

  const logout = useCallback(() => {
    clearTokens()
    if (mountedRef.current) {
      setUser(null)
    }
  }, [clearTokens])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    isPro: user?.profile.tier === 'pro',
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    getAccessToken,
    refreshUser,
  }), [user, loading, login, register, loginWithGoogle, logout, getAccessToken, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
