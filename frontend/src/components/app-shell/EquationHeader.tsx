import type { ReactElement } from "react"
import { useState } from "react"
import { Menu, User } from "lucide-react"
import { ScientistModal } from "../ScientistModal"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import type { EquationSummary } from "../../data/equationManifest"

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

export function EquationHeader({
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
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
      <Button variant="ghost" size="icon-sm" onClick={onOpenDrawer} className="lg:hidden">
        <Menu className="h-4 w-4" />
      </Button>
      <h2 className="min-w-0 truncate font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white md:text-base">
        {equation.title}
      </h2>
      <Badge variant="secondary" className="hidden sm:inline-flex">
        {equation.category}
      </Badge>
      <ScientistButton equationId={equation.id} author={equation.author} year={equation.year} />
      <div className="ml-auto flex items-center gap-1">
        {!sidebarOpen && prevEquation && (
          <Button variant="ghost" size="xs" onClick={() => onSelectEquation(prevEquation.id)} className="hidden text-slate-400 lg:inline-flex">
            {"←"}
          </Button>
        )}
        {!sidebarOpen && nextEquation && (
          <Button variant="ghost" size="xs" onClick={() => onSelectEquation(nextEquation.id)} className="hidden text-slate-400 lg:inline-flex">
            {"→"}
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={isAuthenticated ? onOpenProfile : onOpenAuth} className="lg:hidden">
          {isAuthenticated ? (
            <Avatar className="h-5 w-5">
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

function ScientistButton({ equationId, author, year }: { equationId: number; author: string; year: string }): ReactElement {
  const [open, setOpen] = useState(false)
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
      <ScientistModal open={open} onClose={() => setOpen(false)} equationId={equationId} />
    </>
  )
}
