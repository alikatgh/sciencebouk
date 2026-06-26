import { useQuery } from "@tanstack/react-query"
import { api } from "./client"
import { useSettings } from "../settings/SettingsContext"

export function useEquation(id: number) {
  const { settings } = useSettings()

  return useQuery({
    queryKey: ["equation", id, settings.language],
    queryFn: () => api.equations.get(id, settings.language),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
  })
}
