import type { ReactElement } from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cloud, Loader2, X } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import { getLocalProgressSyncItems } from "../progress/useProgress"
import { Button } from "./ui/button"

interface SyncPromptProps {
  onClose: () => void
}

export function SyncPrompt({ onClose }: SyncPromptProps): ReactElement | null {
  const { isPro } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [done, setDone] = useState(false)

  const localItems = getLocalProgressSyncItems()

  if (!isPro || localItems.length === 0 || done) return null

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.progress.bulkSync(localItems)
      setDone(true)
      onClose()
    } catch {
      setSyncing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-x-0 bottom-4 z-50 mx-auto max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-ocean/20 bg-white px-4 py-3 shadow-lg dark:border-ocean/30 dark:bg-slate-800">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ocean/10">
            <Cloud className="h-4 w-4 text-ocean" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Sync your progress
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Found progress on {localItems.length} equation{localItems.length !== 1 ? "s" : ""}. Save to your account?
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="bg-ocean text-white hover:bg-ocean/90"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sync"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-slate-400">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
