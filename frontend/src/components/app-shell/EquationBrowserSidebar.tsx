import type { ReactElement, RefObject } from "react"
import { lazy, memo, Suspense } from "react"
import {
  ArrowLeft,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  User,
  X,
} from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { ErrorBoundary } from "../ErrorBoundary"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { ResizablePanel } from "../ui/resizable-panel"
import { prefetchEquationScene } from "../sceneRegistry"
import { EquationList, SidebarAccount } from "./EquationSidebarShared"

const EquationBrowserDrawer = lazy(() =>
  import("./EquationBrowserDrawer").then((module) => ({ default: module.EquationBrowserDrawer })),
)

interface EquationBrowserSidebarProps {
  equations: EquationSummary[]
  filteredEquations: EquationSummary[] | null
  selectedId: number
  sidebarOpen: boolean
  drawerOpen: boolean
  searchQuery: string
  dark: boolean
  completedCount: number
  total: number
  totalTimeMinutes: number
  progressByEquation: Map<number, EquationProgress>
  prevEquation: EquationSummary | null
  nextEquation: EquationSummary | null
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  searchInputRef: RefObject<HTMLInputElement | null>
  onSelectEquation: (id: number) => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  onOpenDrawer: (open: boolean) => void
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onGoHome: () => void
  onOpenProfile: () => void
  onOpenAuth: () => void
  onOpenPro: () => void
  onLogout: () => void
}

function EquationBrowserSidebarComponent({
  equations,
  filteredEquations,
  selectedId,
  sidebarOpen,
  drawerOpen,
  searchQuery,
  dark,
  completedCount,
  total,
  totalTimeMinutes,
  progressByEquation,
  prevEquation,
  nextEquation,
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  searchInputRef,
  onSelectEquation,
  onSearchChange,
  onClearSearch,
  onOpenDrawer,
  onToggleSidebar,
  onToggleTheme,
  onGoHome,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: EquationBrowserSidebarProps): ReactElement {
  const visibleEquations = filteredEquations ?? equations
  const completionPercent = total > 0 ? (completedCount / total) * 100 : 0
  const completionLabel = `${completedCount} of ${total} equations completed`

  return (
    <>
      {sidebarOpen ? (
          <ResizablePanel
            edge="right"
            defaultWidth={220}
            minWidth={160}
            maxWidth={360}
            open={sidebarOpen}
            onCollapse={onToggleSidebar}
            storageKey="sciencebouk-sidebar-width"
            wrapperClassName="hidden lg:flex"
            className="flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <button onClick={onGoHome} className="text-sm font-semibold text-slate-900 transition hover:text-slate-600 dark:text-white" type="button">
                Formulas
              </button>
              <div className="flex items-center">
                <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-6 w-6" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
                  {dark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="h-6 w-6" aria-label="Collapse sidebar">
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {completedCount > 0 && (
              <div className="mx-3 mb-1">
                <Progress
                  value={completionPercent}
                  className="h-0.5"
                  aria-label="Equation completion"
                  aria-valuetext={completionLabel}
                />
                <span className="sr-only">{completionLabel}</span>
              </div>
            )}

            <div className="px-3 pb-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-300" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search ( / )"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-1 pl-7 pr-6 text-xs text-slate-900 placeholder-slate-300 outline-none transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {searchQuery && (
                  <button onClick={onClearSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500" type="button">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 px-2">
              <div className="space-y-0.5 pb-2">
                {visibleEquations.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">No results</p>
                ) : (
                  <EquationList
                    equations={visibleEquations}
                    selectedId={selectedId}
                    progressByEquation={progressByEquation}
                    onSelectEquation={onSelectEquation}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              <SidebarAccount
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
          </ResizablePanel>
      ) : null}

      {!sidebarOpen && (
        <div className="hidden flex-shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white px-1.5 py-3 dark:border-slate-800 dark:bg-slate-900 lg:flex">
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="text-slate-400" aria-label="Open sidebar">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="text-slate-400" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {prevEquation && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onSelectEquation(prevEquation.id)}
              onMouseEnter={() => {
                void prefetchEquationScene(prevEquation.id)
              }}
              onFocus={() => {
                void prefetchEquationScene(prevEquation.id)
              }}
              aria-label={`Previous equation: ${prevEquation.title}`}
              className="text-slate-400"
            >
              <ArrowLeft className="h-3 w-3 rotate-90" />
            </Button>
          )}
          {nextEquation && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onSelectEquation(nextEquation.id)}
              onMouseEnter={() => {
                void prefetchEquationScene(nextEquation.id)
              }}
              onFocus={() => {
                void prefetchEquationScene(nextEquation.id)
              }}
              aria-label={`Next equation: ${nextEquation.title}`}
              className="text-slate-400"
            >
              <ArrowLeft className="h-3 w-3 -rotate-90" />
            </Button>
          )}
          {!isAuthenticated && (
            <Button variant="ghost" size="icon-sm" onClick={onOpenAuth} className="mt-auto text-slate-400" aria-label="Sign in">
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {drawerOpen && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <EquationBrowserDrawer
              open={drawerOpen}
              equations={equations}
              filteredEquations={filteredEquations}
              selectedId={selectedId}
              completedCount={completedCount}
              total={total}
              totalTimeMinutes={totalTimeMinutes}
              progressByEquation={progressByEquation}
              searchQuery={searchQuery}
              isAuthenticated={isAuthenticated}
              isPro={isPro}
              userEmail={userEmail}
              userInitial={userInitial}
              onOpenChange={onOpenDrawer}
              onSelectEquation={onSelectEquation}
              onSearchChange={onSearchChange}
              onClearSearch={onClearSearch}
              onOpenProfile={onOpenProfile}
              onOpenAuth={onOpenAuth}
              onOpenPro={onOpenPro}
              onLogout={onLogout}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}

export const EquationBrowserSidebar = memo(EquationBrowserSidebarComponent)
