import type { ElementType, MouseEvent, ReactElement } from "react"
import { tokenizeFormattedMath } from "../../lib/tokenizeFormattedMath"

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
  const tokens = tokenizeFormattedMath(math)

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
