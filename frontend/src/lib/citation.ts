/**
 * Build a plain-text citation for an equation from the metadata the API already
 * provides — no per-equation authoring needed. Pure and deterministic.
 */
export interface CitationInput {
  title: string
  author?: string | null
  year?: string | null
}

export function buildCitation(equation: CitationInput): string {
  const author = (equation.author ?? "").trim() || "Unknown"
  const year = (equation.year ?? "").trim()
  const title = equation.title.trim()
  return `${author}${year ? ` (${year})` : ""}. ${title}. ScienceBouk — Equations That Changed the World.`
}
