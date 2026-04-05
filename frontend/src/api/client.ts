const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("formulas-access")
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { headers, ...options })
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`)
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
}
