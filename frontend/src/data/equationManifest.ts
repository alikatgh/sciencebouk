import { useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import type { EquationSummaryResponse } from "../api/client"
import fallbackManifestJson from "./content/equation-manifest-fallback.json"

export type EquationSummary = EquationSummaryResponse

export const coreEquationManifest: EquationSummary[] = fallbackManifestJson as EquationSummary[]

export function resolveEquationManifest(
  manifest: EquationSummary[] | null | undefined,
): EquationSummary[] {
  return manifest && manifest.length > 0 ? manifest : coreEquationManifest
}

export function searchEquationManifest(
  manifest: EquationSummary[],
  query: string,
): EquationSummary[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return manifest
  }

  return manifest.filter((equation) =>
    `${equation.title} ${equation.author} ${equation.category}`.toLowerCase().includes(normalizedQuery),
  )
}

export function useEquationManifest() {
  return useQuery({
    queryKey: ["equations", "manifest"],
    queryFn: () => api.equations.listAll(),
    staleTime: 10 * 60 * 1000,
  })
}
