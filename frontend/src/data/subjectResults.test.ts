import { describe, expect, it } from "vitest"
import { subjectResults, formatResultValue } from "./subjectResults"

describe("subjectResults", () => {
  it("computes physically correct outputs from slider values", () => {
    // Ohm's law V = IR
    expect(subjectResults[37].compute({ I: 2, R: 10 })).toBe(20)
    // Newton F = ma
    expect(subjectResults[34].compute({ m: 10, a: 2 })).toBe(20)
    // Kepler T = sqrt(a^3 / M) in solar units — Jupiter (a=5.2 AU) ≈ 11.86 yr
    expect(subjectResults[70].compute({ a: 5.2, M: 1 })).toBeCloseTo(11.86, 1)
    // Bayes posterior — the classic base-rate result ≈ 0.167
    expect(subjectResults[21].compute({ prior: 0.01, sens: 0.99, fpr: 0.05 })).toBeCloseTo(0.167, 2)
    // Ideal gas P = nRT/V ≈ 1.10 atm at STP-ish defaults
    expect(subjectResults[26].compute({ n: 1, T: 300, V: 22.4 })).toBeCloseTo(1.1, 1)
    // Stellar luminosity in solar units — the Sun (R=1, T=5772) ≈ 1.0
    expect(subjectResults[73].compute({ R: 1, T: 5772 })).toBeCloseTo(1.0, 1)
    // Determinant ad − bc
    expect(subjectResults[78].compute({ a: 2, b: 0, c: 0, d: 2 })).toBe(4)
    // Goldman resting membrane potential ≈ −71 mV at physiological defaults
    expect(subjectResults[49].compute({ Ko: 4, Nao: 145 })).toBeCloseTo(-71, 0)
    // Planck E = hν — ν=5 (×10¹⁴ Hz, green light) ≈ 2.07 eV
    expect(subjectResults[43].compute({ nu: 5 })).toBeCloseTo(2.07, 1)
    // Gradient descent one step from θ=4, α=0.1 (J=θ²) → 3.2 (heads toward 0)
    expect(subjectResults[22].compute({ theta: 4, alpha: 0.1 })).toBeCloseTo(3.2, 5)
  })

  it("returns NaN for out-of-domain inputs (Snell total internal reflection)", () => {
    expect(Number.isNaN(subjectResults[38].compute({ n1: 2, theta1: 80, n2: 1 }))).toBe(true)
  })

  it("formats results, showing an em dash for non-finite values", () => {
    expect(formatResultValue(20)).toBe("20")
    expect(formatResultValue(NaN)).toBe("—")
    expect(formatResultValue(Infinity)).toBe("—")
    expect(formatResultValue(0)).toBe("0")
    expect(formatResultValue(123456)).toBe("1.23e+5")
    expect(formatResultValue(0.0001)).toBe("1.00e-4")
  })

  it("only maps equations that reduce to an honest scalar", () => {
    // every mapped id is a subject equation (18-81) with a compute fn
    for (const [id, result] of Object.entries(subjectResults)) {
      expect(Number(id)).toBeGreaterThanOrEqual(18)
      expect(Number(id)).toBeLessThanOrEqual(81)
      expect(typeof result.compute).toBe("function")
      expect(result.symbol.length).toBeGreaterThan(0)
    }
  })
})
