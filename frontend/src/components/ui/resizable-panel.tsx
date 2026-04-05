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
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored) return Math.max(minWidth, Math.min(maxWidth, Number(stored)))
    }
    return defaultWidth
  })
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Persist width
  useEffect(() => {
    if (storageKey && open) {
      localStorage.setItem(storageKey, String(width))
    }
  }, [width, storageKey, open])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startX.current = e.clientX
    startWidth.current = width
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [width])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - startX.current
    const newWidth = edge === "right"
      ? startWidth.current + dx
      : startWidth.current - dx

    if (newWidth < minWidth * 0.6) {
      // Collapse
      onCollapse?.()
      setIsDragging(false)
      return
    }

    const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth))
    setWidth(clamped)
    onWidthChange?.(clamped)
  }, [isDragging, edge, minWidth, maxWidth, onCollapse, onWidthChange])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (!open) return <></>

  const handle = (
    <div
      className={`group relative z-10 flex-shrink-0 ${edge === "right" ? "-mr-1" : "-ml-1"}`}
      style={{ width: 8 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
