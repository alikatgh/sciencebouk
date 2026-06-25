/**
 * Curated "Did you know?" facts for the data-driven subject equations (ids
 * 18-81). Short, accurate, surprising historical/scientific tidbits that enrich
 * the lesson without competing with the equation's own hook copy. Every subject
 * equation has one, so the Learn-more panel's fact tab is always available.
 *
 * Pure data + a typed accessor — trivially testable, no runtime dependencies.
 */

export const equationFacts: Record<number, string> = {
  // ---- Computer Science ----
  18: "Big-O notation was popularised in computer science by Donald Knuth, but the symbol itself dates back to an 1894 number-theory textbook by Paul Bachmann.",
  19: "The first binary search was published in 1946, but a bug-free version didn't appear in print until 1962 — even expert programmers get the midpoint and bounds wrong.",
  20: "The Master Theorem reads off the running time of most divide-and-conquer algorithms at a glance, by comparing the work of splitting a problem to the work of recombining it.",
  21: "Bayes never published his theorem. His friend Richard Price found it among his papers after Bayes died in 1761, and published it two years later.",
  22: "Gradient descent was described by Augustin-Louis Cauchy in 1847 — over a century before it became the workhorse that trains every neural network.",
  23: "Softmax turns raw scores into probabilities that sum to 1 — it's the final layer of nearly every modern classifier, from spam filters to large language models.",
  24: "Cross-entropy measures how many extra bits you waste encoding reality with the wrong model — which is exactly why it works as a training loss.",
  25: "The 2017 paper that introduced this attention mechanism was titled 'Attention Is All You Need' — and it launched the transformer era of modern AI.",
  // ---- Chemistry ----
  26: "At room temperature the air molecules around you are zipping past at roughly 500 m/s — faster than a passenger jet at cruising speed.",
  27: "Svante Arrhenius won the 1903 Nobel Prize; his equation explains the rule of thumb that many reactions roughly double in rate for every 10 °C rise in temperature.",
  28: "Your blood is buffered to a pH of about 7.4; a shift of just 0.4 in either direction can be life-threatening. The Henderson–Hasselbalch equation describes that balance.",
  29: "The Nernst equation sets the voltage of every battery and every nerve cell — Walther Nernst won the 1920 Nobel Prize in Chemistry for this kind of work.",
  30: "The Beer–Lambert law is why a darker solution absorbs more light — the principle behind the spectrophotometers in every chemistry and biology lab.",
  31: "Gibbs free energy predicts whether a reaction proceeds on its own: if ΔG is negative it's spontaneous, no matter how slowly it actually happens.",
  32: "A reaction's 'order' — the exponents in its rate law — can't be read off the balanced equation; it has to be measured experimentally.",
  33: "The Clausius–Clapeyron relation explains why water boils at a lower temperature up a mountain — less pressure makes it easier for molecules to escape as vapour.",
  // ---- Physics ----
  34: "Newton actually wrote his second law as F = dp/dt — force equals the rate of change of momentum. F = ma is the special case when mass is constant.",
  35: "Because kinetic energy grows with the square of speed, a 60 mph crash carries four times the energy of a 30 mph one — the reason speed limits matter so much.",
  36: "The electric force between two electrons is about 10⁴² times stronger than the gravitational pull between them — gravity only wins at astronomical scales.",
  37: "Ohm's 1827 paper was so poorly received that he resigned his teaching post. Recognition came decades later — and the unit of resistance now carries his name.",
  38: "Snell's law explains why a straw looks bent in a glass of water, and how lenses focus light. Ibn Sahl described it in 984 AD, centuries before Snell.",
  39: "The Doppler effect — the drop in an ambulance siren's pitch as it passes — also lets astronomers measure how fast distant galaxies are receding.",
  40: "Radiated power scales as T⁴, so doubling a star's surface temperature makes it shine sixteen times brighter.",
  41: "Louis de Broglie proposed in his 1924 PhD thesis that all matter has a wavelength; electrons really do diffract like waves, as experiments soon confirmed.",
  42: "Heisenberg's uncertainty principle isn't about clumsy instruments — it's a fundamental limit: a particle simply does not have an exact position and momentum at once.",
  43: "Max Planck introduced E = hν in 1900 to resolve a crisis in physics, reluctantly proposing that energy comes in discrete 'quanta' — and starting quantum theory.",
  44: "The Lorentz force bends moving charges in a magnetic field — it's what makes electric motors spin and what steers particles around accelerators.",
  // ---- Biology ----
  45: "The Hardy–Weinberg principle (1908) gives the baseline gene frequencies a population keeps when no evolution is acting — the null hypothesis of population genetics.",
  46: "Pierre Verhulst introduced the logistic curve in 1838 to model Belgium's population growth — and coined the word 'logistic' for it.",
  47: "The Michaelis–Menten equation dates to 1913 and is more than a century old, yet it is still the foundation of modern enzyme kinetics.",
  48: "A single human cell holds about 2 metres of DNA — roughly 3 billion base pairs, A always with T and G with C — packed into a nucleus a few microns across.",
  49: "The Goldman equation extends Nernst to several ions at once, predicting the roughly −70 mV resting voltage your neurons hold, poised to fire.",
  50: "The Lotka–Volterra equations predict predator and prey populations rising and falling in endless cycles — first inspired by fish-catch data after World War I.",
  // ---- Economics ----
  51: "Compound interest is often called the most powerful force in finance: at 7% a year, money roughly doubles every decade without you lifting a finger.",
  52: "Supply and demand is the 'invisible hand' in one diagram: price slides until the quantity buyers want equals the quantity sellers offer — the market-clearing point.",
  53: "GDP = C + I + G + (X − M) adds up everything an economy spends — consumption, investment, government, and net exports — to measure its total output.",
  54: "The Fisher equation separates the interest you earn from the inflation that eats it: your 'real' return is what's left after prices rise.",
  55: "CAPM earned a Nobel Prize: it says an asset's expected return rises with its 'beta' — how strongly it swings with the overall market.",
  56: "John Nash's equilibrium — dramatised in 'A Beautiful Mind' — is a set of strategies where no player can do better by changing theirs alone.",
  57: "The Cobb–Douglas function, fitted to US data in 1928, captures how output depends on capital and labour, and how readily one can substitute for the other.",
  // ---- Statistics ----
  58: "About 68% of a normal distribution lies within one standard deviation of the mean and 95% within two — the famous 68–95–99.7 rule.",
  59: "Least-squares regression was developed by Gauss and Legendre around 1805 — originally to predict the orbit of the newly discovered dwarf planet Ceres.",
  60: "Karl Pearson introduced the chi-square test in 1900; it remains one of the most widely used statistical tests for comparing observed and expected counts.",
  61: "The central limit theorem is why the bell curve is everywhere: average enough independent things and the result is normal, whatever they started out as.",
  62: "The Poisson distribution was famously used to model the number of Prussian cavalrymen killed each year by horse kicks — a classic study of rare events.",
  63: "A Markov chain remembers only the present, not the path that led there — the idea behind Google's original PageRank and your phone's predictive text.",
  // ---- Engineering ----
  64: "Robert Hooke published his law of elasticity in 1678 as an anagram — 'ceiiinosssttuv' — so he could claim priority while keeping the discovery secret.",
  65: "Young's modulus measures stiffness: steel's is about 200 GPa, rubber's a thousand times smaller — which is why one barely bends and the other stretches.",
  66: "Bernoulli's principle — faster flow means lower pressure — helps explain how wings generate lift and why a shower curtain billows inward.",
  67: "A transfer function captures how a system responds to any input — the foundation of control engineering, from a home thermostat to an aircraft autopilot.",
  68: "The Nyquist criterion lets engineers judge whether a feedback loop is stable just by plotting how it responds across frequencies.",
  69: "The Reynolds number predicts whether flow is smooth or turbulent — the same number governs a creeping bacterium and a roaring jet, at vastly different scales.",
  // ---- Astronomy ----
  70: "Kepler found his third law in 1619 after years of calculation, writing that he 'felt carried away by an unutterable rapture' at the result.",
  71: "Hubble's law implies an expanding universe — but measurements of the constant H₀ still disagree by about 10%, an open problem known as the 'Hubble tension.'",
  72: "Karl Schwarzschild derived the radius of a black hole in 1916 while serving on the WWI Eastern Front; he died of illness just months later.",
  73: "The red supergiant Betelgeuse is so luminous and large that, placed where the Sun is, its surface would reach beyond the orbit of Mars.",
  74: "The Drake equation doesn't give an answer — it organises our ignorance, multiplying the factors that decide how many civilisations we might ever hear from.",
  75: "The Friedmann equations, derived from Einstein's relativity, describe the entire expanding universe — and first revealed that it cannot stand still.",
  // ---- Linear Algebra ----
  76: "Multiplying two n×n matrices the naive way takes n³ steps; Strassen's 1969 trick beat that, sparking a race for faster algorithms that is still going today.",
  77: "Eigenvectors are the directions a transformation only stretches, never rotates — the backbone of PageRank, quantum mechanics, and facial recognition.",
  78: "The determinant ad − bc is the factor by which a matrix scales area; if it's zero, the transformation squashes space flat and can't be undone.",
  79: "The SVD underlies image compression and recommender systems — it finds the few directions that capture most of a dataset's variation.",
  80: "The dot product measures how much two vectors point the same way; zero means perpendicular. It powers lighting in 3D games and relevance in search.",
  81: "The cross product gives a vector perpendicular to two others, with length equal to the area of the parallelogram they span — the basis of torque and rotation.",
}

/** The curated fact for an equation, or null if none exists. */
export function getEquationFact(equationId: number): string | null {
  return equationFacts[equationId] ?? null
}
