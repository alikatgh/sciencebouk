import { subjects } from "./subjects"
import type { EquationSummary } from "./equationManifest"

/**
 * Group a flat equation list by subject (Physics, Chemistry, …) for display in
 * the sidebar. Purely visual — the underlying manifest order is untouched, so
 * index-based keyboard navigation keeps working. Subjects appear in their
 * canonical order; within each, equations keep their incoming order.
 */
const subjectOrder = subjects.map((subject) => subject.slug)
const subjectNameBySlug = new Map(subjects.map((subject) => [subject.slug, subject.name]))
const slugByEquationId = new Map<number, string>()
for (const subject of subjects) {
  for (const formula of subject.formulas) {
    if (typeof formula.id === "number") slugByEquationId.set(formula.id, subject.slug)
  }
}

export interface EquationGroup {
  slug: string
  name: string
  equations: EquationSummary[]
}

export function subjectSlugForEquation(id: number): string | null {
  return slugByEquationId.get(id) ?? null
}

export function groupEquationsBySubject(equations: EquationSummary[]): EquationGroup[] {
  const bySlug = new Map<string, EquationSummary[]>()
  for (const equation of equations) {
    const slug = slugByEquationId.get(equation.id) ?? "other"
    const list = bySlug.get(slug)
    if (list) list.push(equation)
    else bySlug.set(slug, [equation])
  }

  const groups: EquationGroup[] = []
  for (const slug of subjectOrder) {
    const list = bySlug.get(slug)
    if (list && list.length > 0) {
      groups.push({ slug, name: subjectNameBySlug.get(slug) ?? slug, equations: list })
    }
  }
  const leftover = bySlug.get("other")
  if (leftover && leftover.length > 0) groups.push({ slug: "other", name: "Other", equations: leftover })
  return groups
}
