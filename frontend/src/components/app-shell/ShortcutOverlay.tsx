import type { ReactElement } from "react"
import { useEffect, useRef } from "react"
import { Button } from "../ui/button"

interface ShortcutOverlayProps {
  open: boolean
  showZeroShortcut: boolean
  shortcutJumpMax: number
  shiftedShortcutMax: number
  onClose: () => void
}

export function ShortcutOverlay({
  open,
  showZeroShortcut,
  shortcutJumpMax,
  shiftedShortcutMax,
  onClose,
}: ShortcutOverlayProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap: keep Tab/Shift+Tab inside the dialog while open
  useEffect(() => {
    if (!open) return
    const el = dialogRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    el.addEventListener("keydown", trap)
    return () => el.removeEventListener("keydown", trap)
  }, [open])

  const rows: [string, string][] = [
    ["j / ↓", "Next"],
    ["k / ↑", "Previous"],
    [`1-${shortcutJumpMax}`, "Jump to #"],
    ...(showZeroShortcut ? ([["0", "#10"]] as [string, string][]) : []),
    ...(shiftedShortcutMax > 0
      ? ([[`⇧+1-${shiftedShortcutMax}`, `#11-${10 + shiftedShortcutMax}`]] as [string, string][])
      : []),
    ["/", "Search"],
    ["h", "Home"],
    ["⌘[", "Sidebar"],
    ["?", "Shortcuts"],
  ]

  return (
    open ? (
      <>
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
        <div ref={dialogRef} className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {rows.map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-700">
                  {key}
                </kbd>
                <span className="text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={onClose}>
            Close (Esc)
          </Button>
        </div>
      </>
    ) : (
      <></>
    )
  )
}
