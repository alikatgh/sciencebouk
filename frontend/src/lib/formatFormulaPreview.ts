const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ",
}

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
}

const COMMAND_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\left/g, ""],
  [/\\right/g, ""],
  [/\\cdot/g, "·"],
  [/\\times/g, "×"],
  [/\\geq?/g, "≥"],
  [/\\leq?/g, "≤"],
  [/\\to/g, "→"],
  [/\\infty/g, "∞"],
  [/\\partial/g, "∂"],
  [/\\nabla/g, "∇"],
  [/\\sum/g, "Σ"],
  [/\\int/g, "∫"],
  [/\\log/g, "log"],
  [/\\lim/g, "lim"],
  [/\\pi/g, "π"],
  [/\\sigma/g, "σ"],
  [/\\mu/g, "μ"],
  [/\\rho/g, "ρ"],
  [/\\omega/g, "ω"],
  [/\\Phi/g, "Φ"],
  [/\\Psi/g, "Ψ"],
  [/\\hbar/g, "ℏ"],
  [/\\hat\s*/g, ""],
  [/\\mathbf/g, ""],
  [/\\text/g, ""],
  [/\\,/g, " "],
  [/\\;/g, " "],
]

const SUPERSCRIPT_FALLBACK = "¤"
const SUBSCRIPT_FALLBACK = "§"

function formatScript(value: string, map: Record<string, string>, fallbackPrefix: string): string {
  const compact = value.replace(/\s+/g, "")
  const converted = Array.from(compact).map((char) => map[char]).join("")
  if (converted.length === compact.length && converted.length > 0) {
    return converted
  }

  return `${fallbackPrefix}(${value.trim()})`
}

function replaceFractions(input: string): string {
  let output = input
  let previous = ""

  while (output !== previous) {
    previous = output
    output = output.replace(/\\frac\s*{([^{}]+)}\s*{([^{}]+)}/g, "($1)/($2)")
  }

  return output
}

function replaceSquareRoots(input: string): string {
  return input.replace(/\\sqrt\s*{([^{}]+)}/g, "√($1)")
}

function replaceScripts(input: string): string {
  return input
    .replace(/\^\{([^{}]+)\}/g, (_, value: string) => formatScript(value, SUPERSCRIPT_MAP, SUPERSCRIPT_FALLBACK))
    .replace(/\^([A-Za-z0-9+\-=()])/g, (_, value: string) => formatScript(value, SUPERSCRIPT_MAP, SUPERSCRIPT_FALLBACK))
    .replace(/_\{([^{}]+)\}/g, (_, value: string) => formatScript(value, SUBSCRIPT_MAP, SUBSCRIPT_FALLBACK))
    .replace(/_([A-Za-z0-9+\-=()])/g, (_, value: string) => formatScript(value, SUBSCRIPT_MAP, SUBSCRIPT_FALLBACK))
    .replaceAll(SUPERSCRIPT_FALLBACK, "^")
    .replaceAll(SUBSCRIPT_FALLBACK, "_")
}

export function formatFormulaPreview(formula: string): string {
  let output = formula

  output = replaceFractions(output)
  output = replaceSquareRoots(output)
  output = replaceScripts(output)

  for (const [pattern, replacement] of COMMAND_REPLACEMENTS) {
    output = output.replace(pattern, replacement)
  }

  output = output.replace(/[{}]/g, "")
  output = output.replace(/\\/g, "")
  output = output.replace(/\s*=\s*/g, " = ")
  output = output.replace(/\s*\+\s*/g, " + ")
  output = output.replace(/\s*-\s*/g, " - ")
  output = output.replace(/\s+/g, " ").trim()

  return output
}
