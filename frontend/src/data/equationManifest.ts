export interface EquationSummary {
  id: number
  title: string
  formula: string
  author: string
  year: string
  category: string
}

export const equationManifest: EquationSummary[] = [
  { id: 1, title: "Pythagoras's Theorem", formula: "a^2 + b^2 = c^2", author: "Pythagoras", year: "530 BC", category: "Geometry" },
  { id: 2, title: "Logarithms", formula: "\\log xy = \\log x + \\log y", author: "John Napier", year: "1610", category: "Algebra" },
  { id: 3, title: "Calculus", formula: "\\frac{df}{dt}=\\lim_{h\\to0}\\frac{f(t+h)-f(t)}{h}", author: "Newton", year: "1668", category: "Calculus" },
  { id: 4, title: "Law of Gravity", formula: "F=G\\frac{m_1m_2}{r^2}", author: "Newton", year: "1687", category: "Physics" },
  { id: 5, title: "Wave Equation", formula: "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}", author: "J. d'Alembert", year: "1746", category: "Physics" },
  { id: 6, title: "The Square Root of Minus One", formula: "i^2=-1", author: "Euler", year: "1750", category: "Complex Numbers" },
  { id: 7, title: "Euler's Formula for Polyhedra", formula: "V-E+F=2", author: "Euler", year: "1751", category: "Topology" },
  { id: 8, title: "Normal Distribution", formula: "\\Phi(x)=\\frac{1}{\\sqrt{2\\pi\\sigma}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", author: "C. F. Gauss", year: "1810", category: "Statistics" },
  { id: 9, title: "Fourier Transform", formula: "f(\\omega)=\\int_{-\\infty}^{\\infty}f(x)e^{-2\\pi i x\\omega}\\,dx", author: "J. Fourier", year: "1822", category: "Signal Processing" },
  { id: 10, title: "Navier-Stokes Equation", formula: "\\rho\\left(\\frac{\\partial \\mathbf{v}}{\\partial t}+\\mathbf{v}\\cdot\\nabla\\mathbf{v}\\right)=-\\nabla p+\\nabla\\cdot\\mathbf{T}+\\mathbf{f}", author: "Navier, Stokes", year: "1845", category: "Fluid Dynamics" },
  { id: 11, title: "Maxwell's Equations", formula: "\\nabla\\cdot\\mathbf{E}=0,\\;\\nabla\\times\\mathbf{E}=-\\frac{1}{c}\\frac{\\partial \\mathbf{H}}{\\partial t}", author: "J. C. Maxwell", year: "1865", category: "Electromagnetism" },
  { id: 12, title: "Second Law of Thermodynamics", formula: "dS\\ge0", author: "L. Boltzmann", year: "1874", category: "Thermodynamics" },
  { id: 13, title: "Relativity", formula: "E=mc^2", author: "Einstein", year: "1905", category: "Physics" },
  { id: 14, title: "Schrodinger's Equation", formula: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi=H\\Psi", author: "E. Schrodinger", year: "1927", category: "Quantum Mechanics" },
  { id: 15, title: "Information Theory", formula: "H=-\\sum p(x)\\log p(x)", author: "C. Shannon", year: "1949", category: "Information" },
  { id: 16, title: "Chaos Theory", formula: "x_{t+1}=k x_t(1-x_t)", author: "R. May", year: "1975", category: "Dynamical Systems" },
  { id: 17, title: "Black-Scholes Equation", formula: "\\frac{1}{2}\\sigma^2S^2\\frac{\\partial^2V}{\\partial S^2}+rS\\frac{\\partial V}{\\partial S}+\\frac{\\partial V}{\\partial t}-rV=0", author: "Black, Scholes", year: "1990", category: "Finance" },
]

export function getEquationSummary(id: number): EquationSummary | null {
  return equationManifest.find((equation) => equation.id === id) ?? null
}
