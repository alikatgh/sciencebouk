import type { ReactElement, RefObject } from "react"
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { EquationLibrarySearch, EquationList, GroupedEquationList, SidebarAccount } from "./EquationSidebarShared"
import { BrandMark } from "../BrandMark"
import { SITE_NAME } from "../../config/site"

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
        className="w-screen rounded-none border-r-0 bg-[#f4f7fb] sm:w-[min(92vw,23rem)] sm:rounded-r-xl sm:border-r dark:bg-slate-950 lg:hidden [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-lg [&>button]:border-0 [&>button]:p-0 [&>button]:shadow-none"
      >
        <SheetHeader className="h-16 shrink-0 border-b border-slate-200/80 px-4 py-0 sm:pt-0 dark:border-slate-800">
          <div className="min-w-0 pr-11">
            <button onClick={onGoHome} type="button" aria-label="Back to subjects" className="flex min-h-11 items-center gap-2.5 rounded-lg text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ocean">
              <BrandMark className="h-8 w-8 shrink-0 text-ocean" />
              <span>
                <span className="block font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">{SITE_NAME}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">Back to subjects</span>
              </span>
            </button>
            <SheetTitle className="sr-only">Equation library</SheetTitle>
          </div>
        </SheetHeader>
        <div className="shrink-0 px-4 pb-2 pt-2">
          <EquationLibrarySearch inputRef={searchInputRef} searchQuery={searchQuery} onSearchChange={onSearchChange} onClearSearch={onClearSearch} initiallyExpanded={focusSearchOnOpen} />
          <nav aria-label="Browse nearby equations" className="flex gap-2 [@media(max-height:600px)]:hidden">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 rounded-lg text-xs"
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
              className="min-h-11 flex-1 rounded-lg text-xs"
              onClick={() => nextEquation && onSelectEquation(nextEquation.id)}
              disabled={!nextEquation}
              aria-label={nextEquation ? `Next equation: ${nextEquation.title}` : "Next equation"}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </nav>
          {filteredEquations && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400" role="status">{visibleEquations.length} {visibleEquations.length === 1 ? "equation" : "equations"} found</p>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1 px-2">
          <div className="pb-4">
            {visibleEquations.length === 0 ? (
              <div className="mx-3 px-4 py-8 text-center">
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
        <div className="shrink-0 border-t border-slate-200/80 px-4 pb-2 pt-3 dark:border-slate-800">
          <div className="mb-3 px-1 [@media(max-height:600px)]:hidden">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span><span className="font-semibold text-slate-700 dark:text-slate-200">{completedCount}/{total}</span> completed</span>
              <span>{totalTimeMinutes} min explored</span>
            </div>
            <Progress value={completionPercent} className="h-1 bg-slate-200 dark:bg-slate-800" aria-label="Equation completion" aria-valuetext={completionLabel} />
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
            <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-11 w-11 shrink-0 rounded-lg text-slate-500" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
