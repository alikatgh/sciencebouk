/**
 * One-question concept checks for the data-driven subject equations (ids 18-81).
 * Each is a short multiple-choice question that tests *understanding* of the
 * relationship the sliders demonstrate, with an explanation revealed after the
 * learner answers. Equations without a curated check simply don't show the card.
 *
 * Pure data + a typed accessor — the interactive component (`ConceptCheck.tsx`)
 * owns the answer state. Easy to unit-test for integrity.
 */

export interface ConceptCheck {
  question: string
  options: string[]
  /** Index into `options` of the correct answer. */
  correctIndex: number
  explanation: string
}

export const conceptChecks: Record<number, ConceptCheck> = {
  21: {
    question: "A test is 99% accurate for a disease 1 in 1000 people have. You test positive. Is it likely you're sick?",
    options: ["Yes — about 99% likely", "No — most positives are false alarms", "Exactly 50/50"],
    correctIndex: 1,
    explanation: "With such a low base rate, false positives vastly outnumber true positives — the prior dominates. This is the base-rate fallacy.",
  },
  26: {
    question: "You double the absolute temperature of gas in a sealed, rigid container. The pressure…",
    options: ["doubles", "halves", "stays the same"],
    correctIndex: 0,
    explanation: "At constant volume, P ∝ T, so doubling the absolute temperature doubles the pressure.",
  },
  28: {
    question: "A buffer resists pH change best when the pH is…",
    options: ["far below its pKa", "near its pKa", "far above its pKa"],
    correctIndex: 1,
    explanation: "Buffering capacity peaks within about one unit of the pKa, where [A⁻] and [HA] are comparable.",
  },
  34: {
    question: "You push two carts with equal force, but one has twice the mass. Which accelerates faster?",
    options: ["The lighter cart", "The heavier cart", "Both the same"],
    correctIndex: 0,
    explanation: "a = F/m, so for the same force the lighter cart accelerates twice as much.",
  },
  35: {
    question: "A car doubles its speed. Its kinetic energy…",
    options: ["doubles", "quadruples", "is unchanged"],
    correctIndex: 1,
    explanation: "KE = ½mv² grows with the square of speed, so doubling v multiplies the energy by four.",
  },
  36: {
    question: "You double the distance between two charges. The force between them becomes…",
    options: ["half", "one quarter", "double"],
    correctIndex: 1,
    explanation: "Coulomb's force ∝ 1/r², so doubling r reduces the force to one quarter.",
  },
  37: {
    question: "Hold the voltage fixed and increase the resistance. The current…",
    options: ["increases", "decreases", "stays the same"],
    correctIndex: 1,
    explanation: "I = V/R, so for a fixed voltage a larger resistance means a smaller current.",
  },
  40: {
    question: "You double a star's surface temperature. Its radiated power increases by a factor of…",
    options: ["2", "8", "16"],
    correctIndex: 2,
    explanation: "Stefan–Boltzmann power ∝ T⁴, and 2⁴ = 16.",
  },
  46: {
    question: "In logistic growth, the population grows fastest when its size is…",
    options: ["near zero", "about half the carrying capacity", "at the carrying capacity"],
    correctIndex: 1,
    explanation: "dN/dt peaks at N = K/2, then slows as the population approaches the ceiling K.",
  },
  47: {
    question: "At very high substrate concentration, an enzyme's reaction rate…",
    options: ["keeps rising in proportion to substrate", "approaches a maximum (V_max)", "falls to zero"],
    correctIndex: 1,
    explanation: "The enzyme saturates: every active site is busy, so the rate plateaus at V_max.",
  },
  51: {
    question: "At 7% annual interest, roughly how long does money take to double?",
    options: ["about 3 years", "about 10 years", "about 30 years"],
    correctIndex: 1,
    explanation: "The rule of 72: 72 ÷ 7 ≈ 10 years for money to double under compounding.",
  },
  62: {
    question: "The Poisson distribution best models…",
    options: ["the average of many measurements", "the count of rare independent events", "a single yes/no outcome"],
    correctIndex: 1,
    explanation: "Poisson describes how many independent events occur in an interval when they happen at a constant average rate.",
  },
  64: {
    question: "You stretch a spring twice as far. The restoring force is…",
    options: ["unchanged", "twice as large", "four times as large"],
    correctIndex: 1,
    explanation: "Hooke's law F = −kx is linear, so doubling the displacement doubles the force.",
  },
  70: {
    question: "A planet four times farther from the Sun has an orbital period that is…",
    options: ["4× longer", "8× longer", "16× longer"],
    correctIndex: 1,
    explanation: "Kepler's third law: T² ∝ a³, so a = 4 gives T = √(4³) = √64 = 8.",
  },
  73: {
    question: "Two stars share the same temperature, but one has twice the radius. It is … as luminous.",
    options: ["twice", "four times", "equally"],
    correctIndex: 1,
    explanation: "Luminosity ∝ R² (at fixed temperature), so twice the radius gives four times the luminosity.",
  },
  30: {
    question: "You double the concentration of a coloured solution. Its absorbance…",
    options: ["doubles", "halves", "stays the same"],
    correctIndex: 0,
    explanation: "A = εlc is linear in concentration, so doubling c doubles the absorbance.",
  },
  31: {
    question: "A reaction proceeds on its own (spontaneously) when ΔG is…",
    options: ["positive", "negative", "exactly zero"],
    correctIndex: 1,
    explanation: "A negative Gibbs free-energy change means the reaction is thermodynamically favourable.",
  },
  38: {
    question: "Light passes from air into glass, a slower medium. It bends…",
    options: ["toward the normal", "away from the normal", "not at all"],
    correctIndex: 0,
    explanation: "Entering a slower (higher-index) medium, light bends toward the surface normal.",
  },
  39: {
    question: "A train whistle, as the train rushes toward you, sounds…",
    options: ["higher-pitched", "lower-pitched", "unchanged"],
    correctIndex: 0,
    explanation: "An approaching source compresses the sound waves, raising the perceived frequency.",
  },
  55: {
    question: "An asset with beta 2 (twice as volatile as the market) should offer…",
    options: ["a lower expected return", "a higher expected return", "the same return"],
    correctIndex: 1,
    explanation: "Higher beta means more market risk, so investors demand a higher expected return (CAPM).",
  },
  58: {
    question: "In a normal distribution, roughly what fraction of data lies within two standard deviations of the mean?",
    options: ["68%", "95%", "99.7%"],
    correctIndex: 1,
    explanation: "The 68–95–99.7 rule: about 95% of values fall within two standard deviations.",
  },
  61: {
    question: "Averaging more independent samples makes the distribution of the sample mean…",
    options: ["wider", "narrower", "unchanged"],
    correctIndex: 1,
    explanation: "The standard error shrinks as 1/√n, so the mean's distribution narrows as n grows.",
  },
  69: {
    question: "A high Reynolds number indicates flow that is…",
    options: ["smooth and laminar", "turbulent", "completely still"],
    correctIndex: 1,
    explanation: "A high Reynolds number means inertia dominates viscosity — the flow becomes turbulent.",
  },
  71: {
    question: "A galaxy twice as far away recedes from us…",
    options: ["at the same speed", "twice as fast", "half as fast"],
    correctIndex: 1,
    explanation: "Hubble's law v = H₀d is linear, so twice the distance means twice the recession speed.",
  },
  72: {
    question: "You double a black hole's mass. Its event-horizon radius…",
    options: ["doubles", "quadruples", "halves"],
    correctIndex: 0,
    explanation: "The Schwarzschild radius r_s = 2GM/c² is linear in mass, so doubling M doubles it.",
  },
}

/** The concept check for an equation, or null if none is curated. */
export function getConceptCheck(equationId: number): ConceptCheck | null {
  return conceptChecks[equationId] ?? null
}
