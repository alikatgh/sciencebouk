import type { ReactElement } from "react"
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
  selectedId: number
  completedCount: number
  total: number
  totalTimeMinutes: number
  progressByEquation: Map<number, EquationProgress>
  isAuthenticated: boolean
  isPro: boolean
  userEmail?: string
  userInitial: string
  onOpenChange: (open: boolean) => void
  onSelectEquation: (id: number) => void
  onOpenProfile: () => void
  onOpenAuth: () => void
  onOpenPro: () => void
  onLogout: () => void
}

export function EquationBrowserDrawer({
  open,
  equations,
  selectedId,
  completedCount,
  total,
  totalTimeMinutes,
  progressByEquation,
  isAuthenticated,
  isPro,
  userEmail,
  userInitial,
  onOpenChange,
  onSelectEquation,
  onOpenProfile,
  onOpenAuth,
  onOpenPro,
  onLogout,
}: EquationBrowserDrawerProps): ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
  )
}
