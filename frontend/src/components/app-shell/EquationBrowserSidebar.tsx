import type { ReactElement, RefObject } from "react"
// framer-motion removed — using ResizablePanel instead
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  User,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import type { EquationSummary } from "../../data/equationManifest"
import type { EquationProgress } from "../../progress/useProgress"
import { ResizablePanel } from "../ui/resizable-panel"

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

function EquationList({
  equations,
  selectedId,
  progressByEquation,
  onSelectEquation,
}: {
  equations: EquationSummary[]
  selectedId: number
  progressByEquation: Map<number, EquationProgress>
  onSelectEquation: (id: number) => void
}) {
  return equations.map((equation) => {
    const active = equation.id === selectedId
    const done = progressByEquation.get(equation.id)?.completed ?? false

    return (
      <Tooltip key={equation.id}>
        <TooltipTrigger asChild>
          <button
            className={`group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-all ${
              active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
            onClick={() => onSelectEquation(equation.id)}
            type="button"
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
              {done ? <CheckCircle2 className="h-3 w-3" /> : equation.id}
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
}

function SidebarAccount({
  compact = false,
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: {
  compact?: boolean
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  onOpenProfile: () => void
  onOpenAuth: () => void
  onOpenPro: () => void
  onLogout: () => void
}) {
  if (compact) {
    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-3">
          <button onClick={onOpenProfile} type="button" className="flex-shrink-0">
            <Avatar className="h-8 w-8 transition hover:ring-2 hover:ring-ocean/50">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </button>
          <button onClick={onOpenProfile} className="min-w-0 flex-1 text-left transition hover:opacity-70" type="button">
            <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{userEmail}</p>
            <p className="text-[10px] text-slate-400">{isPro ? "Pro" : "Free"}</p>
          </button>
          {!isPro && (
            <Button variant="outline" size="xs" onClick={onOpenPro}>
              <Crown className="h-3 w-3 text-amber-500" />
              Pro
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onLogout}>
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
        <button onClick={onOpenProfile} className="flex items-center gap-1.5 min-w-0 flex-1 text-left transition hover:opacity-70" type="button">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ocean/10 text-[9px] font-bold text-ocean">
            {userInitial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{userEmail}</span>
        </button>
        <button onClick={onLogout} className="text-slate-300 hover:text-slate-500" type="button">
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
}

export function EquationBrowserSidebar({
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
            className="hidden flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <button onClick={onGoHome} className="text-sm font-semibold text-slate-900 transition hover:text-slate-600 dark:text-white" type="button">
                Formulas
              </button>
              <div className="flex items-center">
                <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="h-6 w-6">
                  {dark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="h-6 w-6">
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {completedCount > 0 && (
              <div className="mx-3 mb-1">
                <Progress value={(completedCount / total) * 100} className="h-0.5" />
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
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="text-slate-400">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onToggleTheme} className="text-slate-400">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {prevEquation && (
            <Button variant="ghost" size="icon-sm" onClick={() => onSelectEquation(prevEquation.id)} title={prevEquation.title} className="text-slate-400">
              <ArrowLeft className="h-3 w-3 rotate-90" />
            </Button>
          )}
          {nextEquation && (
            <Button variant="ghost" size="icon-sm" onClick={() => onSelectEquation(nextEquation.id)} title={nextEquation.title} className="text-slate-400">
              <ArrowLeft className="h-3 w-3 -rotate-90" />
            </Button>
          )}
          {!isAuthenticated && (
            <Button variant="ghost" size="icon-sm" onClick={onOpenAuth} className="mt-auto text-slate-400">
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={onOpenDrawer}>
        <SheetContent side="left" className="lg:hidden">
          <SheetHeader>
            <div>
              <SheetTitle>{equations.length} Equations</SheetTitle>
              <p className="text-[11px] text-slate-400">That Changed the World</p>
            </div>
          </SheetHeader>
          {completedCount > 0 && (
            <div className="mx-5 mb-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{completedCount}/{total}</span>
                <span className="text-slate-400">{totalTimeMinutes}m</span>
              </div>
              <Progress value={(completedCount / total) * 100} className="mt-1 h-1" />
            </div>
          )}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-0.5 pb-4">
              <EquationList
                equations={equations}
                selectedId={selectedId}
                progressByEquation={progressByEquation}
                onSelectEquation={onSelectEquation}
              />
            </div>
          </ScrollArea>
          <Separator />
          <div className="px-5 py-3">
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
    </>
  )
}
