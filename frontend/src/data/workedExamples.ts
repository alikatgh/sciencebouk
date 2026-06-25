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
  24: {
    given: "A model assigns probability q = 0.5 to the true outcome.",
    steps: ["H = −ln q", "= −ln(0.5)", "≈ 0.693 nats"],
  },
  43: {
    given: "Green light at ν = 5 (in units of 10¹⁴ Hz).",
    steps: ["E = h·ν", "≈ 0.414 eV × 5", "≈ 2.07 eV"],
  },
  45: {
    given: "An allele frequency p = 0.5.",
    steps: ["2pq = 2·p·(1 − p)", "= 2 × 0.5 × 0.5", "= 0.5 (half the population are carriers)"],
  },
  53: {
    given: "Consumption 60, investment 15, government 20.",
    steps: ["Y = C + I + G", "= 60 + 15 + 20", "= 95"],
  },
  54: {
    given: "A real rate of 2% with 3% inflation.",
    steps: ["1 + i = (1 + r)(1 + π)", "= 1.02 × 1.03", "i ≈ 5.06%"],
  },
  57: {
    given: "Capital K = 50, labour L = 50, α = 0.3.",
    steps: ["Y = K^α · L^(1−α)", "= 50^0.3 × 50^0.7", "= 50"],
  },
  60: {
    given: "Observed count 60 where 50 was expected.",
    steps: ["χ² = (O − E)² / E", "= (60 − 50)² / 50", "= 100 / 50 = 2"],
  },
  78: {
    given: "The matrix [[2, 1], [1, 2]].",
    steps: ["det = ad − bc", "= 2×2 − 1×1", "= 4 − 1 = 3"],
  },
  80: {
    given: "Two vectors of length 5, 60° apart.",
    steps: ["a·b = |a||b|cos θ", "= 5 × 5 × cos 60°", "= 25 × 0.5 = 12.5"],
  },
  81: {
    given: "Two vectors of length 5, perpendicular (90°).",
    steps: ["|a×b| = |a||b|sin θ", "= 5 × 5 × sin 90°", "= 25 × 1 = 25"],
  },
  22: {
    given: "Starting at θ = 4 with learning rate α = 0.1 (loss J = θ²).",
    steps: ["θ′ = θ(1 − 2α)", "= 4 × (1 − 0.2)", "= 3.2 (one step toward 0)"],
  },
  23: {
    given: "Class scores z = [2, 1, 0].",
    steps: ["P(z₁) = e² / (e² + e¹ + e⁰)", "= 7.39 / (7.39 + 2.72 + 1)", "≈ 0.665"],
  },
  27: {
    given: "Activation energy 50 kJ/mol at 298 K.",
    steps: ["k/A = e^(−Eₐ/RT)", "= e^(−50000 / (8.314 × 298))", "≈ 1.7 × 10⁻⁹"],
  },
  29: {
    given: "A cell with E° = 1.1 V, n = 2, at equilibrium-neutral Q = 1.",
    steps: ["E = E° − (RT/nF)·ln Q", "= 1.1 − (…)·ln(1)", "= 1.1 V  (ln 1 = 0)"],
  },
  41: {
    given: "A particle with mass 1 and speed 1 (SI units).",
    steps: ["λ = h / (m·v)", "= 6.63×10⁻³⁴ / (1 × 1)", "≈ 6.63×10⁻³⁴ m"],
  },
  59: {
    given: "A fit with intercept β₀ = 0 and slope β₁ = 1, predicting at x = 1.",
    steps: ["ŷ = β₀ + β₁·x", "= 0 + 1 × 1", "= 1"],
  },
  67: {
    given: "A first-order system with gain K = 1 and pole at 1.",
    steps: ["DC gain = K / pole", "= 1 / 1", "= 1"],
  },
  68: {
    given: "An open loop with no unstable poles (P = 0) and N = 0 encirclements.",
    steps: ["Z = N + P", "= 0 + 0", "= 0  (closed loop stable)"],
  },
  76: {
    given: "Multiplying two 3×3 matrices the naive way.",
    steps: ["multiplications = n³", "= 3³", "= 27"],
  },
  79: {
    given: "Singular values σ₁ = 5 and σ₂ = 2.",
    steps: ["κ = σ₁ / σ₂", "= 5 / 2", "= 2.5 (condition number)"],
  },
}

/** The worked example for an equation, or null if none is curated. */
export function getWorkedExample(equationId: number): WorkedExample | null {
  return workedExamples[equationId] ?? null
}
