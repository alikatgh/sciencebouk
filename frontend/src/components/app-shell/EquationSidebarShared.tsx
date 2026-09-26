import type { ReactElement } from "react"
import { memo, useMemo } from "react"
import {
  CheckCircle2,
  Crown,
  LogOut,
  Star,
  User,
} from "lucide-react"
import { toggleFavorite, useIsFavorite } from "../../lib/useFavorites"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { groupEquationsBySubject } from "../../data/equationGroups"
import { prefetchEquationScene } from "../sceneRegistry"
import { BILLING_ENABLED } from "../../config/billing"

interface EquationListProps {
  equations: EquationSummary[]
  selectedId: number
  progressByEquation: Map<number, EquationProgress>
  onSelectEquation: (id: number) => void
  variant?: "desktop" | "mobile"
}

export function EquationList({
  equations,
  selectedId,
  progressByEquation,
  onSelectEquation,
  variant = "desktop",
}: EquationListProps): ReactElement {
  return (
    <div className="space-y-1">
      {equations.map((equation) => (
        <EquationListItem
          key={equation.id}
          equation={equation}
          active={equation.id === selectedId}
          done={progressByEquation.get(equation.id)?.completed ?? false}
          onSelectEquation={onSelectEquation}
          variant={variant}
        />
      ))}
    </div>
  )
}

interface GroupedEquationListProps {
  equations: EquationSummary[]
  selectedId: number
  progressByEquation: Map<number, EquationProgress>
  onSelectEquation: (id: number) => void
  variant?: "desktop" | "mobile"
}

/** The equation list grouped under subject headers, each with its own progress. */
export function GroupedEquationList({
  equations,
  selectedId,
  progressByEquation,
  onSelectEquation,
  variant = "desktop",
}: GroupedEquationListProps): ReactElement {
  const groups = useMemo(() => groupEquationsBySubject(equations), [equations])
  return (
    <>
      {groups.map((group) => {
        const completed = group.equations.reduce(
          (count, equation) => count + (progressByEquation.get(equation.id)?.completed ? 1 : 0),
          0,
        )
        return (
          <section key={group.slug} aria-label={group.name} className="mb-5 last:mb-0">
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
              <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
                {group.name}
              </h3>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400" aria-label={`${completed} of ${group.equations.length} complete`}>
                {completed}/{group.equations.length}
              </span>
            </div>
            <EquationList
              equations={group.equations}
              selectedId={selectedId}
              progressByEquation={progressByEquation}
              onSelectEquation={onSelectEquation}
              variant={variant}
            />
          </section>
        )
      })}
    </>
  )
}

interface EquationListItemProps {
  equation: EquationSummary
  active: boolean
  done: boolean
  onSelectEquation: (id: number) => void
  variant: "desktop" | "mobile"
}

const EquationListItem = memo(function EquationListItem({
  equation,
  active,
  done,
  onSelectEquation,
  variant,
}: EquationListItemProps): ReactElement {
  const prefetch = () => {
    void prefetchEquationScene(equation.id)
  }
  const isFavorite = useIsFavorite(equation.id)

  return (
    <div className={`group/item relative rounded-xl border transition-colors ${active ? "border-ocean/20 bg-ocean/[0.07] dark:border-ocean/40 dark:bg-ocean/15" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
      <button
        className={`group flex min-h-[68px] w-full items-start gap-2.5 rounded-xl py-3 pl-3 pr-11 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocean ${variant === "mobile" ? "min-h-[72px]" : ""}`}
        onClick={() => onSelectEquation(equation.id)}
        onMouseEnter={prefetch}
        onTouchStart={prefetch}
        onFocus={prefetch}
        type="button"
        aria-current={active ? "page" : undefined}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${
            done
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
              : active
                ? "bg-ocean/10 text-ocean"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {done ? <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Completed</span></> : equation.id}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block break-words text-sm leading-snug ${
              active
                ? "font-semibold text-ocean dark:text-blue-300"
                : "font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
            }`}
          >
            {equation.title}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400" title={`${equation.author}, ${equation.year}`}>
            {equation.author}, {equation.year}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggleFavorite(equation.id)}
        aria-label={`${isFavorite ? "Remove from favourites" : "Add to favourites"}: ${equation.title}`}
        aria-pressed={isFavorite}
        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-slate-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:hover:bg-slate-700/60"
      >
        <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-400 text-amber-600 dark:text-amber-400" : "text-slate-400 group-hover/item:text-slate-500 dark:text-slate-500"}`} />
      </button>
    </div>
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
  if (isAuthenticated) {
    return (
      <div>
        <div className="flex items-center gap-1">
          <button onClick={onOpenProfile} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ocean" type="button" aria-label="Open profile">
            <Avatar className="h-9 w-9 rounded-xl">
              <AvatarFallback className="rounded-xl bg-ocean/10 text-sm font-semibold text-ocean">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{userEmail ?? "Your account"}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{isPro ? "Pro member" : "Free beta account"}</span>
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Sign out" className="h-11 w-11 shrink-0 rounded-xl text-slate-500">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        {compact && !isPro && BILLING_ENABLED && (
          <Button variant="outline" size="sm" onClick={onOpenPro} className="mt-2 h-11 w-full rounded-xl">
            <Crown className="h-4 w-4 text-amber-600" />
            Explore Pro
          </Button>
        )}
      </div>
    )
  }

  return (
    <button onClick={onOpenAuth} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ocean dark:hover:bg-slate-800" type="button" aria-label="Sign in">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ocean/10 text-ocean"><User className="h-4 w-4" /></span>
      <span>
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Sign in</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">Keep your progress across devices</span>
      </span>
    </button>
  )
})
