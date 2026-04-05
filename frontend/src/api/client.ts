import { clearTokens, getAccessToken, refreshAccessToken } from "../auth/tokenStorage"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

async function readError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as
    | { detail?: string; message?: string }
    | null

  const message =
    body?.detail ??
    body?.message ??
    `API ${response.status}: ${response.statusText}`

  return new Error(message)
}

function withAuthHeaders(options?: RequestInit, token?: string | null): Headers {
  const headers = new Headers(options?.headers)

  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return headers
}

async function doFetch(path: string, options?: RequestInit, token?: string | null): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: withAuthHeaders(options, token),
  })
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const accessToken = getAccessToken()
  let response = await doFetch(path, options, accessToken)

  if (response.status === 401 && accessToken) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      response = await doFetch(path, options, refreshedToken)
    } else {
      clearTokens()
    }
  }

  if (!response.ok) {
    throw await readError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface EquationResponse {
  id: number
  title: string
  formula: string
  author: string
  year: string
  category: string
  description: string
  stage: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CourseResponse {
  slug: string
  title: string
  description: string
  progress_percent: number
  tone: string
  lessons: LessonResponse[]
}

export interface LessonResponse {
  id: number
  title: string
  objective: string
  steps: string[]
  duration_minutes: number
  sort_order: number
}

export interface ProgressResponse {
  equation_id: number
  completed: boolean
  last_viewed: string
  notes: string
}

export interface ProgressItem {
  equation_id: number
  completed: boolean
  completed_at: string | null
  lesson_step: string
  time_spent_seconds: number
  variables_explored: string[]
  notes: string
  bookmarked: boolean
  last_viewed: string
}

export interface BulkSyncItem {
  equation_id: number
  completed?: boolean
  lesson_step?: string
  time_spent_seconds?: number
  variables_explored?: string[]
  notes?: string
  bookmarked?: boolean
}

export interface DashboardData {
  completedCount: number
  totalEquations: number
  totalTimeMinutes: number
  currentStreak: number
  categories: Record<string, { total: number; completed: number }>
  nextRecommended: { id: number; title: string } | null
}

export interface UserProfile {
  display_name: string
  avatar_url: string
  daily_goal_minutes: number
  preferred_difficulty: string
  onboarding_completed: boolean
  tier: "free" | "pro"
}

export interface AuthenticatedUser {
  id: number
  email: string
  username: string
  profile: UserProfile
}

export const api = {
  equations: {
    list: (category?: string) => {
      const params = category ? `?category=${encodeURIComponent(category)}` : ""
      return request<PaginatedResponse<EquationResponse>>(`/equations/${params}`)
    },
    get: (id: number) =>
      request<EquationResponse>(`/equations/${id}/`),
    updateProgress: (id: number, data: { user_id: string; completed?: boolean; notes?: string }) =>
      request<ProgressResponse>(`/equations/${id}/progress/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  courses: {
    get: (slug: string) =>
      request<CourseResponse>(`/courses/${slug}/`),
  },
  search: (q: string) =>
    request<EquationResponse[]>(`/search/?q=${encodeURIComponent(q)}`),

  progress: {
    getAll: () => request<ProgressItem[]>('/progress/'),
    clear: () => request<{ ok: boolean }>('/progress/', { method: 'DELETE' }),
    update: (eqId: number, data: Partial<ProgressItem>) =>
      request<ProgressItem>(`/progress/${eqId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    bulkSync: (items: BulkSyncItem[]) =>
      request<ProgressItem[]>('/progress/sync/', { method: 'POST', body: JSON.stringify({ items }) }),
  },

  analytics: {
    dashboard: () => request<DashboardData>('/analytics/dashboard/'),
    logEvent: (eqId: number, eventType: string, data?: Record<string, unknown>) =>
      request<{ ok: boolean }>('/analytics/event/', {
        method: 'POST',
        body: JSON.stringify({ equation_id: eqId, event_type: eventType, data: data ?? {} }),
      }),
  },

  payments: {
    checkout: (priceType: 'monthly' | 'yearly') =>
      request<{ url: string }>('/payments/checkout/', { method: 'POST', body: JSON.stringify({ price_type: priceType }) }),
    portal: () =>
      request<{ url: string }>('/payments/portal/', { method: 'POST' }),
    status: () =>
      request<{ tier: string; is_pro: boolean }>('/payments/status/'),
  },

  profile: {
    update: (displayName: string) =>
      request<AuthenticatedUser>('/auth/me/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName }),
      }),
    uploadAvatar: (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      return request<{ avatar_url: string }>('/auth/me/avatar/', {
        method: 'POST',
        body: form,
      })
    },
  },
}
