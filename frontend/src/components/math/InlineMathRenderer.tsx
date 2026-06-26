import type { ReactElement } from "react"
import { memo } from "react"
import "katex/dist/katex.min.css"
import { InlineMath } from "react-katex"

interface InlineMathRendererProps {
  math: string
}

// Memoized by `math`: react-katex re-runs KaTeX on every render, so without
// this a parent re-render (e.g. AutoFitDeferredInlineMath's per-frame scale
// change during a slider drag) would re-parse the same formula each frame.
export const InlineMathRenderer = memo(function InlineMathRenderer({
  math,
}: InlineMathRendererProps): ReactElement {
  return <InlineMath math={math} />
})
