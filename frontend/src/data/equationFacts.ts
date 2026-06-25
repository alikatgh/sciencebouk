/**
 * Curated "Did you know?" facts for the data-driven subject equations (ids
 * 18-81). Short, accurate, surprising historical/scientific tidbits that enrich
 * the lesson without competing with the equation's own hook copy. Equations
 * without a curated fact simply don't show the card (graceful, no placeholder).
 *
 * Pure data + a typed accessor — trivially testable, no runtime dependencies.
 */

export const equationFacts: Record<number, string> = {
  19: "The first binary search was published in 1946, but a bug-free version didn't appear in print until 1962 — even expert programmers get the midpoint and bounds wrong.",
  21: "Bayes never published his theorem. His friend Richard Price found it among his papers after Bayes died in 1761, and published it two years later.",
  23: "Softmax turns raw scores into probabilities that sum to 1 — it's the final layer of nearly every modern classifier, from spam filters to large language models.",
  26: "At room temperature the air molecules around you are zipping past at roughly 500 m/s — faster than a passenger jet at cruising speed.",
  28: "Your blood is buffered to a pH of about 7.4; a shift of just 0.4 in either direction can be life-threatening. The Henderson–Hasselbalch equation describes that balance.",
  34: "Newton actually wrote his second law as F = dp/dt — force equals the rate of change of momentum. F = ma is the special case when mass is constant.",
  35: "Because kinetic energy grows with the square of speed, a 60 mph crash carries four times the energy of a 30 mph one — the reason speed limits matter so much.",
  36: "The electric force between two electrons is about 10⁴² times stronger than the gravitational pull between them — gravity only wins at astronomical scales.",
  37: "Ohm's 1827 paper was so poorly received that he resigned his teaching post. Recognition came decades later — and the unit of resistance now carries his name.",
  40: "Radiated power scales as T⁴, so doubling a star's surface temperature makes it shine sixteen times brighter.",
  46: "Pierre Verhulst introduced the logistic curve in 1838 to model Belgium's population growth — and coined the word 'logistic' for it.",
  47: "The Michaelis–Menten equation dates to 1913 and is more than a century old, yet it is still the foundation of modern enzyme kinetics.",
  51: "Compound interest is often called the most powerful force in finance: at 7% a year, money roughly doubles every decade without you lifting a finger.",
  60: "Karl Pearson introduced the chi-square test in 1900; it remains one of the most widely used statistical tests for comparing observed and expected counts.",
  62: "The Poisson distribution was famously used to model the number of Prussian cavalrymen killed each year by horse kicks — a classic study of rare events.",
  64: "Robert Hooke published his law of elasticity in 1678 as an anagram — 'ceiiinosssttuv' — so he could claim priority while keeping the discovery secret.",
  70: "Kepler found his third law in 1619 after years of calculation, writing that he 'felt carried away by an unutterable rapture' at the result.",
  71: "Hubble's law implies an expanding universe — but measurements of the constant H₀ still disagree by about 10%, an open problem known as the 'Hubble tension.'",
  72: "Karl Schwarzschild derived the radius of a black hole in 1916 while serving on the WWI Eastern Front; he died of illness just months later.",
  73: "The red supergiant Betelgeuse is so luminous and large that, placed where the Sun is, its surface would reach beyond the orbit of Mars.",
}

/** The curated fact for an equation, or null if none exists. */
export function getEquationFact(equationId: number): string | null {
  return equationFacts[equationId] ?? null
}
