import type { ElementType, MouseEvent, ReactElement } from "react"

interface ColorToken {
  text: string
  color?: string
}

const COLOR_SEGMENT_PATTERN = /(?:\{\\color\{([^}]+)\}([^{}]+)\}|\\color\{([^}]+)\}\{([^{}]+)\})/g

function parseColorTokens(math: string): ColorToken[] {
  if (!math) return []

  const tokens: ColorToken[] = []
  let lastIndex = 0

  for (const match of math.matchAll(COLOR_SEGMENT_PATTERN)) {
    const index = match.index ?? 0
    const before = math.slice(lastIndex, index)
    if (before) {
      const last = tokens[tokens.length - 1]
      if (last && last.color === undefined) {
        last.text += before
      } else {
        tokens.push({ text: before })
      }
    }

    const color = (match[1] ?? match[3] ?? "").trim().toLowerCase()
    const value = match[2] ?? match[4] ?? ""
    if (value) {
      const colorValue = color || undefined
      const last = tokens[tokens.length - 1]
      if (last && last.color === colorValue) {
        last.text += value
      } else {
        tokens.push({ text: value, color: colorValue })
      }
    }

    lastIndex = index + match[0].length
  }

  const remaining = math.slice(lastIndex)
  if (remaining) {
    const last = tokens[tokens.length - 1]
    if (last && last.color === undefined) {
      last.text += remaining
    } else {
      tokens.push({ text: remaining })
    }
  }

  return tokens
}

interface FormulaTextProps {
  math: string
  as?: ElementType
  className?: string
  colorTokenClassName?: string
  onColorTokenClick?: (payload: {
    color: string
    text: string
    event: MouseEvent<HTMLElement>
  }) => void
}

export function FormulaText({
  math,
  as: Component = "span",
  className,
  colorTokenClassName,
  onColorTokenClick,
}: FormulaTextProps): ReactElement {
  const tokens = parseColorTokens(math)

  return (
    <Component className={className}>
      {tokens.map((token, index) => {
        const key = `${token.color ?? "plain"}-${index}`

        if (token.color) {
          const interactive = !!onColorTokenClick
          const sharedClassName = [
            "whitespace-pre-wrap",
            interactive ? "rounded-sm px-0.5 transition hover:bg-slate-100 dark:hover:bg-slate-700" : "",
            colorTokenClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")

          if (interactive) {
            return (
              <button
                key={key}
                type="button"
                className={sharedClassName}
                style={{ color: token.color }}
                onClick={(event) => onColorTokenClick?.({ color: token.color!, text: token.text, event })}
              >
                {token.text}
              </button>
            )
          }

          return (
            <span key={key} className={sharedClassName} style={{ color: token.color }}>
              {token.text}
            </span>
          )
        }

        return (
          <span key={key} className="whitespace-pre-wrap">
            {token.text}
          </span>
        )
      })}
    </Component>
  )
}
