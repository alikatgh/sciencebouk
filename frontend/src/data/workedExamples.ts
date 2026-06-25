/**
 * Worked examples for the data-driven subject equations: a concrete scenario and
 * the substitution steps that lead to the answer. Distinct from the live result
 * (which shows the *number*) — this shows the *algebra*, the "how do I actually
 * compute this" a learner often wants. Curated where the arithmetic is clean and
 * instructive; surfaced as a tab in the scene's Learn-more panel.
 *
 * Pure data + a typed accessor.
 */

export interface WorkedExample {
  /** The concrete scenario, e.g. "A 10 kg cart pushed at 2 m/s²". */
  given: string
  /** Substitution steps, rendered as a monospace sequence. */
  steps: string[]
}

export const workedExamples: Record<number, WorkedExample> = {
  21: {
    given: "Disease in 1% of people; test 99% sensitive, 5% false-positive. You test positive.",
    steps: ["P(A|B) = 0.99·0.01 / (0.99·0.01 + 0.05·0.99)", "= 0.0099 / 0.0594", "≈ 0.167"],
  },
  26: {
    given: "1 mol of gas at 300 K in a 24.6 L vessel.",
    steps: ["P = nRT / V", "= (1 × 0.0821 × 300) / 24.6", "= 24.6 / 24.6 = 1 atm"],
  },
  28: {
    given: "A buffer at pKa 4.76 with equal acid and base.",
    steps: ["pH = pKa + log([A⁻]/[HA])", "= 4.76 + log(1)", "= 4.76"],
  },
  34: {
    given: "A 10 kg cart pushed at 2 m/s².",
    steps: ["F = m × a", "= 10 × 2", "= 20 N"],
  },
  35: {
    given: "A 10 kg mass moving at 10 m/s.",
    steps: ["E = ½ m v²", "= ½ × 10 × 10²", "= ½ × 10 × 100 = 500 J"],
  },
  36: {
    given: "Two 1 µC charges, 1 m apart.",
    steps: ["F = k q₁q₂ / r²", "= 8.99×10⁹ × (10⁻⁶)² / 1²", "≈ 9.0×10⁻³ N"],
  },
  37: {
    given: "A current of 2 A through a 10 Ω resistor.",
    steps: ["V = I × R", "= 2 × 10", "= 20 V"],
  },
  40: {
    given: "A 1 m² surface radiating at 300 K.",
    steps: ["P = σ A T⁴", "= 5.67×10⁻⁸ × 1 × 300⁴", "≈ 459 W"],
  },
  51: {
    given: "$1000 invested at 5% for 10 years.",
    steps: ["A = P(1 + r)ᵗ", "= 1000 × 1.05¹⁰", "≈ $1629"],
  },
  62: {
    given: "Events at an average rate λ = 3; find P(k = 2).",
    steps: ["P = λᵏ e⁻λ / k!", "= 3² × e⁻³ / 2!", "≈ 0.224"],
  },
  64: {
    given: "A 20 N/m spring stretched 2 cm.",
    steps: ["F = −k x", "= −20 × 0.02", "= −0.4 N"],
  },
  70: {
    given: "A planet orbiting 4 AU from a 1 M☉ star.",
    steps: ["T = √(a³ / M)", "= √(4³ / 1)", "= √64 = 8 years"],
  },
  30: {
    given: "A solution with ε = 5000 M⁻¹cm⁻¹, in a 1 cm cell, at 0.001 M.",
    steps: ["A = ε l c", "= 5000 × 1 × 0.001", "= 5"],
  },
  31: {
    given: "A reaction with ΔH = −100 kJ/mol at 298 K, ΔS = 50 J/mol·K.",
    steps: ["ΔG = ΔH − T·ΔS", "= −100 − (298 × 50/1000)", "= −100 − 14.9 = −114.9 kJ/mol"],
  },
  47: {
    given: "An enzyme with V_max = 50, K_m = 10 µM, at [S] = 10 µM.",
    steps: ["v = V_max·[S] / (K_m + [S])", "= 50 × 10 / (10 + 10)", "= 500 / 20 = 25"],
  },
  55: {
    given: "Risk-free 3%, market 10%, an asset with beta = 1.5.",
    steps: ["E(Rᵢ) = R_f + β(R_m − R_f)", "= 0.03 + 1.5 × (0.10 − 0.03)", "= 0.03 + 0.105 = 13.5%"],
  },
  58: {
    given: "A dataset with a standard deviation of 5.",
    steps: ["variance = σ²", "= 5²", "= 25"],
  },
  65: {
    given: "Steel (E = 200 GPa) under a strain of 0.005.",
    steps: ["σ = E · ε", "= 200 × 0.005", "= 1 GPa"],
  },
  69: {
    given: "Water (ρ = 1000) flowing at 2 m/s through a 1 m pipe, µ = 0.001 Pa·s.",
    steps: ["Re = ρ v L / µ", "= 1000 × 2 × 1 / 0.001", "= 2,000,000 (turbulent)"],
  },
  71: {
    given: "A galaxy 100 Mpc away, with H₀ = 70 km/s/Mpc.",
    steps: ["v = H₀ · d", "= 70 × 100", "= 7000 km/s"],
  },
  72: {
    given: "A black hole of one solar mass.",
    steps: ["r_s ≈ 2.95 km × (M / M☉)", "= 2.95 × 1", "≈ 2.95 km"],
  },
  73: {
    given: "A Sun-like star: R = 1 R☉, T = 5772 K.",
    steps: ["L/L☉ = R² · (T/5772)⁴", "= 1² × (5772/5772)⁴", "= 1 (one solar luminosity)"],
  },
}

/** The worked example for an equation, or null if none is curated. */
export function getWorkedExample(equationId: number): WorkedExample | null {
  return workedExamples[equationId] ?? null
}
