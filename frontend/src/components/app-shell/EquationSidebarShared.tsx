import type { ReactElement } from "react"
import { memo } from "react"
import {
  CheckCircle2,
  Crown,
  LogOut,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { prefetchEquationScene } from "../sceneRegistry"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../../config/billing"

interface EquationListProps {
  equations: EquationSummary[]
  selectedId: number
  progressByEquation: Map<number, EquationProgress>
  onSelectEquation: (id: number) => void
}

export function EquationList({
  equations,
  selectedId,
  progressByEquation,
  onSelectEquation,
}: EquationListProps): ReactElement {
  return (
    <TooltipProvider delayDuration={400}>
      <>
        {equations.map((equation) => {
          return (
            <EquationListItem
              key={equation.id}
              equation={equation}
              active={equation.id === selectedId}
              done={progressByEquation.get(equation.id)?.completed ?? false}
              onSelectEquation={onSelectEquation}
            />
          )
        })}
      </>
    </TooltipProvider>
  )
}

interface EquationListItemProps {
  equation: EquationSummary
  active: boolean
  done: boolean
  onSelectEquation: (id: number) => void
}

const EquationListItem = memo(function EquationListItem({
  equation,
  active,
  done,
  onSelectEquation,
}: EquationListItemProps): ReactElement {
  const prefetch = () => {
    void prefetchEquationScene(equation.id)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-all ${
            active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
          onClick={() => onSelectEquation(equation.id)}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          type="button"
          aria-current={active ? "page" : undefined}
        >
          <span
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${
              done
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                : active
                  ? "bg-ocean/10 text-ocean"
                  : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {done ? <><CheckCircle2 className="h-3 w-3" aria-hidden="true" /><span className="sr-only">Completed</span></> : equation.id}
          </span>
          <span
            className={`truncate text-xs ${
              active
                ? "font-medium text-slate-900 dark:text-white"
                : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-white"
            }`}
          >
            {equation.title}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="font-semibold">{equation.title}</p>
        <p className="text-white/70">
          {equation.author}, {equation.year}
        </p>
      </TooltipContent>
    </Tooltip>
  )
})

export interface SidebarAccountProps {
  compact?: boolean
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  onOpenProfile: () => void
  onOpenAuth: () => void
  onOpenPro: () => void
  onLogout: () => void
}

export const SidebarAccount = memo(function SidebarAccount({
  compact = false,
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: SidebarAccountProps): ReactElement {
  if (compact) {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-3">
          <button onClick={onOpenProfile} type="button" className="flex-shrink-0" aria-label="Open profile">
            <Avatar className="h-8 w-8 transition hover:ring-2 hover:ring-ocean/50">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </button>
          <button onClick={onOpenProfile} className="min-w-0 flex-1 text-left transition hover:opacity-70" type="button">
            <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{userEmail}</p>
            <p className="text-[10px] text-slate-400">{isPro ? "Pro" : "Free"}</p>
          </button>
          {!isPro && (
            <Button
              variant="outline"
              size="xs"
              onClick={onOpenPro}
              disabled={!BILLING_ENABLED}
              title={BILLING_ENABLED ? undefined : BILLING_DISABLED_COPY.detail}
            >
              <Crown className={`h-3 w-3 ${BILLING_ENABLED ? "text-amber-500" : "text-slate-400"}`} />
              {BILLING_ENABLED ? "Pro" : "Later"}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }

    return (
      <Button variant="ghost" className="w-full gap-2" onClick={onOpenAuth}>
        <User className="h-4 w-4" />
        Sign in to save progress
      </Button>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={onOpenProfile} className="flex items-center gap-1.5 min-w-0 flex-1 text-left transition hover:opacity-70" type="button" aria-label="Open profile">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ocean/10 text-[9px] font-bold text-ocean">
            {userInitial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{userEmail}</span>
        </button>
        <button onClick={onLogout} className="text-slate-300 hover:text-slate-500" type="button" aria-label="Sign out">
          <LogOut className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={onOpenAuth} className="flex w-full items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600" type="button">
      <User className="h-3 w-3" />
      Sign in
    </button>
  )
})
