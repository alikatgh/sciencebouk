import { describe, expect, it } from "vitest"
import {
  activeSubjects,
  getSubject,
  inactiveSubjects,
  subjects,
  subjectsBySlug,
} from "./subjects"

describe("subjects helpers", () => {
  it("provides stable slug lookups for every subject", () => {
    for (const subject of subjects) {
      expect(getSubject(subject.slug)).toEqual(subject)
      expect(subjectsBySlug.get(subject.slug)).toEqual(subject)
    }

    expect(getSubject("missing-subject")).toBeNull()
  })

  it("precomputes active and inactive subject lists consistently", () => {
    expect(activeSubjects.every((subject) => subject.active)).toBe(true)
    expect(inactiveSubjects.every((subject) => !subject.active)).toBe(true)
    expect(activeSubjects.length + inactiveSubjects.length).toBe(subjects.length)
  })
})
