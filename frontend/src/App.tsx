import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AuthModal } from "./auth/AuthModal"
import { useAuth } from "./auth/AuthContext"
import { EquationBrowserSidebar } from "./components/app-shell/EquationBrowserSidebar"
import { EquationHeader } from "./components/app-shell/EquationHeader"
import { ShortcutOverlay } from "./components/app-shell/ShortcutOverlay"
import { EquationVisualization } from "./components/EquationVisualization"
import { SyncPrompt } from "./components/SyncPrompt"
import { FormulaProvider } from "./components/teaching/FormulaContext"
import { TooltipProvider } from "./components/ui/tooltip"
import { equationManifest } from "./data/equationManifest"
import { useAllProgress } from "./progress/useProgress"

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem("sciencebouk-dark-mode")
    if (stored !== null) return stored === "true"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("sciencebouk-dark-mode", String(dark))
  }, [dark])

  return [dark, setDark] as const
}

export default function App(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const firstEquationId = equationManifest[0]?.id ?? 1
  const rawSelectedId = id ? Number(id) : firstEquationId
  const [dark, setDark] = useDarkMode()
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem("sciencebouk-sidebar")
    return stored !== null ? stored === "true" : true
  })
  const [showSync, setShowSync] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { user, isAuthenticated, isPro, logout } = useAuth()
  const { completedCount, totalTimeMinutes, total } = useAllProgress()

  useEffect(() => {
    localStorage.setItem("sciencebouk-sidebar", String(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    if (isPro && completedCount > 0 && !localStorage.getItem("sciencebouk-sync-dismissed")) {
      setShowSync(true)
    }
  }, [isPro, completedCount])

  const selectedEquation = useMemo(
    () => equationManifest.find((equation) => equation.id === rawSelectedId) ?? null,
    [rawSelectedId],
  )
  const routeInvalid = !Number.isInteger(rawSelectedId) || !selectedEquation

  useEffect(() => {
    if (!routeInvalid) return
    navigate(`/equation/${firstEquationId}`, { replace: true })
  }, [firstEquationId, navigate, routeInvalid])

  const filteredEquations = useMemo(() => {
    if (!searchQuery.trim()) return null
    const query = searchQuery.toLowerCase()
    return equationManifest.filter((equation) =>
      equation.title.toLowerCase().includes(query) ||
      equation.author.toLowerCase().includes(query) ||
      equation.category.toLowerCase().includes(query),
    )
  }, [searchQuery])

  const selectEquation = useCallback((equationId: number) => {
    if (!equationManifest.some((equation) => equation.id === equationId)) return
    navigate(`/equation/${equationId}`)
    setDrawerOpen(false)
    setSearchQuery("")
  }, [navigate])

  const selectEquationFromShortcut = useCallback((baseId: number, shifted: boolean) => {
    const targetId = shifted ? baseId + 10 : baseId
    if (targetId <= equationManifest.length) {
      selectEquation(targetId)
    }
  }, [selectEquation])

  const selectedId = selectedEquation?.id ?? firstEquationId

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault()
        const index = equationManifest.findIndex((equation) => equation.id === selectedId)
        if (index < equationManifest.length - 1) selectEquation(equationManifest[index + 1].id)
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault()
        const index = equationManifest.findIndex((equation) => equation.id === selectedId)
        if (index > 0) selectEquation(equationManifest[index - 1].id)
      } else if (event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault()
        if (!sidebarOpen) setSidebarOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      } else if (event.key === "Escape") {
        setSearchQuery("")
        setDrawerOpen(false)
        setShowShortcuts(false)
      } else if (event.key === "[" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSidebarOpen((current) => !current)
      } else if (event.key === "?") {
        event.preventDefault()
        setShowShortcuts((current) => !current)
      } else if (event.key === "h" || event.key === "H") {
        navigate("/")
      } else if (event.key >= "1" && event.key <= "9") {
        event.preventDefault()
        selectEquationFromShortcut(Number(event.key), event.shiftKey)
      } else if (event.key === "0" && 10 <= equationManifest.length) {
        event.preventDefault()
        selectEquation(10)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [navigate, selectEquation, selectEquationFromShortcut, selectedId, sidebarOpen])

  const currentIndex = equationManifest.findIndex((equation) => equation.id === selectedId)
  const prevEquation = currentIndex > 0 ? equationManifest[currentIndex - 1] : null
  const nextEquation = currentIndex < equationManifest.length - 1 ? equationManifest[currentIndex + 1] : null
  const shortcutJumpMax = Math.min(9, equationManifest.length)
  const shiftedShortcutMax = Math.max(0, Math.min(9, equationManifest.length - 10))
  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?"

  if (!selectedEquation) {
    return <main className="h-screen bg-slate-50 dark:bg-slate-950" />
  }

  return (
    <TooltipProvider delayDuration={400}>
      <main className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-1 gap-0 overflow-hidden">
          <EquationBrowserSidebar
            equations={equationManifest}
            filteredEquations={filteredEquations}
            selectedId={selectedId}
            sidebarOpen={sidebarOpen}
            drawerOpen={drawerOpen}
            searchQuery={searchQuery}
            dark={dark}
            completedCount={completedCount}
            total={total}
            totalTimeMinutes={totalTimeMinutes}
            prevEquation={prevEquation}
            nextEquation={nextEquation}
            isAuthenticated={isAuthenticated}
            isPro={isPro}
            userEmail={user?.email}
            userInitial={userInitial}
            searchInputRef={searchInputRef}
            onSelectEquation={selectEquation}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery("")}
            onOpenDrawer={setDrawerOpen}
            onToggleSidebar={() => setSidebarOpen((current) => !current)}
            onToggleTheme={() => setDark((current) => !current)}
            onGoHome={() => navigate("/")}
            onOpenProfile={() => {
              setDrawerOpen(false)
              navigate("/profile")
            }}
            onOpenAuth={() => {
              setDrawerOpen(false)
              setShowAuth(true)
            }}
            onOpenPro={() => {
              setDrawerOpen(false)
              navigate("/pro")
            }}
            onLogout={() => {
              logout()
              setDrawerOpen(false)
            }}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <EquationHeader
              equation={selectedEquation}
              sidebarOpen={sidebarOpen}
              prevEquation={prevEquation}
              nextEquation={nextEquation}
              isAuthenticated={isAuthenticated}
              userInitial={userInitial}
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpenProfile={() => navigate("/profile")}
              onOpenAuth={() => setShowAuth(true)}
              onSelectEquation={selectEquation}
            />

            <div className="min-h-0 flex-1 overflow-hidden p-2">
              <FormulaProvider value={selectedEquation.formula}>
                <EquationVisualization equationId={selectedEquation.id} />
              </FormulaProvider>
            </div>
          </div>
        </div>

        <ShortcutOverlay
          open={showShortcuts}
          showZeroShortcut={equationManifest.length >= 10}
          shortcutJumpMax={shortcutJumpMax}
          shiftedShortcutMax={shiftedShortcutMax}
          onClose={() => setShowShortcuts(false)}
        />

        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
        {showSync && <SyncPrompt onClose={() => { setShowSync(false); localStorage.setItem("sciencebouk-sync-dismissed", "1") }} />}
      </main>
    </TooltipProvider>
  )
}
