import type { ReactElement, ReactNode } from "react"
import { Component, lazy, memo, Suspense, useEffect, useRef, useState } from "react"
import { Menu, User } from "lucide-react"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
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
  sidebarOpen,
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
    <div
      className="sticky top-0 z-20 flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white/88 px-3.5 pb-2.5 pt-2 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88 sm:gap-2 sm:px-3 sm:py-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.65rem)" }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenDrawer}
        className="rounded-full bg-slate-100/90 text-slate-600 shadow-sm hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
        aria-label="Open equation browser"
      >
        <Menu className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <h2 className="min-w-0 truncate font-display text-[15px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-sm md:text-base">
          {equation.title}
        </h2>
        <div className="mt-1 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap sm:hidden">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-300">
            {equation.category}
          </Badge>
          <p className="truncate text-[10px] text-slate-400">
            {equation.author}, {equation.year}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="hidden sm:inline-flex">
        {equation.category}
      </Badge>
      <span className="hidden sm:inline-flex">
        <ScientistButton equationId={equation.id} author={equation.author} year={equation.year} />
      </span>
      <div className="ml-auto flex items-center gap-1">
        {!sidebarOpen && prevEquation && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onSelectEquation(prevEquation.id)}
            onMouseEnter={() => {
              void prefetchEquationScene(prevEquation.id)
            }}
            onFocus={() => {
              void prefetchEquationScene(prevEquation.id)
            }}
            className="hidden text-slate-400 lg:inline-flex"
            aria-label={`Previous equation: ${prevEquation.title}`}
          >
            {"←"}
          </Button>
        )}
        {!sidebarOpen && nextEquation && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onSelectEquation(nextEquation.id)}
            onMouseEnter={() => {
              void prefetchEquationScene(nextEquation.id)
            }}
            onFocus={() => {
              void prefetchEquationScene(nextEquation.id)
            }}
            className="hidden text-slate-400 lg:inline-flex"
            aria-label={`Next equation: ${nextEquation.title}`}
          >
            {"→"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={isAuthenticated ? onOpenProfile : onOpenAuth}
          className="rounded-full bg-slate-100/90 text-slate-600 shadow-sm hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
          aria-label={isAuthenticated ? "Open profile" : "Sign in"}
        >
          {isAuthenticated ? (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[9px]">{userInitial}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-4 w-4 text-slate-400" />
          )}
        </Button>
      </div>
    </div>
  )
}

export const EquationHeader = memo(EquationHeaderComponent)

function ScientistButton({ equationId, author, year }: { equationId: number; author: string; year: string }): ReactElement {
  const [open, setOpen] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (open) mountedRef.current = true
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden cursor-pointer text-[11px] text-slate-400 underline decoration-dotted underline-offset-2 transition hover:text-ocean sm:inline"
        type="button"
        title={`Learn about ${author}`}
      >
        {author}, {year}
      </button>
      {mountedRef.current && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ScientistModal open={open} onClose={() => setOpen(false)} equationId={equationId} />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </>
  )
}
