import type { ReactElement, ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

interface ResizablePanelProps {
  /** Which edge has the drag handle */
  edge: "left" | "right"
  /** Default width in pixels */
  defaultWidth: number
  /** Min width before it collapses */
  minWidth?: number
  /** Max width */
  maxWidth?: number
  /** Whether the panel is currently open */
  open?: boolean
  /** Called when panel is collapsed by dragging below minWidth */
  onCollapse?: () => void
  /** Called when panel is expanded */
  onExpand?: () => void
  /** Called with new width during drag */
  onWidthChange?: (width: number) => void
  /** localStorage key to persist width */
  storageKey?: string
  /** Content */
  children: ReactNode
  /** Extra classes on the panel container */
  className?: string
}

export function ResizablePanel({
  edge,
  defaultWidth,
  minWidth = 180,
  maxWidth = 500,
  open = true,
  onCollapse,
  onExpand,
  onWidthChange,
  storageKey,
  children,
  className = "",
}: ResizablePanelProps): ReactElement {
  const [width, setWidth] = useState(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        const parsed = Number(stored)
        if (Number.isFinite(parsed)) return Math.max(minWidth, Math.min(maxWidth, parsed))
      } catch {
        // Ignore storage access failures such as iOS private browsing.
      }
    }
    return defaultWidth
  })
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    if (!prevOpenRef.current && open) {
      onExpand?.()
    }
    prevOpenRef.current = open
  }, [open, onExpand])

  // Persist width
  useEffect(() => {
    if (typeof window !== "undefined" && storageKey && open) {
      try {
        localStorage.setItem(storageKey, String(width))
      } catch {
        // Keep the in-memory width even if persistence is unavailable.
      }
    }
  }, [width, storageKey, open])

  const restoreDragStyles = useCallback(() => {
    if (typeof document !== "undefined") {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [])

  const stopDragging = useCallback(() => {
    setIsDragging(false)
    restoreDragStyles()
  }, [restoreDragStyles])

  const updateWidth = useCallback((clientX: number) => {
    const dx = clientX - startX.current
    const newWidth = edge === "right"
      ? startWidth.current + dx
      : startWidth.current - dx

    if (newWidth < minWidth * 0.6) {
      onCollapse?.()
      stopDragging()
      return
    }

    const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth))
    setWidth(clamped)
    onWidthChange?.(clamped)
  }, [edge, maxWidth, minWidth, onCollapse, onWidthChange, stopDragging])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.clientX
    startWidth.current = width
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none"
      document.body.style.cursor = "col-resize"
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [width])

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      updateWidth(event.clientX)
    }

    const handlePointerEnd = () => {
      stopDragging()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerEnd)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
      restoreDragStyles()
    }
  }, [isDragging, restoreDragStyles, stopDragging, updateWidth])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 20
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      const newWidth = edge === "right" ? width - step : width + step
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setWidth(clamped)
      onWidthChange?.(clamped)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      const newWidth = edge === "right" ? width + step : width - step
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setWidth(clamped)
      onWidthChange?.(clamped)
    }
  }, [edge, width, minWidth, maxWidth, onWidthChange])

  if (!open) return <></>

  const handle = (
    <div
      className={`group relative z-10 flex-shrink-0 ${edge === "right" ? "-mr-1" : "-ml-1"}`}
      style={{ width: 8 }}
      data-resize-handle
      role="separator"
      aria-label="Resize panel"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      {/* Visible handle line */}
      <div className={`absolute inset-y-0 ${edge === "right" ? "right-0" : "left-0"} flex w-2 cursor-col-resize items-center justify-center`}>
        <div className={`h-8 w-1 rounded-full transition-colors ${
          isDragging
            ? "bg-ocean"
            : "bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
        }`} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-shrink-0" style={{ width }}>
      {edge === "left" && handle}
      <div className={`min-w-0 flex-1 overflow-hidden ${className}`}>
        {children}
      </div>
      {edge === "right" && handle}
    </div>
  )
}
