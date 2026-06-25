import type { ReactElement } from "react"
import { useSyncExternalStore } from "react"
import { subscribeToasts, getToasts, dismissToast, type ToastVariant } from "../lib/toast"

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
  error: "bg-red-600 text-white",
  info: "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
}

/** Renders the toast stack. Mount once near the app root. */
export function ToastHost(): ReactElement | null {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${VARIANT_CLASS[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="-mr-1 rounded-full px-1 text-base leading-none opacity-60 transition hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
