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
      className={`sticky top-0 z-20 flex flex-shrink-0 items-center border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${phoneLayout ? "flex-nowrap gap-x-1 px-2 pb-1.5" : "flex-wrap gap-3 px-6 pb-3 lg:flex-nowrap lg:gap-5 lg:pb-4"}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.4rem)" }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenDrawer}
        className={`order-1 h-11 w-11 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-200 lg:hidden ${phoneLayout ? "" : "border border-slate-200 dark:border-slate-700"}`}
        aria-label="Open equation browser"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="order-2 min-w-0 flex-1">
        <h2 className={`line-clamp-2 font-display font-bold leading-snug tracking-tight text-slate-900 dark:text-white ${phoneLayout ? "text-sm" : "text-xl"}`} title={equation.title}>
          {equation.title}
        </h2>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`${phoneLayout ? "hidden" : "inline"} text-xs capitalize text-slate-500 dark:text-slate-400`}>
            {equation.category.replaceAll("_", " ")}
          </span>
          <ScientistButton key={equation.id} equationId={equation.id} author={equation.author} year={equation.year} />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
        className={`${phoneLayout ? "hidden" : "inline-flex"} order-3 h-11 w-11 shrink-0 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 lg:hidden`}
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
      <nav aria-label="Equation navigation" className={`order-4 flex shrink-0 items-center ${phoneLayout ? "gap-0.5" : "basis-full gap-2 lg:basis-auto"}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={!prevEquation}
          onClick={() => { if (prevEquation) onSelectEquation(prevEquation.id) }}
          onTouchStart={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          onMouseEnter={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          onFocus={() => { if (prevEquation) void prefetchEquationScene(prevEquation.id) }}
          className={`h-11 min-w-0 shrink-0 rounded-xl text-sm text-slate-600 dark:text-slate-300 ${phoneLayout ? "w-11 border-transparent px-0" : "flex-1 border-slate-200 px-4 dark:border-slate-700 lg:flex-none"}`}
          aria-label={prevEquation ? `Previous equation: ${prevEquation.title}` : "Previous equation"}
          title={prevEquation?.title}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className={phoneLayout ? "hidden" : "inline"}>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!nextEquation}
          onClick={() => { if (nextEquation) onSelectEquation(nextEquation.id) }}
          onTouchStart={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          onMouseEnter={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          onFocus={() => { if (nextEquation) void prefetchEquationScene(nextEquation.id) }}
          className={`h-11 min-w-0 shrink-0 rounded-xl text-sm text-slate-600 dark:text-slate-300 ${phoneLayout ? "w-11 border-transparent px-0" : "flex-1 border-slate-200 px-4 dark:border-slate-700 lg:flex-none"}`}
          aria-label={nextEquation ? `Next equation: ${nextEquation.title}` : "Next equation"}
          title={nextEquation?.title}
        >
          <span className={phoneLayout ? "hidden" : "inline"}>Next</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      </nav>
    </header>
  )
}

export const EquationHeader = memo(EquationHeaderComponent)

function ScientistButton({ equationId, author, year }: { equationId: number; author: string; year: string }): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-w-0 items-center gap-1.5 rounded py-0.5 text-xs text-slate-500 underline decoration-slate-300 decoration-dotted underline-offset-4 transition hover:text-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:text-slate-400"
        type="button"
        aria-label={`Learn about ${author}`}
        aria-haspopup="dialog"
        title={`Learn about ${author}, ${year}`}
      >
        <Info className="h-3 w-3 shrink-0" />
        <span className="truncate">{author}, {year}</span>
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
