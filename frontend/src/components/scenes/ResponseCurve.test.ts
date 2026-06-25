import { describe, expect, it } from "vitest"
import { pickSweepVariable } from "./ResponseCurve"
import type { Variable } from "../teaching/types"

function v(name: string, min: number, max: number, value: number): Variable {
  return { name, symbol: name, latex: name, value, min, max, step: (max - min) / 100, color: "#3b82f6" }
}

describe("pickSweepVariable", () => {
  it("picks the most nonlinear variable (the one that makes an illustrative curve)", () => {
    // E_k = 0.5·m·v² — linear in m, quadratic in v. v is the insight.
    const result = { symbol: "E_k", compute: (x: Record<string, number>) => 0.5 * x.m * x.v * x.v }
    const picked = pickSweepVariable(result, [v("m", 0.1, 100, 10), v("v", 0, 50, 10)])
    expect(picked?.name).toBe("v")
  })

  it("prefers a variable whose sweep reverses direction (an interior peak)", () => {
    // Logistic dN/dt = r·N·(1−N/K): a parabola in N (peaks at K/2), monotonic in K.
    // The reversing parabola is the illustrative one.
    const result = { symbol: "dN/dt", compute: (x: Record<string, number>) => 0.5 * x.N * (1 - x.N / x.K) }
    const picked = pickSweepVariable(result, [v("N", 0, 1000, 50), v("K", 100, 1000, 500)])
    expect(picked?.name).toBe("N")
  })

  it("falls back to the most responsive variable when everything is linear", () => {
    // V = I·R — both linear; the wider-range factor wins the tiebreak.
    const result = { symbol: "V", compute: (x: Record<string, number>) => x.I * x.R }
    const picked = pickSweepVariable(result, [v("I", 0, 10, 2), v("R", 1, 100, 10)])
    expect(picked?.name).toBe("R")
  })

  it("returns null when there is no non-constant variable to sweep", () => {
    const result = { symbol: "x", compute: () => 1 }
    expect(pickSweepVariable(result, [{ ...v("c", 0, 1, 0.5), constant: true }])).toBeNull()
  })
})
