import type { ReactElement, ReactNode, WheelEvent } from "react"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

const MIN_ZOOM = 0.6
const DEFAULT_ZOOM = 1
const MAX_ZOOM = 2
const BUTTON_ZOOM_STEP = 0.05
const WHEEL_ZOOM_SENSITIVITY = 0.0015

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))))
}

interface VisualizationViewportProps {
  children: ReactNode
  className?: string
}

export function VisualizationViewport({
  children,
  className,
}: VisualizationViewportProps): ReactElement {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingAnchorRef = useRef<{ x: number; y: number } | null>(null)

  const zoomPercent = Math.round(zoom * 100)
  const canZoomOut = zoom > MIN_ZOOM
  const canZoomIn = zoom < MAX_ZOOM
  const canReset = zoom !== DEFAULT_ZOOM
  const isZoomedOut = zoom < DEFAULT_ZOOM
  const zoomFrameStyle = useMemo(
    () => (zoom > DEFAULT_ZOOM ? { width: `${zoom * 100}%`, height: `${zoom * 100}%` } : undefined),
    [zoom],
  )
  const visualizationStageStyle = useMemo(() => {
    if (zoom > DEFAULT_ZOOM) {
      return {
        width: `${(DEFAULT_ZOOM / zoom) * 100}%`,
        height: `${(DEFAULT_ZOOM / zoom) * 100}%`,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        willChange: "transform",
      }
    }

    if (zoom < DEFAULT_ZOOM) {
      return {
        width: "100%",
        height: "100%",
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
        willChange: "transform",
      }
    }

    return undefined
  }, [zoom])

  const captureViewportAnchor = useCallback(() => {
    const element = scrollRef.current
    if (!element) return { x: 0.5, y: 0.5 }

    const scrollWidth = Math.max(element.scrollWidth, element.clientWidth, 1)
    const scrollHeight = Math.max(element.scrollHeight, element.clientHeight, 1)

    return {
      x: (element.scrollLeft + element.clientWidth / 2) / scrollWidth,
      y: (element.scrollTop + element.clientHeight / 2) / scrollHeight,
    }
  }, [])

  const updateZoom = useCallback((recipe: number | ((previous: number) => number)) => {
    setZoom((previous) => {
      const next = clampZoom(typeof recipe === "function" ? recipe(previous) : recipe)
      if (next !== previous) {
        pendingAnchorRef.current = captureViewportAnchor()
      }
      return next
    })
  }, [captureViewportAnchor])

  const adjustZoom = useCallback((delta: number) => {
    updateZoom((previous) => previous + delta)
  }, [updateZoom])

  const resetZoom = useCallback(() => {
    updateZoom(DEFAULT_ZOOM)
  }, [updateZoom])

  useLayoutEffect(() => {
    const element = scrollRef.current
    const anchor = pendingAnchorRef.current
    if (!element || !anchor) return

    pendingAnchorRef.current = null

    const scrollWidth = Math.max(element.scrollWidth, element.clientWidth)
    const scrollHeight = Math.max(element.scrollHeight, element.clientHeight)
    const targetLeft = anchor.x * scrollWidth - element.clientWidth / 2
    const targetTop = anchor.y * scrollHeight - element.clientHeight / 2

    element.scrollLeft = Math.max(0, Math.min(scrollWidth - element.clientWidth, targetLeft))
    element.scrollTop = Math.max(0, Math.min(scrollHeight - element.clientHeight, targetTop))
  }, [zoom])

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return

    event.preventDefault()

    const delta = -event.deltaY * WHEEL_ZOOM_SENSITIVITY
    if (Math.abs(delta) < 0.0001) return

    updateZoom((previous) => previous * (1 + delta))
  }, [updateZoom])

  return (
    <div className={cn("relative h-full min-h-0", className)}>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex justify-end sm:right-3 sm:top-3">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-slate-700/55 bg-slate-900/82 p-1 shadow-lg backdrop-blur sm:gap-1 sm:border-slate-200/80 sm:bg-white/95 sm:p-1 dark:border-slate-700 dark:bg-slate-900/90">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-slate-100 hover:bg-white/10 hover:text-white sm:h-7 sm:w-7 sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white dark:sm:text-slate-200 dark:sm:hover:bg-slate-800"
            aria-label="Zoom out visualization"
            disabled={!canZoomOut}
            onClick={() => adjustZoom(-BUTTON_ZOOM_STEP)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span
            className="min-w-[2.8rem] text-center text-[10px] font-semibold text-slate-100 sm:min-w-[3.1rem] sm:text-slate-500 dark:text-slate-200"
            aria-live="polite"
          >
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-slate-100 hover:bg-white/10 hover:text-white sm:h-7 sm:w-7 sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white dark:sm:text-slate-200 dark:sm:hover:bg-slate-800"
            aria-label="Zoom in visualization"
            disabled={!canZoomIn}
            onClick={() => adjustZoom(BUTTON_ZOOM_STEP)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-slate-100 hover:bg-white/10 hover:text-white sm:h-7 sm:w-7 sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white dark:sm:text-slate-200 dark:sm:hover:bg-slate-800"
            aria-label="Reset visualization zoom"
            disabled={!canReset}
            onClick={resetZoom}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-full overflow-auto overscroll-contain"
        onWheel={handleWheel}
      >
        <div
          data-testid="visualization-zoom-frame"
          data-zoom-scale={zoomPercent}
          className={cn(
            "h-full w-full min-h-full min-w-full",
            isZoomedOut && "flex items-center justify-center",
          )}
          style={zoomFrameStyle}
        >
          <div
            data-testid="visualization-zoom-stage"
            className={cn(
              zoom === DEFAULT_ZOOM && "h-full w-full",
              zoom > DEFAULT_ZOOM && "min-h-full min-w-full",
              isZoomedOut && "shrink-0",
            )}
            style={visualizationStageStyle}
          >
            <div className="h-full w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
