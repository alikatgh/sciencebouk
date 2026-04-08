import type { ReactElement } from "react"
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { EquationList, SidebarAccount } from "./EquationSidebarShared"

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
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  onOpenChange: (open: boolean) => void
  onSelectEquation: (id: number) => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
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
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  onOpenChange,
  onSelectEquation,
  onSearchChange,
  onClearSearch,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: EquationBrowserDrawerProps): ReactElement {
  const completionPercent = total > 0 ? (completedCount / total) * 100 : 0
  const completionLabel = `${completedCount} of ${total} equations completed`
  const visibleEquations = filteredEquations ?? equations
  const selectedEquation = equations.find((equation) => equation.id === selectedId) ?? null
  const selectedDone = progressByEquation.get(selectedId)?.completed ?? false

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-screen rounded-none border-r-0 bg-slate-50 lg:hidden sm:w-[min(92vw,23rem)] sm:rounded-r-[32px] sm:border-r sm:bg-white dark:bg-slate-950 sm:dark:bg-slate-900"
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/92 px-4 pb-3 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
          <div className="w-full pr-10">
            <div className="mb-3 flex justify-center">
              <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Equation atlas
            </p>
            <div className="mt-1 flex items-center gap-2">
              <SheetTitle className="text-lg">{equations.length} equations</SheetTitle>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {completedCount}/{total}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Browse, jump, and stay in flow.</p>
          </div>
        </SheetHeader>
        <div className="border-b border-slate-200/70 bg-white/88 px-4 pb-3 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/88">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-3.5 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}/{total} complete</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-400 shadow-sm dark:bg-slate-950">{totalTimeMinutes}m explored</span>
            </div>
            <Progress
              value={completionPercent}
              className="mt-2 h-1.5"
              aria-label="Equation completion"
              aria-valuetext={completionLabel}
            />
            <span className="sr-only">{completionLabel}</span>
          </div>
        </div>
        <div className="bg-white px-4 pb-3 pt-3 dark:bg-slate-950">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search equations"
              className="h-12 w-full rounded-[22px] border border-slate-200 bg-slate-50 py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-300 transition hover:bg-slate-200/80 hover:text-slate-500 dark:hover:bg-slate-700"
                type="button"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {selectedEquation && (
          <div className="bg-white px-4 pb-3 dark:bg-slate-950">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-3.5 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Currently viewing</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{selectedEquation.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{selectedEquation.author}, {selectedEquation.year}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  selectedDone
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-ocean/10 text-ocean"
                }`}>
                  {selectedDone ? "Done" : "Current"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[42px] rounded-2xl justify-center"
                  onClick={() => prevEquation && onSelectEquation(prevEquation.id)}
                  disabled={!prevEquation}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[42px] rounded-2xl justify-center"
                  onClick={() => nextEquation && onSelectEquation(nextEquation.id)}
                  disabled={!nextEquation}
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <ScrollArea className="native-scroll flex-1 bg-white px-4 dark:bg-slate-950">
          {visibleEquations.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
              No equations match that search yet.
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              <EquationList
                equations={visibleEquations}
                selectedId={selectedId}
                progressByEquation={progressByEquation}
                onSelectEquation={onSelectEquation}
                variant="mobile"
              />
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="bg-white/92 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur dark:bg-slate-950/92">
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
      </SheetContent>
    </Sheet>
  )
}
