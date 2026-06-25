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
  27: {
    question: "You raise the temperature of a reaction. Its rate…",
    options: ["decreases", "increases", "is unaffected"],
    correctIndex: 1,
    explanation: "Higher temperature gives more molecules the energy to clear the activation barrier, speeding the reaction (Arrhenius).",
  },
  29: {
    question: "As products build up and the reaction quotient Q rises, a cell's voltage…",
    options: ["rises", "falls", "stays the same"],
    correctIndex: 1,
    explanation: "E = E⁰ − (RT/nF)·ln Q, so a larger Q lowers the cell potential.",
  },
  41: {
    question: "A heavier particle moving at the same speed has a de Broglie wavelength that is…",
    options: ["longer", "shorter", "identical"],
    correctIndex: 1,
    explanation: "λ = h/mv, so more mass means a shorter wavelength.",
  },
  42: {
    question: "Measuring a particle's position more precisely makes its momentum…",
    options: ["more certain", "less certain", "unaffected"],
    correctIndex: 1,
    explanation: "Δx·Δp ≥ ℏ/2 — pinning down position necessarily blurs momentum.",
  },
  43: {
    question: "Higher-frequency (bluer) light carries … energy per photon.",
    options: ["less", "more", "the same"],
    correctIndex: 1,
    explanation: "E = hν: a photon's energy is proportional to its frequency.",
  },
  65: {
    question: "Under the same strain, a stiffer material (higher Young's modulus) feels…",
    options: ["less stress", "more stress", "the same stress"],
    correctIndex: 1,
    explanation: "σ = E·ε, so a higher modulus produces more stress for the same strain.",
  },
  66: {
    question: "Where a fluid speeds up, its pressure…",
    options: ["rises", "drops", "is unchanged"],
    correctIndex: 1,
    explanation: "Bernoulli's principle: faster flow comes with lower pressure.",
  },
  78: {
    question: "A 2×2 matrix whose determinant is zero…",
    options: ["scales area up", "cannot be inverted", "purely rotates space"],
    correctIndex: 1,
    explanation: "A zero determinant collapses area to nothing, so the matrix is singular — it has no inverse.",
  },
  80: {
    question: "Two perpendicular vectors have a dot product of…",
    options: ["their lengths multiplied", "zero", "one"],
    correctIndex: 1,
    explanation: "a·b = |a||b|cos θ, and cos 90° = 0, so perpendicular vectors give zero.",
  },
  57: {
    question: "Cobb-Douglas output increases when you add more…",
    options: ["only capital", "only labour", "either capital or labour"],
    correctIndex: 2,
    explanation: "Output rises with more of either input (with diminishing returns to each).",
  },
  18: {
    question: "As n grows large, which complexity grows the fastest?",
    options: ["O(n²)", "O(2ⁿ)", "O(n log n)"],
    correctIndex: 1,
    explanation: "Exponential 2ⁿ eventually dwarfs any polynomial, however large its degree.",
  },
  19: {
    question: "Binary search requires the data to be…",
    options: ["sorted", "unsorted", "all positive"],
    correctIndex: 0,
    explanation: "Binary search only works on sorted data — that's how it can discard half each step.",
  },
  20: {
    question: "Merge sort splits into two halves and merges in linear time. Its complexity is…",
    options: ["O(n)", "O(n log n)", "O(n²)"],
    correctIndex: 1,
    explanation: "With a=2, b=2, f(n)=n, the Master Theorem gives the balanced case O(n log n).",
  },
  22: {
    question: "If the learning rate is far too large, gradient descent tends to…",
    options: ["converge faster", "overshoot and diverge", "stop moving"],
    correctIndex: 1,
    explanation: "Steps that are too big bounce out of the valley instead of settling into the minimum.",
  },
  23: {
    question: "The outputs of softmax always…",
    options: ["sum to 1", "are all equal", "are negative"],
    correctIndex: 0,
    explanation: "Softmax produces a probability distribution, so its outputs sum to 1.",
  },
  24: {
    question: "Cross-entropy loss is smallest when the model is…",
    options: ["confident and wrong", "confident and right", "completely unsure"],
    correctIndex: 1,
    explanation: "Loss approaches 0 when the model assigns probability near 1 to the true outcome.",
  },
  25: {
    question: "The √dₖ term in scaled dot-product attention is there to…",
    options: ["add randomness", "keep the scores from exploding", "mask the future"],
    correctIndex: 1,
    explanation: "Dividing by √dₖ stops large dot products from saturating the softmax.",
  },
  32: {
    question: "A reaction's order — the exponent in its rate law — is found from…",
    options: ["the balanced equation", "experiment", "the temperature"],
    correctIndex: 1,
    explanation: "Reaction order must be measured experimentally; it cannot be read off the balanced equation.",
  },
  33: {
    question: "At high altitude (lower pressure), water boils at a…",
    options: ["higher temperature", "lower temperature", "unchanged temperature"],
    correctIndex: 1,
    explanation: "Less pressure makes it easier for molecules to escape as vapour, lowering the boiling point.",
  },
  44: {
    question: "A magnetic force acts on a charge only when the charge is…",
    options: ["stationary", "moving", "electrically neutral"],
    correctIndex: 1,
    explanation: "The magnetic part of the Lorentz force is qv×B — it vanishes if the charge isn't moving.",
  },
  45: {
    question: "Hardy–Weinberg frequencies stay constant only if there is no…",
    options: ["mutation or selection", "reproduction", "genetic variation"],
    correctIndex: 0,
    explanation: "The equilibrium assumes no evolutionary forces such as selection, mutation, or drift.",
  },
  48: {
    question: "In DNA, adenine (A) always pairs with…",
    options: ["guanine", "thymine", "cytosine"],
    correctIndex: 1,
    explanation: "A pairs with T via two hydrogen bonds; G pairs with C via three.",
  },
  49: {
    question: "At rest, a neuron's membrane potential is dominated by which ion?",
    options: ["sodium", "potassium", "calcium"],
    correctIndex: 1,
    explanation: "At rest the membrane is most permeable to K⁺, so V_m sits near the potassium equilibrium.",
  },
  50: {
    question: "In predator–prey cycles, the predator population peaks…",
    options: ["before the prey peak", "after the prey peak", "at the same time"],
    correctIndex: 1,
    explanation: "Predators grow once prey are abundant, so their peak lags the prey peak.",
  },
  52: {
    question: "If demand rises while supply is unchanged, the equilibrium price…",
    options: ["falls", "rises", "is unchanged"],
    correctIndex: 1,
    explanation: "More demand at every price pushes the market-clearing price upward.",
  },
  53: {
    question: "Which is NOT a component of expenditure GDP?",
    options: ["consumption", "investment", "inflation"],
    correctIndex: 2,
    explanation: "GDP = C + I + G + (X − M); inflation is a price change, not a spending component.",
  },
  54: {
    question: "If inflation rises but your nominal rate is fixed, your real return…",
    options: ["rises", "falls", "is unchanged"],
    correctIndex: 1,
    explanation: "Real return ≈ nominal − inflation, so higher inflation erodes it.",
  },
  56: {
    question: "At a Nash equilibrium, a player who switches strategy alone will…",
    options: ["do better", "do no better", "always do worse"],
    correctIndex: 1,
    explanation: "By definition, no player can improve their payoff by unilaterally deviating.",
  },
  59: {
    question: "Least-squares regression minimises the sum of…",
    options: ["the residuals", "the squared residuals", "the x-values"],
    correctIndex: 1,
    explanation: "It minimises the sum of squared vertical distances from the points to the line.",
  },
  60: {
    question: "A chi-square value near zero means the observed counts…",
    options: ["differ greatly from expected", "match expected closely", "are all zero"],
    correctIndex: 1,
    explanation: "Small χ² means observed ≈ expected — a good fit to the null hypothesis.",
  },
  63: {
    question: "In a Markov chain, the next state depends on…",
    options: ["the entire history", "only the current state", "just the first state"],
    correctIndex: 1,
    explanation: "The Markov property: the future depends only on the present, not the path taken.",
  },
  67: {
    question: "A linear system is stable when its poles lie in the…",
    options: ["right half-plane", "left half-plane", "upper half-plane"],
    correctIndex: 1,
    explanation: "Left-half-plane poles decay over time; right-half-plane poles grow without bound.",
  },
  68: {
    question: "The Nyquist criterion judges stability by counting encirclements of the point…",
    options: ["0", "−1", "+1"],
    correctIndex: 1,
    explanation: "It counts how many times the open-loop response encircles −1 in the complex plane.",
  },
  74: {
    question: "The Drake equation's largest uncertainty is usually…",
    options: ["the star-formation rate", "the lifetime L of civilisations", "the number of planets"],
    correctIndex: 1,
    explanation: "L spans many orders of magnitude and dominates the spread in the estimate.",
  },
  75: {
    question: "A higher matter density makes the universe's expansion…",
    options: ["accelerate forever", "slow down more", "stay unaffected"],
    correctIndex: 1,
    explanation: "More density means more gravity pulling back, decelerating the expansion.",
  },
  76: {
    question: "Two matrices can be multiplied only when…",
    options: ["they are the same size", "their inner dimensions match", "both are square"],
    correctIndex: 1,
    explanation: "For AB, the number of columns of A must equal the number of rows of B.",
  },
  77: {
    question: "An eigenvector of a matrix is a direction that gets…",
    options: ["rotated", "only scaled", "sent to zero"],
    correctIndex: 1,
    explanation: "Av = λv: an eigenvector is merely stretched or shrunk, never rotated.",
  },
  79: {
    question: "Keeping only the largest singular values lets you…",
    options: ["reconstruct exactly", "compress approximately", "rotate the data"],
    correctIndex: 1,
    explanation: "Dropping small singular values gives a low-rank approximation — the basis of compression.",
  },
  81: {
    question: "The cross product of two parallel vectors is…",
    options: ["maximal", "zero", "one"],
    correctIndex: 1,
    explanation: "|a×b| = |a||b|sin θ, and sin 0° = 0, so parallel vectors give zero.",
  },
}

/** The concept check for an equation, or null if none is curated. */
export function getConceptCheck(equationId: number): ConceptCheck | null {
  return conceptChecks[equationId] ?? null
}
