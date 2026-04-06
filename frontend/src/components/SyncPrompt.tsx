import type { ReactElement } from "react"
import { useEffect, useRef, useState } from "react"
import { Cloud, Check } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import { getLocalProgressSyncItems } from "../progress/useProgress"

interface SyncPromptProps {
  onDismiss: () => void
  onSynced: () => void
}

/**
 * Auto-syncs localStorage progress to the server for Pro users.
 * Shows a brief "Synced!" toast — no user action required.
 * Only triggers once per session when there's unsynced data.
 */
export function SyncPrompt({ onDismiss, onSynced }: SyncPromptProps): ReactElement | null {
  const { isPro } = useAuth()
  const [status, setStatus] = useState<"idle" | "syncing" | "done">("idle")
  const attempted = useRef(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Store callbacks in refs so the effect below doesn't re-run when the parent
  // re-renders and passes new function references — that would cause an infinite loop.
  const onDismissRef = useRef(onDismiss)
  const onSyncedRef = useRef(onSynced)
  onDismissRef.current = onDismiss
  onSyncedRef.current = onSynced

  const localItems = getLocalProgressSyncItems()

  useEffect(() => () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
  }, [])

  // Auto-sync on mount — no user interaction needed
  useEffect(() => {
    if (!isPro || localItems.length === 0 || attempted.current) {
      onDismissRef.current()
      return
    }
    attempted.current = true
    setStatus("syncing")

    api.progress.bulkSync(localItems)
      .then(() => {
        setStatus("done")
        // Auto-dismiss after showing success briefly
        dismissTimerRef.current = setTimeout(() => {
          onSyncedRef.current()
          dismissTimerRef.current = null
        }, 2000)
      })
      .catch(() => {
        // Silent fail — will retry next session
        onDismissRef.current()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, localItems.length])

  if (status === "idle" || localItems.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto max-w-xs px-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-md dark:border-slate-700 dark:bg-slate-800">
        {status === "syncing" ? (
          <>
            <Cloud className="h-4 w-4 animate-pulse text-ocean" />
            <p className="text-xs text-slate-500">Syncing {localItems.length} equations...</p>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-emerald-500" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Progress synced</p>
          </>
        )}
      </div>
    </div>
  )
}
