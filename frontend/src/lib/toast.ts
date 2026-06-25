/**
 * Tiny toast store (external-store pattern, like favourites) — push transient
 * notifications from anywhere, render them with `ToastHost` via
 * `useSyncExternalStore`. Auto-expires, caps the visible stack, and is fully
 * synchronous + testable (no React dependency in this module).
 */
export type ToastVariant = "success" | "error" | "info"

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const MAX_VISIBLE = 4

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function emit(): void {
  for (const listener of listeners) listener()
}

function clearTimer(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Stable reference between mutations — safe for useSyncExternalStore. */
export function getToasts(): Toast[] {
  return toasts
}

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  clearTimer(id)
  emit()
}

export function pushToast(message: string, variant: ToastVariant = "success", durationMs = 2600): number {
  const id = nextId++
  const overflow = [...toasts, { id, message, variant }]
  // Drop the oldest (and its timer) if we exceed the cap.
  while (overflow.length > MAX_VISIBLE) {
    const dropped = overflow.shift()
    if (dropped) clearTimer(dropped.id)
  }
  toasts = overflow
  if (durationMs > 0 && typeof setTimeout === "function") {
    timers.set(id, setTimeout(() => dismissToast(id), durationMs))
  }
  emit()
  return id
}

/** Test-only: reset all state and timers. */
export function _resetToasts(): void {
  for (const id of [...timers.keys()]) clearTimer(id)
  toasts = []
  nextId = 1
}
