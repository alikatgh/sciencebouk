import { equationManifest } from "./equationManifest"

export interface SubjectFormula {
  title: string
  formula: string
  author?: string
  year?: string
  id?: number // links to active equation — null means coming soon
}

export interface Subject {
  slug: string
  name: string
  description: string
  icon: string
  active: boolean
  formulas: SubjectFormula[]
}

export const subjects: Subject[] = [
  {
    slug: "core",
    name: "17 Equations That Changed the World",
    description: "From Pythagoras to Black-Scholes — the foundations of science",
    icon: "pi",
    active: true,
    formulas: [
      { title: "Pythagoras's Theorem", formula: "a^2+b^2=c^2", id: 1 },
      { title: "Logarithms", formula: "\\log xy=\\log x+\\log y", id: 2 },
      { title: "Calculus", formula: "\\frac{df}{dt}=\\lim_{h\\to0}\\frac{f(t+h)-f(t)}{h}", id: 3 },
      { title: "Law of Gravity", formula: "F=G\\frac{m_1m_2}{r^2}", id: 4 },
      { title: "Wave Equation", formula: "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}", id: 5 },
      { title: "Complex Numbers", formula: "i^2=-1", id: 6 },
      { title: "Euler's Polyhedra", formula: "V-E+F=2", id: 7 },
      { title: "Normal Distribution", formula: "\\Phi(x)=\\frac{1}{\\sqrt{2\\pi\\sigma}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", id: 8 },
      { title: "Fourier Transform", formula: "\\hat{f}(\\omega)=\\int f(x)e^{-2\\pi ix\\omega}dx", id: 9 },
      { title: "Navier-Stokes", formula: "\\rho(\\partial_t\\mathbf{v}+\\mathbf{v}\\cdot\\nabla\\mathbf{v})=-\\nabla p+\\mu\\nabla^2\\mathbf{v}", id: 10 },
      { title: "Maxwell's Equations", formula: "\\nabla\\times\\mathbf{E}=-\\partial_t\\mathbf{B}", id: 11 },
      { title: "Thermodynamics", formula: "dS\\ge0", id: 12 },
      { title: "Relativity", formula: "E=mc^2", id: 13 },
      { title: "Schr\u00f6dinger", formula: "i\\hbar\\partial_t\\Psi=H\\Psi", id: 14 },
      { title: "Information Theory", formula: "H=-\\sum p\\log p", id: 15 },
      { title: "Chaos Theory", formula: "x_{n+1}=rx_n(1-x_n)", id: 16 },
      { title: "Black-Scholes", formula: "\\frac{1}{2}\\sigma^2S^2V_{SS}+rSV_S+V_t-rV=0", id: 17 },
    ],
  },
  {
    slug: "physics",
    name: "Physics",
    description: "Mechanics, thermodynamics, electromagnetism, quantum",
    icon: "atom",
    active: false,
    formulas: [
      { title: "Newton's Second Law", formula: "F=ma", author: "Newton", year: "1687" },
      { title: "Kinetic Energy", formula: "E_k=\\frac{1}{2}mv^2" },
      { title: "Coulomb's Law", formula: "F=k\\frac{q_1q_2}{r^2}", author: "Coulomb", year: "1785" },
      { title: "Ohm's Law", formula: "V=IR", author: "Ohm", year: "1827" },
      { title: "Snell's Law", formula: "n_1\\sin\\theta_1=n_2\\sin\\theta_2" },
      { title: "Doppler Effect", formula: "f'=f\\frac{v\\pm v_o}{v\\mp v_s}" },
      { title: "Ideal Gas Law", formula: "PV=nRT" },
      { title: "Stefan-Boltzmann", formula: "P=\\sigma AT^4" },
      { title: "de Broglie Wavelength", formula: "\\lambda=\\frac{h}{mv}" },
      { title: "Heisenberg Uncertainty", formula: "\\Delta x\\Delta p\\ge\\frac{\\hbar}{2}" },
      { title: "Planck's Law", formula: "E=h\\nu" },
      { title: "Lorentz Force", formula: "\\mathbf{F}=q(\\mathbf{E}+\\mathbf{v}\\times\\mathbf{B})" },
    ],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    description: "Chemical reactions, thermochemistry, equilibrium",
    icon: "flask-conical",
    active: false,
    formulas: [
      { title: "Ideal Gas Law", formula: "PV=nRT" },
      { title: "Arrhenius Equation", formula: "k=Ae^{-E_a/RT}", author: "Arrhenius", year: "1889" },
      { title: "Henderson-Hasselbalch", formula: "pH=pK_a+\\log\\frac{[A^-]}{[HA]}" },
      { title: "Nernst Equation", formula: "E=E^0-\\frac{RT}{nF}\\ln Q" },
      { title: "Beer-Lambert Law", formula: "A=\\varepsilon lc" },
      { title: "Gibbs Free Energy", formula: "\\Delta G=\\Delta H-T\\Delta S" },
      { title: "Rate Law", formula: "r=k[A]^m[B]^n" },
      { title: "Clausius-Clapeyron", formula: "\\frac{dP}{dT}=\\frac{\\Delta H}{T\\Delta V}" },
    ],
  },
  {
    slug: "biology",
    name: "Biology & Genetics",
    description: "Population dynamics, genetics, ecology",
    icon: "dna",
    active: false,
    formulas: [
      { title: "Hardy-Weinberg", formula: "p^2+2pq+q^2=1" },
      { title: "Logistic Growth", formula: "\\frac{dN}{dt}=rN\\left(1-\\frac{N}{K}\\right)" },
      { title: "Michaelis-Menten", formula: "v=\\frac{V_{max}[S]}{K_m+[S]}" },
      { title: "DNA Base Pairing", formula: "A\\equiv T,\\;G\\equiv C" },
      { title: "Goldman Equation", formula: "V_m=\\frac{RT}{F}\\ln\\frac{P_K[K^+]_o+P_{Na}[Na^+]_o}{P_K[K^+]_i+P_{Na}[Na^+]_i}" },
      { title: "Lotka-Volterra", formula: "\\frac{dx}{dt}=\\alpha x-\\beta xy" },
    ],
  },
  {
    slug: "economics",
    name: "Economics & Finance",
    description: "Markets, optimization, game theory",
    icon: "trending-up",
    active: false,
    formulas: [
      { title: "Compound Interest", formula: "A=P(1+r/n)^{nt}" },
      { title: "Supply & Demand", formula: "Q_d=a-bP,\\;Q_s=c+dP" },
      { title: "GDP", formula: "Y=C+I+G+(X-M)" },
      { title: "Fisher Equation", formula: "1+i=(1+r)(1+\\pi)" },
      { title: "CAPM", formula: "E(R_i)=R_f+\\beta_i(E(R_m)-R_f)" },
      { title: "Nash Equilibrium", formula: "u_i(s_i^*,s_{-i}^*)\\ge u_i(s_i,s_{-i}^*)" },
      { title: "Cobb-Douglas", formula: "Y=AK^\\alpha L^{1-\\alpha}" },
    ],
  },
  {
    slug: "cs",
    name: "Computer Science",
    description: "Algorithms, complexity, machine learning",
    icon: "cpu",
    active: false,
    formulas: [
      { title: "Big-O Notation", formula: "f(n)=O(g(n))" },
      { title: "Binary Search", formula: "T(n)=O(\\log n)" },
      { title: "Master Theorem", formula: "T(n)=aT(n/b)+f(n)" },
      { title: "Bayes' Theorem", formula: "P(A|B)=\\frac{P(B|A)P(A)}{P(B)}" },
      { title: "Gradient Descent", formula: "\\theta:=\\theta-\\alpha\\nabla J(\\theta)" },
      { title: "Softmax", formula: "\\sigma(z)_i=\\frac{e^{z_i}}{\\sum_j e^{z_j}}" },
      { title: "Cross Entropy", formula: "H(p,q)=-\\sum p(x)\\log q(x)" },
      { title: "Attention (Transformers)", formula: "\\text{Att}(Q,K,V)=\\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V" },
    ],
  },
  {
    slug: "statistics",
    name: "Statistics & Probability",
    description: "Distributions, inference, regression",
    icon: "bar-chart-3",
    active: false,
    formulas: [
      { title: "Bayes' Theorem", formula: "P(A|B)=\\frac{P(B|A)P(A)}{P(B)}" },
      { title: "Standard Deviation", formula: "\\sigma=\\sqrt{\\frac{1}{N}\\sum(x_i-\\mu)^2}" },
      { title: "Linear Regression", formula: "y=\\beta_0+\\beta_1 x+\\varepsilon" },
      { title: "Chi-Square Test", formula: "\\chi^2=\\sum\\frac{(O_i-E_i)^2}{E_i}" },
      { title: "Central Limit Theorem", formula: "\\bar{X}\\sim N(\\mu,\\sigma^2/n)" },
      { title: "Poisson Distribution", formula: "P(k)=\\frac{\\lambda^k e^{-\\lambda}}{k!}" },
      { title: "Markov Chain", formula: "P(X_{n+1}|X_n)=P(X_{n+1}|X_1,...,X_n)" },
    ],
  },
  {
    slug: "engineering",
    name: "Engineering",
    description: "Signals, control systems, materials",
    icon: "wrench",
    active: false,
    formulas: [
      { title: "Hooke's Law", formula: "F=-kx" },
      { title: "Stress-Strain", formula: "\\sigma=E\\varepsilon" },
      { title: "Bernoulli's Equation", formula: "P+\\frac{1}{2}\\rho v^2+\\rho gh=\\text{const}" },
      { title: "Transfer Function", formula: "H(s)=\\frac{Y(s)}{X(s)}" },
      { title: "Nyquist Criterion", formula: "N=Z-P" },
      { title: "Reynolds Number", formula: "Re=\\frac{\\rho vL}{\\mu}" },
    ],
  },
  {
    slug: "astronomy",
    name: "Astronomy & Astrophysics",
    description: "Orbital mechanics, cosmology, stellar physics",
    icon: "telescope",
    active: false,
    formulas: [
      { title: "Kepler's Third Law", formula: "T^2=\\frac{4\\pi^2}{GM}a^3" },
      { title: "Hubble's Law", formula: "v=H_0 d" },
      { title: "Schwarzschild Radius", formula: "r_s=\\frac{2GM}{c^2}" },
      { title: "Luminosity", formula: "L=4\\pi R^2\\sigma T^4" },
      { title: "Drake Equation", formula: "N=R_*\\cdot f_p\\cdot n_e\\cdot f_l\\cdot f_i\\cdot f_c\\cdot L" },
      { title: "Friedmann Equation", formula: "H^2=\\frac{8\\pi G}{3}\\rho-\\frac{k}{a^2}" },
    ],
  },
  {
    slug: "linear-algebra",
    name: "Linear Algebra",
    description: "Matrices, eigenvalues, vector spaces",
    icon: "grid-3x3",
    active: false,
    formulas: [
      { title: "Matrix Multiplication", formula: "(AB)_{ij}=\\sum_k A_{ik}B_{kj}" },
      { title: "Eigenvalue Equation", formula: "A\\mathbf{v}=\\lambda\\mathbf{v}" },
      { title: "Determinant", formula: "\\det(A)=\\sum_{\\sigma}\\text{sgn}(\\sigma)\\prod a_{i,\\sigma(i)}" },
      { title: "SVD", formula: "A=U\\Sigma V^T" },
      { title: "Dot Product", formula: "\\mathbf{a}\\cdot\\mathbf{b}=|\\mathbf{a}||\\mathbf{b}|\\cos\\theta" },
      { title: "Cross Product", formula: "|\\mathbf{a}\\times\\mathbf{b}|=|\\mathbf{a}||\\mathbf{b}|\\sin\\theta" },
    ],
  },
]
