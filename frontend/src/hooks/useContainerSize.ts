import { useEffect, useRef, useState } from "react"

interface Size { width: number; height: number }

/**
 * Measures a container element using ResizeObserver.
 * Backed by the same approach as react-use-measure but compatible
 * with our existing useRef pattern across all scenes.
 */
export function useContainerSize(
  ref: React.RefObject<HTMLDivElement | null>
): Size {
  const [size, setSize] = useState<Size>({ width: 900, height: 440 })
  const rafRef = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 50 && rect.height > 50) {
        setSize((prev) => {
          const w = Math.round(rect.width)
          const h = Math.round(rect.height)
          if (prev.width === w && prev.height === h) return prev
          return { width: w, height: h }
        })
      }
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    })

    observer.observe(el)
    update()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [ref])

  return size
}
