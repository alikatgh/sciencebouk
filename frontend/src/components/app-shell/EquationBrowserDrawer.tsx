import type { ReactElement, RefObject } from "react"
import { ArrowLeft, ArrowRight, Moon, Search, Sun, X } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { EquationList, GroupedEquationList, SidebarAccount } from "./EquationSidebarShared"

interface EquationBrowserDrawerProps {
  open: boolean
  equations: EquationSummary[]
  filteredEquations: EquationSummary[] | null
  selectedId: number
  completedCount: number
  total: number
  totalTimeMinutes: number
  progressByEquation: Map<number, EquationProgress>
  prevEquation: EquationSummary | null
  nextEquation: EquationSummary | null
  searchQuery: string
  dark: boolean
  searchInputRef: RefObject<HTMLInputElement | null>
  focusSearchOnOpen: boolean
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  onOpenChange: (open: boolean) => void
  onSelectEquation: (id: number) => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  onGoHome: () => void
  onToggleTheme: () => void
  onOpenProfile: () => void
  onOpenAuth: () => void
  onOpenPro: () => void
  onLogout: () => void
}

export function EquationBrowserDrawer({
  open,
  equations,
  filteredEquations,
  selectedId,
  completedCount,
  total,
  totalTimeMinutes,
  progressByEquation,
  prevEquation,
  nextEquation,
  searchQuery,
  dark,
  searchInputRef,
  focusSearchOnOpen,
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  onOpenChange,
  onSelectEquation,
  onSearchChange,
  onClearSearch,
  onGoHome,
  onToggleTheme,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: EquationBrowserDrawerProps): ReactElement {
  const completionPercent = total > 0 ? (completedCount / total) * 100 : 0
  const completionLabel = `${completedCount} of ${total} equations completed`
  const visibleEquations = filteredEquations ?? equations

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        onOpenAutoFocus={(event) => {
          if (!focusSearchOnOpen) return
          event.preventDefault()
          searchInputRef.current?.focus()
        }}
        className="w-screen rounded-none border-r-0 bg-white sm:w-[min(92vw,25rem)] sm:rounded-r-2xl sm:border-r dark:bg-slate-950 lg:hidden"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-4 dark:border-slate-800">
          <div className="min-w-0 pr-10">
            <button onClick={onGoHome} type="button" className="mb-2 flex min-h-9 items-center gap-2 rounded-lg text-sm font-medium text-ocean outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ocean">
              <ArrowLeft className="h-4 w-4" />
              Back to subjects
            </button>
            <SheetTitle className="text-xl">Equation library</SheetTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{equations.length} interactive equations to explore</p>
          </div>
        </SheetHeader>
        <div className="shrink-0 px-5 pb-3 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              aria-label="Search equations"
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search equations or scientists"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-11 text-base text-slate-900 placeholder:text-sm placeholder:text-slate-500 outline-none transition focus:border-ocean focus:bg-white focus:ring-2 focus:ring-ocean/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:hover:text-white"
                type="button"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <nav aria-label="Browse nearby equations" className="mt-3 flex gap-2 [@media(max-height:600px)]:hidden">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 rounded-xl text-sm"
              onClick={() => prevEquation && onSelectEquation(prevEquation.id)}
              disabled={!prevEquation}
              aria-label={prevEquation ? `Previous equation: ${prevEquation.title}` : "Previous equation"}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 rounded-xl text-sm"
              onClick={() => nextEquation && onSelectEquation(nextEquation.id)}
              disabled={!nextEquation}
              aria-label={nextEquation ? `Next equation: ${nextEquation.title}` : "Next equation"}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </nav>
          {filteredEquations && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400" role="status">{visibleEquations.length} {visibleEquations.length === 1 ? "equation" : "equations"} found</p>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1 px-2">
          <div className="pb-4">
            {visibleEquations.length === 0 ? (
              <div className="mx-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No matching equations</p>
                <p className="mt-2 text-sm text-slate-500">Try an equation or scientist’s name.</p>
                <Button variant="outline" size="sm" onClick={onClearSearch} className="mt-4 min-h-11 rounded-xl">Clear search</Button>
              </div>
            ) : filteredEquations ? (
              <EquationList
                equations={visibleEquations}
                selectedId={selectedId}
                progressByEquation={progressByEquation}
                onSelectEquation={onSelectEquation}
                variant="mobile"
              />
            ) : (
              <GroupedEquationList
                equations={visibleEquations}
                selectedId={selectedId}
                progressByEquation={progressByEquation}
                onSelectEquation={onSelectEquation}
                variant="mobile"
              />
            )}
          </div>
        </ScrollArea>
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 px-1 [@media(max-height:600px)]:hidden">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span><span className="font-semibold text-slate-700 dark:text-slate-200">{completedCount}/{total}</span> completed</span>
              <span>{totalTimeMinutes} min explored</span>
            </div>
            <Progress value={completionPercent} className="h-1.5" aria-label="Equation completion" aria-valuetext={completionLabel} />
          </div>
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <SidebarAccount
                compact
                isAuthenticated={isAuthenticated}
                isPro={isPro}
                userEmail={userEmail}
                userInitial={userInitial}
                onOpenProfile={onOpenProfile}
                onOpenAuth={onOpenAuth}
                onOpenPro={onOpenPro}
                onLogout={onLogout}
              />
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-11 w-11 shrink-0 rounded-xl text-slate-500" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
