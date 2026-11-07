import type { ReactElement, RefObject } from "react"
import { memo, useId, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Crown,
  LogOut,
  Search,
  Star,
  User,
  X,
} from "lucide-react"
import { toggleFavorite, useIsFavorite } from "../../lib/useFavorites"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { groupEquationsBySubject } from "../../data/equationGroups"
import { prefetchEquationScene } from "../sceneRegistry"
import { BILLING_ENABLED } from "../../config/billing"

interface EquationLibrarySearchProps {
  inputRef: RefObject<HTMLInputElement | null>
  searchQuery: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  initiallyExpanded?: boolean
}

/** Keep the input mounted so the global search shortcut can focus and reveal it. */
export function EquationLibrarySearch({
  inputRef,
  searchQuery,
  onSearchChange,
  onClearSearch,
  initiallyExpanded = false,
}: EquationLibrarySearchProps): ReactElement {
  const [searchExpanded, setSearchExpanded] = useState(initiallyExpanded)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputId = useId()
  const expanded = searchExpanded || Boolean(searchQuery)
  const closeSearch = () => {
    onClearSearch()
    setSearchExpanded(false)
    triggerRef.current?.focus()
  }

  return (
    <div>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Equation library</h3>
        <button
          ref={triggerRef}
          type="button"
          aria-label={expanded ? "Close equation search" : "Search equations"}
          aria-expanded={expanded}
          aria-controls={inputId}
          title={expanded ? "Close search" : "Search equations (/)"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ocean dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          onClick={() => {
            if (expanded) {
              closeSearch()
              return
            }
            setSearchExpanded(true)
            inputRef.current?.focus()
          }}
        >
          {expanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      <div className={expanded ? "relative pb-3" : "sr-only"}>
        <Search className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={inputId}
          aria-label="Search equations"
          type="search"
          placeholder="Equation or scientist"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setSearchExpanded(true)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return
            event.preventDefault()
            event.stopPropagation()
            closeSearch()
          }}
          className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-11 text-base text-slate-900 placeholder:text-sm placeholder:text-slate-400 outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searchQuery && (
          <button
            onClick={() => { onClearSearch(); inputRef.current?.focus() }}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-slate-500 outline-none transition hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ocean dark:hover:text-white"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

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
    <div className="space-y-0.5">
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
          <section key={group.slug} aria-label={group.name} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {group.name}
              </h3>
              <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500" aria-label={`${completed} of ${group.equations.length} complete`}>
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
    <div className={`group/item relative rounded-lg transition-colors ${active ? "bg-ocean/[0.08] dark:bg-ocean/20" : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"}`}>
      <button
        className={`group flex min-h-[62px] w-full items-start gap-2 rounded-lg py-2.5 pl-3 pr-10 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocean [@media(pointer:coarse)]:pr-11 ${variant === "mobile" ? "min-h-[68px]" : ""}`}
        onClick={() => onSelectEquation(equation.id)}
        onMouseEnter={prefetch}
        onTouchStart={prefetch}
        onFocus={prefetch}
        type="button"
        aria-current={active ? "page" : undefined}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums ${
            done
              ? "text-emerald-700 dark:text-emerald-400"
              : active
                ? "text-ocean dark:text-blue-300"
                : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {done ? <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Completed</span></> : equation.id}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block break-words text-[13px] leading-snug ${
              active
                ? "font-semibold text-ocean dark:text-blue-300"
                : "font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white"
            }`}
          >
            {equation.title}
          </span>
          <span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-slate-400" title={`${equation.author}, ${equation.year}`}>
            {equation.author}, {equation.year}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggleFavorite(equation.id)}
        aria-label={`${isFavorite ? "Remove from favourites" : "Add to favourites"}: ${equation.title}`}
        aria-pressed={isFavorite}
        className="absolute right-0 top-1/2 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-slate-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:hover:bg-slate-700/60 [@media(pointer:coarse)]:w-11"
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
          <button onClick={onOpenProfile} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ocean" type="button" aria-label="Open profile">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarFallback className="rounded-full bg-ocean/10 text-xs font-semibold text-ocean dark:text-blue-300">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-200">{userEmail ?? "Your account"}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{isPro ? "Pro member" : "Free beta account"}</span>
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Sign out" className="h-11 w-11 shrink-0 rounded-lg text-slate-500">
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
    <button onClick={onOpenAuth} className="flex min-h-12 w-full items-center gap-2.5 rounded-lg text-left outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ocean dark:hover:bg-slate-800" type="button" aria-label="Sign in">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean/10 text-ocean dark:text-blue-300"><User className="h-4 w-4" /></span>
      <span>
        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Sign in</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">Keep your progress across devices</span>
      </span>
    </button>
  )
})
