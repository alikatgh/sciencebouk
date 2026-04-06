import type { ReactElement } from "react"
import { useLayoutEffect, useRef, useState } from "react"
import { DeferredInlineMath } from "./DeferredInlineMath"

interface AutoFitDeferredInlineMathProps {
  math: string
  className?: string
  minScale?: number
}

function roundScale(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function AutoFitDeferredInlineMath({
  math,
  className,
  minScale = 0.72,
}: AutoFitDeferredInlineMathProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const updateScale = () => {
      const availableWidth = container.clientWidth
      const naturalWidth = measure.scrollWidth

      if (availableWidth <= 0 || naturalWidth <= 0) return

      const nextScale = naturalWidth > availableWidth
        ? Math.max(minScale, Math.min(1, availableWidth / naturalWidth))
        : 1

      setScale((previous) => {
        const rounded = roundScale(nextScale)
        return previous === rounded ? previous : rounded
      })
    }

    updateScale()

    const resizeObserver = new ResizeObserver(() => {
      updateScale()
    })

    resizeObserver.observe(container)
    resizeObserver.observe(measure)

    const mutationObserver = new MutationObserver(() => {
      updateScale()
    })

    mutationObserver.observe(measure, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [math, minScale])

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 invisible w-max whitespace-nowrap"
      >
        <DeferredInlineMath math={math} className={className} />
      </div>

      <div className="overflow-x-auto">
        <div className="flex justify-center">
          <div
            className="w-max max-w-full"
            style={{ fontSize: `${scale}em` }}
          >
            <DeferredInlineMath math={math} className={className} />
          </div>
        </div>
      </div>
    </div>
  )
}
