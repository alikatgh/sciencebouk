import { describe, expect, it } from "vitest"
import { presetIsActive, type Preset } from "./TeachableEquation"

const balanced: Preset = { label: "Balanced", values: { K: 50, L: 50, alpha: 0.3 } }

describe("presetIsActive", () => {
  it("matches when every preset value equals current vars", () => {
    expect(presetIsActive(balanced, { K: 50, L: 50, alpha: 0.3 })).toBe(true)
  })

  it("does not match a partial or drifted set", () => {
    expect(presetIsActive(balanced, { K: 90, L: 20, alpha: 0.6 })).toBe(false)
    expect(presetIsActive(balanced, { K: 50, L: 50 })).toBe(false)
  })
})
