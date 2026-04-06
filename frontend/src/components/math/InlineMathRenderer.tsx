import type { ReactElement } from "react"
import "katex/dist/katex.min.css"
import { InlineMath } from "react-katex"

interface InlineMathRendererProps {
  math: string
}

export function InlineMathRenderer({ math }: InlineMathRendererProps): ReactElement {
  return <InlineMath math={math} />
}
