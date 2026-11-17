import { formatFormulaPreview } from "./formatFormulaPreview"

export interface FormattedMathToken {
  text: string
  color?: string
}

const COLOR_SEGMENT_PATTERN = /(?:\{\\color\{([^}]+)\}([^{}]+)\}|\\color\{([^}]+)\}\{([^{}]+)\})/g

function formatSegment(segment: string): string {
  if (!segment) return ""

  const hasLeadingSpace = /^\s+/.test(segment)
  const hasTrailingSpace = /\s+$/.test(segment)
  const formatted = formatFormulaPreview(segment)

  if (!formatted) {
    return hasLeadingSpace || hasTrailingSpace ? " " : ""
  }

  return `${hasLeadingSpace ? " " : ""}${formatted}${hasTrailingSpace ? " " : ""}`
}

function pushToken(tokens: FormattedMathToken[], token: FormattedMathToken) {
  if (!token.text) return

  const previous = tokens[tokens.length - 1]
  if (previous && previous.color === token.color) {
    previous.text += token.text
    return
  }

  tokens.push(token)
}

export function tokenizeFormattedMath(math: string): FormattedMathToken[] {
  if (!math) return []

  const tokens: FormattedMathToken[] = []
  let lastIndex = 0

  for (const match of math.matchAll(COLOR_SEGMENT_PATTERN)) {
    const index = match.index ?? 0
    const before = math.slice(lastIndex, index)
    pushToken(tokens, { text: formatSegment(before) })

    const color = (match[1] ?? match[3] ?? "").trim().toLowerCase()
    const value = match[2] ?? match[4] ?? ""
    pushToken(tokens, {
      text: formatSegment(value),
      color: color || undefined,
    })

    lastIndex = index + match[0].length
  }

  pushToken(tokens, { text: formatSegment(math.slice(lastIndex)) })

  return tokens
}
