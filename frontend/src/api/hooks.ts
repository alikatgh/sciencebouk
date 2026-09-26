import { useQuery } from "@tanstack/react-query"
import { api } from "./client"
import type { EquationResponse } from "./client"
import { useSettings } from "../settings/SettingsContext"

export async function loadEquationWithFallback(id: number, locale?: string | null): Promise<EquationResponse> {
  try {
    return await api.equations.get(id, locale)
  } catch (error) {
    // Load the existing curated lessons only when the API cannot supply them;
    // this keeps the teaching payload out of the homepage's initial bundle.
    const { default: bundledEquations } = await import("../data/content/subject-equations-fallback.json")
    const bundledEquation = bundledEquations.find((equation) => equation.id === id)
    if (!bundledEquation) throw error
    return bundledEquation as EquationResponse
  }
}

export function useEquation(id: number) {
  const { settings } = useSettings()

  return useQuery({
    queryKey: ["equation", id, settings.language],
    queryFn: () => loadEquationWithFallback(id, settings.language),
    // Allow the request/fallback path even when the browser reports offline.
    networkMode: "always",
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
  })
}
