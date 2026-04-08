import type { ReactElement } from "react"
import { Search, X } from "lucide-react"
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="lg:hidden">
        <SheetHeader className="sticky top-0 z-10 border-b border-slate-100 bg-white/92 px-4 pb-3 pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/92">
          <div className="w-full pr-10">
            <div className="mb-3 flex justify-center">
              <span className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Equation atlas
            </p>
            <SheetTitle className="mt-1 text-lg">{equations.length} equations</SheetTitle>
            <p className="mt-1 text-xs text-slate-400">Browse, jump, and pick up where you left off.</p>
          </div>
        </SheetHeader>
        <div className="px-4 pb-3">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3.5 py-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}/{total} complete</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-400 shadow-sm dark:bg-slate-900">{totalTimeMinutes}m explored</span>
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
        <div className="px-4 pb-3">
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
        <ScrollArea className="flex-1 px-4">
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
        <div className="bg-white/92 px-4 pt-3 backdrop-blur dark:bg-slate-900/92">
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
