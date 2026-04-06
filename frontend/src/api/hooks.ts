import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { api } from "./client"

export function useEquations(category?: string) {
  return useQuery({
    queryKey: ["equations", category],
    queryFn: () => api.equations.list(category),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEquation(id: number) {
  return useQuery({
    queryKey: ["equation", id],
    queryFn: () => api.equations.get(id),
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
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
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
