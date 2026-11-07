import type { ReactElement, ReactNode } from "react"
import { Component, lazy, memo, Suspense, useState } from "react"
import { ChevronLeft, ChevronRight, Info, Menu, User } from "lucide-react"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import type { EquationSummary } from "../../data/equationManifest"
import { prefetchEquationScene } from "../sceneRegistry"

const ScientistModal = lazy(() =>
  import("../ScientistModal").then((module) => ({ default: module.ScientistModal })),
)

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled
                className="hidden cursor-not-allowed text-[11px] text-slate-300 sm:inline"
                type="button"
                aria-label="Scientist info unavailable"
              >
                Info
              </button>
            </TooltipTrigger>
            <TooltipContent>Info unavailable</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return this.props.children
  }
}

interface EquationHeaderProps {
  equation: EquationSummary
  phoneLayout?: boolean
  sidebarOpen: boolean
  prevEquation: EquationSummary | null
  nextEquation: EquationSummary | null
  isAuthenticated: boolean
  userInitial: string
  onOpenDrawer: () => void
  onOpenProfile: () => void
  onOpenAuth: () => void
  onSelectEquation: (id: number) => void
}

function EquationHeaderComponent({
  equation,
  phoneLayout = false,
  prevEquation,
  nextEquation,
  isAuthenticated,
  userInitial,
  onOpenDrawer,
  onOpenProfile,
  onOpenAuth,
  onSelectEquation,
}: EquationHeaderProps): ReactElement {
  return (
    <header
      className={`sticky top-0 z-20 flex flex-shrink-0 items-center border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 ${phoneLayout ? "gap-0.5 px-2 pb-2" : "gap-3 px-4 pb-3 lg:gap-5 lg:px-6"}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.65rem)" }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenDrawer}
        className="h-11 w-11 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 lg:hidden"
        aria-label="Open equation browser"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className={`flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400 ${phoneLayout ? "text-[10px]" : "text-[11px]"}`}>
          <span className="shrink-0 tabular-nums">Equation {String(equation.id).padStart(2, "0")}</span>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate capitalize">{equation.category.replaceAll("_", " ")}</span>
        </div>
        <div className={`flex min-w-0 items-center gap-3 ${phoneLayout ? "mt-1" : "mt-0.5"}`}>
          <h2 className={`line-clamp-2 min-w-0 font-display font-bold leading-snug tracking-tight text-slate-900 dark:text-white ${phoneLayout ? "text-sm" : "text-lg lg:text-xl"}`} title={equation.title}>
            {equation.title}
          </h2>
          {!phoneLayout && <ScientistButton key={equation.id} equationId={equation.id} author={equation.author} year={equation.year} />}
        </div>
      </div>
      {phoneLayout && <ScientistButton key={equation.id} compact equationId={equation.id} author={equation.author} year={equation.year} />}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
        className={`${phoneLayout ? "hidden" : "inline-flex"} h-11 w-11 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 lg:hidden`}
        aria-label={isAuthenticated ? "Open profile" : "Sign in"}
      >
        {isAuthenticated ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
          </Avatar>
        ) : (
          <User className="h-5 w-5" />
        )}
      </Button>
      <nav aria-label="Equation navigation" className={`flex shrink-0 items-center ${phoneLayout ? "gap-0.5" : "gap-1.5"}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={!prevEquation}
          onClick={() => { if (prevEquation) onSelectEquation(prevEquation.id) }}
          onTouchStart={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          onMouseEnter={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          onFocus={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          className={`h-11 shrink-0 rounded-lg text-sm text-slate-600 dark:text-slate-300 ${phoneLayout ? "w-11 border-transparent px-0 dark:border-transparent dark:bg-transparent" : "w-11 border-slate-200 px-0 dark:border-slate-700 xl:w-auto xl:px-3"}`}
          aria-label={prevEquation ? `Previous equation: ${prevEquation.title}` : "Previous equation"}
          title={prevEquation?.title}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className={phoneLayout ? "hidden" : "hidden xl:inline"}>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!nextEquation}
          onClick={() => { if (nextEquation) onSelectEquation(nextEquation.id) }}
          onTouchStart={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          onMouseEnter={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          onFocus={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          className={`h-11 shrink-0 rounded-lg text-sm text-slate-600 dark:text-slate-300 ${phoneLayout ? "w-11 border-transparent px-0 dark:border-transparent dark:bg-transparent" : "w-11 border-slate-200 px-0 dark:border-slate-700 xl:w-auto xl:px-3"}`}
          aria-label={nextEquation ? `Next equation: ${nextEquation.title}` : "Next equation"}
          title={nextEquation?.title}
        >
          <span className={phoneLayout ? "hidden" : "hidden xl:inline"}>Next</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      </nav>
    </header>
  )
}

export const EquationHeader = memo(EquationHeaderComponent)

function ScientistButton({ equationId, author, year, compact = false }: { equationId: number; author: string; year: string; compact?: boolean }): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg text-xs text-slate-500 outline-none transition hover:bg-slate-50 hover:text-ocean focus-visible:ring-2 focus-visible:ring-ocean dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300 ${compact ? "h-11 w-11" : "min-h-7 px-1 [@media(pointer:coarse)]:min-h-11"}`}
        type="button"
        aria-label={`Learn about ${author}`}
        aria-haspopup="dialog"
        title={`Learn about ${author}, ${year}`}
      >
        <Info className={`${compact ? "h-4 w-4" : "h-3.5 w-3.5"} shrink-0`} />
        {!compact && <span className="hidden max-w-40 truncate xl:inline">{author}, {year}</span>}
      </button>
      {open && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ScientistModal open={open} onClose={() => setOpen(false)} equationId={equationId} />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </>
  )
}
