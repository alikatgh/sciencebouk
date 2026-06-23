import { describe, expect, it } from "vitest"
import { coreEquationManifest } from "./equationManifest"
import { groupEquationsBySubject, subjectSlugForEquation } from "./equationGroups"

describe("equationGroups", () => {
  it("maps the core 17 to the 'core' subject", () => {
    expect(subjectSlugForEquation(1)).toBe("core")
    expect(subjectSlugForEquation(13)).toBe("core")
    const groups = groupEquationsBySubject(coreEquationManifest)
    expect(groups).toHaveLength(1)
    expect(groups[0].slug).toBe("core")
    expect(groups[0].equations).toHaveLength(17)
  })

  it("groups a mixed list by subject and preserves within-group order", () => {
    const list = [
      coreEquationManifest[2], // id 3 (core)
      coreEquationManifest[0], // id 1 (core)
    ]
    const groups = groupEquationsBySubject(list)
    expect(groups).toHaveLength(1)
    expect(groups[0].equations.map((e) => e.id)).toEqual([3, 1])
  })

  it("returns no groups for an empty list", () => {
    expect(groupEquationsBySubject([])).toEqual([])
  })
})
