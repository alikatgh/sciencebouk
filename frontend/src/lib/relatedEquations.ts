import type { EquationSummary } from "../data/equationManifest"

/**
 * Pick equations related to the current one: same category first (nearest by
 * sort order), then fill from adjacent equations in the atlas. Never includes
 * the current equation. Deterministic and pure — easy to test and to render as
 * "More like this" links.
 */
export function getRelatedEquations(
  currentId: number,
  manifest: EquationSummary[],
  limit = 4,
): EquationSummary[] {
  const current = manifest.find((e) => e.id === currentId)
  const others = manifest.filter((e) => e.id !== currentId)

  const byDistance = (a: EquationSummary, b: EquationSummary) =>
    Math.abs(a.id - currentId) - Math.abs(b.id - currentId)

  const sameCategory = current
    ? others.filter((e) => e.category === current.category).sort(byDistance)
    : []

  const rest = others.filter((e) => !sameCategory.includes(e)).sort(byDistance)

  const seen = new Set<number>()
  const out: EquationSummary[] = []
  for (const e of [...sameCategory, ...rest]) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}
