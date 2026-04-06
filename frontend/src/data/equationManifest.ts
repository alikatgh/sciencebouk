export interface EquationSummary {
  id: number
  title: string
  formula: string
  author: string
  year: string
  category: string
}

export const equationManifest: EquationSummary[] = [
  { id: 1, title: "Pythagoras's Theorem", formula: "a^2 + b^2 = c^2", author: "Pythagoras", year: "530 BC", category: "geometry" },
  { id: 2, title: "Logarithms", formula: "\\log xy = \\log x + \\log y", author: "John Napier", year: "1610", category: "algebra" },
  { id: 3, title: "Calculus", formula: "\\frac{df}{dt}=\\lim_{h\\to0}\\frac{f(t+h)-f(t)}{h}", author: "Newton", year: "1668", category: "calculus" },
  { id: 4, title: "Law of Gravity", formula: "F=G\\frac{m_1m_2}{r^2}", author: "Newton", year: "1687", category: "physics" },
  { id: 5, title: "Wave Equation", formula: "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}", author: "J. d'Alembert", year: "1746", category: "physics" },
  { id: 6, title: "The Square Root of Minus One", formula: "i^2=-1", author: "Euler", year: "1750", category: "complex_numbers" },
  { id: 7, title: "Euler's Formula for Polyhedra", formula: "V-E+F=2", author: "Euler", year: "1751", category: "topology" },
  { id: 8, title: "Normal Distribution", formula: "\\Phi(x)=\\frac{1}{\\sqrt{2\\pi\\sigma}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", author: "C. F. Gauss", year: "1810", category: "statistics" },
  { id: 9, title: "Fourier Transform", formula: "f(\\omega)=\\int_{-\\infty}^{\\infty}f(x)e^{-2\\pi i x\\omega}\\,dx", author: "J. Fourier", year: "1822", category: "signal_processing" },
  { id: 10, title: "Navier-Stokes Equation", formula: "\\rho\\left(\\frac{\\partial \\mathbf{v}}{\\partial t}+\\mathbf{v}\\cdot\\nabla\\mathbf{v}\\right)=-\\nabla p+\\nabla\\cdot\\mathbf{T}+\\mathbf{f}", author: "Navier, Stokes", year: "1845", category: "fluid_dynamics" },
  { id: 11, title: "Maxwell's Equations", formula: "\\nabla\\cdot\\mathbf{E}=0,\\;\\nabla\\times\\mathbf{E}=-\\frac{1}{c}\\frac{\\partial \\mathbf{H}}{\\partial t}", author: "J. C. Maxwell", year: "1865", category: "electromagnetism" },
  { id: 12, title: "Second Law of Thermodynamics", formula: "dS\\ge0", author: "L. Boltzmann", year: "1874", category: "thermodynamics" },
  { id: 13, title: "Relativity", formula: "E=mc^2", author: "Einstein", year: "1905", category: "physics" },
  { id: 14, title: "Schrodinger's Equation", formula: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi=H\\Psi", author: "E. Schrodinger", year: "1927", category: "quantum_mechanics" },
  { id: 15, title: "Information Theory", formula: "H=-\\sum p(x)\\log p(x)", author: "C. Shannon", year: "1949", category: "information" },
  { id: 16, title: "Chaos Theory", formula: "x_{t+1}=r x_t(1-x_t)", author: "R. May", year: "1975", category: "dynamical_systems" },
  { id: 17, title: "Black-Scholes Equation", formula: "\\frac{1}{2}\\sigma^2S^2\\frac{\\partial^2V}{\\partial S^2}+rS\\frac{\\partial V}{\\partial S}+\\frac{\\partial V}{\\partial t}-rV=0", author: "Black, Scholes", year: "1973", category: "finance" },
]

const searchableEquationManifest = equationManifest.map((equation) => ({
  equation,
  searchText: `${equation.title} ${equation.author} ${equation.category}`.toLowerCase(),
}))

export const equationSummaryById = new Map<number, EquationSummary>(
  equationManifest.map((equation) => [equation.id, equation]),
)

export const equationIndexById = new Map<number, number>(
  equationManifest.map((equation, index) => [equation.id, index]),
)

export const equationIdSet = new Set<number>(equationManifest.map((equation) => equation.id))

export function getEquationSummary(id: number): EquationSummary | null {
  return equationSummaryById.get(id) ?? null
}

export function hasEquation(id: number): boolean {
  return equationIdSet.has(id)
}

export function searchEquations(query: string): EquationSummary[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return equationManifest

  return searchableEquationManifest
    .filter((entry) => entry.searchText.includes(normalizedQuery))
    .map((entry) => entry.equation)
}
