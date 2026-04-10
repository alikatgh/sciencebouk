import type { ReactElement, ReactNode } from "react"
import { useCallback, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "../../lib/utils"
import { enhanceRichTextNodes } from "./richText"
import type { GlossaryTerm, Variable } from "./types"

interface LessonMarkdownProps {
  content: string
  className?: string
  variables?: Variable[]
  glossary?: GlossaryTerm[]
  onHighlight?: (name: string | null) => void
  onTermHighlight?: (cls: string | null) => void
}

export function LessonMarkdown({
  content,
  className,
  variables = [],
  glossary = [],
  onHighlight,
  onTermHighlight,
}: LessonMarkdownProps): ReactElement {
  const enhance = useCallback(
    (children: ReactNode) =>
      enhanceRichTextNodes(children, {
        variables,
        glossary,
        onHighlight: (name) => onHighlight?.(name),
        onTermHighlight: (cls) => onTermHighlight?.(cls),
      }),
    [glossary, onHighlight, onTermHighlight, variables],
  )

  const components = useMemo<Components>(
    () => ({
      p({ children }) {
        return <p className="leading-relaxed">{enhance(children)}</p>
      },
      strong({ children }) {
        return <strong className="font-semibold text-slate-800 dark:text-slate-100">{enhance(children)}</strong>
      },
      em({ children }) {
        return <em className="italic">{enhance(children)}</em>
      },
      ul({ children }) {
        return <ul className="ml-4 list-disc space-y-1">{enhance(children)}</ul>
      },
      ol({ children }) {
        return <ol className="ml-4 list-decimal space-y-1">{enhance(children)}</ol>
      },
      li({ children }) {
        return <li>{enhance(children)}</li>
      },
      blockquote({ children }) {
        return (
          <blockquote className="border-l-2 border-ocean/30 pl-3 text-slate-600 dark:text-slate-300">
            {enhance(children)}
          </blockquote>
        )
      },
      a({ children, href }) {
        return (
          <a
            className="font-medium text-ocean underline underline-offset-2"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {enhance(children)}
          </a>
        )
      },
      code({ children, className: codeClassName }) {
        return (
          <code
            className={cn(
              "rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.92em] text-slate-700 dark:bg-slate-800 dark:text-slate-200",
              codeClassName,
            )}
          >
            {children}
          </code>
        )
      },
    }),
    [enhance],
  )

  return (
    <div className={cn("space-y-2", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
