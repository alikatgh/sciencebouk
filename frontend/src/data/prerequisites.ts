/**
 * Prerequisite / "builds-on" links between equations — a light learning-path
 * hint. Maps a subject equation to the earlier equation(s) whose idea it rests
 * on, so a learner can jump to the foundation. Each prerequisite carries its own
 * display title (no cross-module lookup needed), and the link is by stable id.
 *
 * Pure data + a typed accessor; the scene renders the links. Curated where the
 * dependency is genuinely illuminating — equations without one show nothing.
 */

export interface Prerequisite {
  id: number
  title: string
}

export const prerequisites: Record<number, Prerequisite[]> = {
  23: [{ id: 24, title: "Cross Entropy" }],
  24: [{ id: 15, title: "Information Theory" }],
  29: [{ id: 31, title: "Gibbs Free Energy" }],
  35: [{ id: 34, title: "Newton's Second Law" }],
  36: [{ id: 4, title: "Law of Gravity" }],
  40: [{ id: 12, title: "Second Law of Thermodynamics" }],
  42: [{ id: 14, title: "Schrödinger's Equation" }],
  43: [{ id: 14, title: "Schrödinger's Equation" }],
  46: [{ id: 16, title: "Chaos Theory" }],
  51: [{ id: 2, title: "Logarithms" }],
  60: [{ id: 8, title: "Normal Distribution" }],
  62: [{ id: 8, title: "Normal Distribution" }],
  70: [{ id: 4, title: "Law of Gravity" }],
  71: [{ id: 13, title: "Relativity" }],
  72: [
    { id: 13, title: "Relativity" },
    { id: 4, title: "Law of Gravity" },
  ],
  73: [{ id: 40, title: "Stefan-Boltzmann Law" }],
}

/** The prerequisite equations for an equation, or null if none are curated. */
export function getPrerequisites(equationId: number): Prerequisite[] | null {
  return prerequisites[equationId] ?? null
}
