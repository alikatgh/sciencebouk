import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { api } from "./client"
import { useSettings } from "../settings/SettingsContext"

export function useEquations(category?: string) {
  const { settings } = useSettings()

  return useQuery({
    queryKey: ["equations", category, settings.language],
    queryFn: () => api.equations.list(category, settings.language),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEquation(id: number) {
  const { settings } = useSettings()

  return useQuery({
    queryKey: ["equation", id, settings.language],
    queryFn: () => api.equations.get(id, settings.language),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ["course", slug],
    queryFn: () => api.courses.get(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSearchEquations(query: string) {
  const { settings } = useSettings()
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ["search", debouncedQuery, settings.language],
    queryFn: () => api.search(debouncedQuery, settings.language),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  })
}

export function useUpdateProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; user_id: string; completed?: boolean; notes?: string }) =>
      api.equations.updateProgress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equations"] })
    },
  })
}
