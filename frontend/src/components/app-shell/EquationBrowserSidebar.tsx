import type { ReactElement, RefObject } from "react"
import { lazy, memo, Suspense } from "react"
import {
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  User,
} from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { ErrorBoundary } from "../ErrorBoundary"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { ResizablePanel } from "../ui/resizable-panel"
import { SITE_NAME } from "../../config/site"
import { BrandMark } from "../BrandMark"
import { EquationLibrarySearch, EquationList, GroupedEquationList, SidebarAccount } from "./EquationSidebarShared"

const SIDEBAR_DEFAULT_WIDTH = 248
const SIDEBAR_MIN_WIDTH = 224
const SIDEBAR_MAX_WIDTH = 400

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
  drawerSearchInputRef: RefObject<HTMLInputElement | null>
  focusDrawerSearch: boolean
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
  drawerSearchInputRef,
  focusDrawerSearch,
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
            defaultWidth={SIDEBAR_DEFAULT_WIDTH}
            minWidth={SIDEBAR_MIN_WIDTH}
            maxWidth={SIDEBAR_MAX_WIDTH}
            open={sidebarOpen}
            onCollapse={onToggleSidebar}
            storageKey="sciencebouk-sidebar-width"
            wrapperClassName="hidden lg:flex"
            className="flex flex-col border-r border-slate-200/80 bg-[#f4f7fb] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex h-[72px] shrink-0 items-center justify-between gap-1 border-b border-slate-200/70 px-3 dark:border-slate-800">
              <button onClick={onGoHome} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg font-display text-[15px] font-extrabold tracking-tight text-slate-900 outline-none transition hover:text-ocean focus-visible:ring-2 focus-visible:ring-ocean dark:text-white" type="button" aria-label={`${SITE_NAME} home`}>
                <BrandMark className="h-7 w-7 shrink-0 text-ocean" />
                {SITE_NAME}
              </button>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="h-11 w-11 rounded-lg text-slate-500" aria-label="Collapse sidebar">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="shrink-0 px-4 pt-2">
              <EquationLibrarySearch inputRef={searchInputRef} searchQuery={searchQuery} onSearchChange={onSearchChange} onClearSearch={onClearSearch} />
              {filteredEquations && <p className="pb-3 text-xs text-slate-500 dark:text-slate-400" role="status">{visibleEquations.length} {visibleEquations.length === 1 ? "equation" : "equations"} found</p>}
            </div>

            <ScrollArea className="min-h-0 flex-1 px-2">
              <div className="pb-4">
                {visibleEquations.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No matching equations</p>
                    <p className="mt-2 text-sm text-slate-500">Try an equation or scientist’s name.</p>
                    <Button variant="outline" size="sm" onClick={onClearSearch} className="mt-4 rounded-xl">Clear search</Button>
                  </div>
                ) : filteredEquations ? (
                  <EquationList
                    equations={filteredEquations}
                    selectedId={selectedId}
                    progressByEquation={progressByEquation}
                    onSelectEquation={onSelectEquation}
                  />
                ) : (
                  <GroupedEquationList
                    equations={equations}
                    selectedId={selectedId}
                    progressByEquation={progressByEquation}
                    onSelectEquation={onSelectEquation}
                  />
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-slate-200/80 px-4 py-3 dark:border-slate-800">
              <div className="mb-3 px-1">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span><span className="font-semibold text-slate-700 dark:text-slate-200">{completedCount}/{total}</span> completed</span>
                  <span>{totalTimeMinutes} min explored</span>
                </div>
                <Progress value={completionPercent} className="h-1 bg-slate-200 dark:bg-slate-800" aria-label="Equation completion" aria-valuetext={completionLabel} />
              </div>
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
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
                <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-11 w-11 shrink-0 rounded-lg text-slate-500" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </ResizablePanel>
      ) : null}

      {!sidebarOpen && (
        <div className="hidden w-[64px] flex-shrink-0 flex-col items-center gap-2 border-r border-slate-200/80 bg-[#f4f7fb] py-4 dark:border-slate-800 dark:bg-slate-950 lg:flex">
          <Button variant="ghost" size="icon-sm" onClick={onGoHome} className="h-11 w-11 rounded-lg text-ocean" aria-label={`${SITE_NAME} home`}>
            <BrandMark className="h-7 w-7" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="h-11 w-11 rounded-xl text-slate-500" aria-label="Open sidebar">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-11 w-11 rounded-xl text-slate-500" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={isAuthenticated ? onOpenProfile : onOpenAuth} className="mt-auto h-11 w-11 rounded-xl text-slate-500" aria-label={isAuthenticated ? "Open profile" : "Sign in"}>
            <User className="h-4 w-4" />
          </Button>
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
              prevEquation={prevEquation}
              nextEquation={nextEquation}
              searchQuery={searchQuery}
              dark={dark}
              searchInputRef={drawerSearchInputRef}
              focusSearchOnOpen={focusDrawerSearch}
              isAuthenticated={isAuthenticated}
              isPro={isPro}
              userEmail={userEmail}
              userInitial={userInitial}
              onOpenChange={onOpenDrawer}
              onSelectEquation={onSelectEquation}
              onSearchChange={onSearchChange}
              onClearSearch={onClearSearch}
              onGoHome={onGoHome}
              onToggleTheme={onToggleTheme}
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
