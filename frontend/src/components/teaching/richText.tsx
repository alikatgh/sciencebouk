import type { ReactElement, ReactNode } from "react"
import { Children, cloneElement, isValidElement } from "react"
import type { GlossaryTerm, Variable } from "./types"

interface RichTextToken {
  word: string
  type: "var" | "term"
  varRef?: Variable
  termRef?: GlossaryTerm
}

interface RichTextOptions {
  variables: Variable[]
  glossary: GlossaryTerm[]
  onHighlight: (name: string | null) => void
  onTermHighlight: (cls: string | null) => void
}

/**
 * Tokens + the matcher regex depend only on the variables/glossary, never on
 * the text being linked. Building them once (via `prepareRichText`) and reusing
 * the result across every text node — and every render, when the caller
 * memoizes it — avoids rebuilding the token list and `RegExp` per node.
 */
export interface PreparedRichText {
  tokens: RichTextToken[]
  regex: RegExp | null
  onHighlight: (name: string | null) => void
  onTermHighlight: (cls: string | null) => void
}

function buildTokens(variables: Variable[], glossary: GlossaryTerm[]): RichTextToken[] {
  const tokens: RichTextToken[] = []

  for (const term of glossary) {
    for (const word of term.words) {
      tokens.push({ word, type: "term", termRef: term })
    }
  }

  const safeVars = variables.filter((variable) => variable.symbol.length > 1 || variable.name.length > 1)
  for (const variable of safeVars) {
    if (variable.symbol.length > 1) {
      tokens.push({ word: variable.symbol, type: "var", varRef: variable })
    }
    if (variable.name.length > 1 && variable.name !== variable.symbol) {
      tokens.push({ word: variable.name, type: "var", varRef: variable })
    }
  }

  tokens.sort((a, b) => b.word.length - a.word.length)
  return tokens
}

export function prepareRichText(options: RichTextOptions): PreparedRichText {
  const tokens = buildTokens(options.variables, options.glossary)
  const regex =
    tokens.length === 0
      ? null
      : new RegExp(
          `\\b(${tokens.map((token) => token.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
          "gi",
        )
  return {
    tokens,
    regex,
    onHighlight: options.onHighlight,
    onTermHighlight: options.onTermHighlight,
  }
}

function renderLinkedText(text: string, prepared: PreparedRichText): ReactElement {
  const { tokens, regex } = prepared
  if (!regex || tokens.length === 0) return <>{text}</>

  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, index) => {
        const lower = part.toLowerCase()
        const token = tokens.find((candidate) => candidate.word.toLowerCase() === lower)
        if (!token) return <span key={index}>{part}</span>

        if (token.type === "var" && token.varRef) {
          return (
            <span
              key={index}
              className="cursor-pointer rounded px-0.5 font-bold transition hover:ring-1 hover:ring-current"
              style={{ color: token.varRef.color }}
              onPointerEnter={() => prepared.onHighlight(token.varRef?.name ?? null)}
              onPointerLeave={() => prepared.onHighlight(null)}
            >
              {part}
            </span>
          )
        }

        if (token.type === "term" && token.termRef) {
          return (
            <span
              key={index}
              className="cursor-pointer border-b border-dashed border-current font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700"
              style={{ color: token.termRef.color }}
              title={token.termRef.tooltip}
              onPointerEnter={() => prepared.onTermHighlight(token.termRef?.highlightClass ?? null)}
              onPointerLeave={() => prepared.onTermHighlight(null)}
            >
              {part}
            </span>
          )
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}

/** Convenience wrapper that prepares tokens for a single text run. */
export function linkTermsText(text: string, options: RichTextOptions): ReactElement {
  return renderLinkedText(text, prepareRichText(options))
}

export function enhanceRichTextNodes(children: ReactNode, prepared: PreparedRichText): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return renderLinkedText(child, prepared)
    }

    if (!isValidElement(child)) {
      return child
    }

    const element = child as ReactElement<{ children?: ReactNode }>
    if (element.props.children === undefined) {
      return child
    }

    return cloneElement(element, {
      children: enhanceRichTextNodes(element.props.children, prepared),
    })
  })
}
