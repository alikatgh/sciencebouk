import type { ReactElement } from "react"
import { Lightbulb } from "lucide-react"

interface RealWorldContextProps {
  hook: string
  hookAction: string
}

export function RealWorldContext({ hook, hookAction }: RealWorldContextProps): ReactElement {
  return (
    <div className="mb-5 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 dark:border-amber-700/40 dark:from-amber-950/30 dark:to-orange-950/20">
      <div className="flex gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {hook}
          </p>
          <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            {hookAction}
          </p>
        </div>
      </div>
    </div>
  )
}
