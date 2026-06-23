import { useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import type { EquationSummaryResponse } from "../api/client"
import fallbackManifestJson from "./content/equation-manifest-fallback.json"
import { useSettings } from "../settings/SettingsContext"

export type EquationSummary = EquationSummaryResponse

export const coreEquationManifest: EquationSummary[] = fallbackManifestJson as EquationSummary[]

export function resolveEquationManifest(
  manifest: EquationSummary[] | null | undefined,
): EquationSummary[] {
  return manifest && manifest.length > 0 ? manifest : coreEquationManifest
}

/** Lowercase + strip diacritics so "Schrodinger" matches "Schrödinger". */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/** Strip LaTeX control words/markup so a formula is searchable as plain symbols. */
function plainFormula(formula: string): string {
  return formula.replace(/\\[a-zA-Z]+/g, " ").replace(/[{}\\^_$&]/g, " ")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Rank-aware search across title, author, category, formula symbols, and year.
 * Every query token must match somewhere (AND); results are ordered by relevance
 * (title-prefix > title-word > title-substring > formula > author > category),
 * and diacritics are folded so "schrodinger" finds "Schrödinger".
 */
export function searchEquationManifest(
  manifest: EquationSummary[],
  query: string,
): EquationSummary[] {
  const normalizedQuery = normalizeText(query.trim())
  if (!normalizedQuery) {
    return manifest
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const scored: Array<{ equation: EquationSummary; score: number }> = []

  for (const equation of manifest) {
    const title = normalizeText(equation.title)
    const author = normalizeText(equation.author ?? "")
    const category = normalizeText((equation.category ?? "").replace(/_/g, " "))
    const formula = normalizeText(plainFormula(equation.formula ?? ""))
    const year = normalizeText(String(equation.year ?? ""))
    const haystack = `${title} ${author} ${category} ${formula} ${year}`

    if (!tokens.every((token) => haystack.includes(token))) continue

    let score = 0
    for (const token of tokens) {
      const wordBoundary = new RegExp(`\\b${escapeRegExp(token)}`)
      if (title.startsWith(token)) score += 100
      else if (wordBoundary.test(title)) score += 60
      else if (title.includes(token)) score += 40
      else if (formula.includes(token)) score += 25
      else if (author.includes(token)) score += 15
      else score += 5
    }
    scored.push({ equation, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((entry) => entry.equation)
}

/** A random equation id other than the one currently shown (for "surprise me"). */
export function getRandomEquationId(manifest: EquationSummary[], excludeId?: number): number | null {
  const pool = manifest.filter((equation) => equation.id !== excludeId)
  if (pool.length === 0) return manifest[0]?.id ?? null
  return pool[Math.floor(Math.random() * pool.length)].id
}

export function useEquationManifest() {
  const { settings } = useSettings()

  return useQuery({
    queryKey: ["equations", "manifest", settings.language],
    queryFn: () => api.equations.listAll(settings.language),
    staleTime: 10 * 60 * 1000,
  })
}
