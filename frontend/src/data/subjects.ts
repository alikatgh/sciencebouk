import { coreEquationManifest } from "./equationManifest"
import rawSubjectsJson from "./content/subjects.json"

export interface SubjectFormula {
  title: string
  formula: string
  author?: string
  year?: string
  id?: number // links to active equation — null means coming soon
}

export interface Subject {
  slug: string
  name: string
  description: string
  icon: string
  active: boolean
  formulas: SubjectFormula[]
}

const coreSubjectFormulas: SubjectFormula[] = coreEquationManifest.map((equation) => ({
  id: equation.id,
  title: equation.title,
  formula: equation.formula,
  author: equation.author,
  year: equation.year,
}))

const rawSubjects = rawSubjectsJson as Subject[]

export const subjects: Subject[] = rawSubjects.map((subject) => (
  subject.slug === "core"
    ? { ...subject, formulas: coreSubjectFormulas }
    : subject
))

export const subjectsBySlug = new Map<string, Subject>(
  subjects.map((subject) => [subject.slug, subject]),
)

export const activeSubjects = subjects.filter((subject) => subject.active)

export const inactiveSubjects = subjects.filter((subject) => !subject.active)

export function getSubject(slug: string): Subject | null {
  return subjectsBySlug.get(slug) ?? null
}
