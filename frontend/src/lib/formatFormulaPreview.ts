const INLINE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\cdot/g, "·"],
  [/\\times/g, "×"],
  [/\\pm/g, "±"],
  [/\\ge/g, "≥"],
  [/\\le/g, "≤"],
  [/\\to/g, "→"],
  [/\\infty/g, "∞"],
  [/\\partial/g, "∂"],
  [/\\nabla/g, "∇"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\delta/g, "δ"],
  [/\\epsilon/g, "ε"],
  [/\\lambda/g, "λ"],
  [/\\mu/g, "μ"],
  [/\\nu/g, "ν"],
  [/\\omega/g, "ω"],
  [/\\phi/g, "φ"],
  [/\\Phi/g, "Φ"],
  [/\\pi/g, "π"],
  [/\\rho/g, "ρ"],
  [/\\sigma/g, "σ"],
  [/\\theta/g, "θ"],
  [/\\Psi/g, "Ψ"],
  [/\\hbar/g, "ħ"],
  [/\\log/g, "log"],
  [/\\sum/g, "Σ"],
  [/\\left/g, ""],
  [/\\right/g, ""],
  [/\\,/g, " "],
  [/\\;/g, " "],
]

const SUPERSCRIPT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\^0/g, "⁰"],
  [/\^1/g, "¹"],
  [/\^2/g, "²"],
  [/\^3/g, "³"],
  [/\^4/g, "⁴"],
  [/\^5/g, "⁵"],
  [/\^6/g, "⁶"],
  [/\^7/g, "⁷"],
  [/\^8/g, "⁸"],
  [/\^9/g, "⁹"],
]

function simplifyNestedLatex(formula: string): string {
  let preview = formula

  for (let index = 0; index < 4; index += 1) {
    preview = preview.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    preview = preview.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    preview = preview.replace(/\\(?:mathbf|mathrm|text|hat)\{([^{}]+)\}/g, "$1")
  }

  return preview
}

export function formatFormulaPreview(formula: string): string {
  let preview = simplifyNestedLatex(formula)

  for (const [pattern, replacement] of INLINE_REPLACEMENTS) {
    preview = preview.replace(pattern, replacement)
  }

  for (const [pattern, replacement] of SUPERSCRIPT_REPLACEMENTS) {
    preview = preview.replace(pattern, replacement)
  }

  return preview
    .replace(/_+\{([^{}]+)\}/g, "_$1")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
