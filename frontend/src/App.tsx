import type { ReactElement } from "react"
import { Suspense, lazy, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "./auth/AuthContext"

import { EquationBrowserSidebar } from "./components/app-shell/EquationBrowserSidebar"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { EquationHeader } from "./components/app-shell/EquationHeader"
import { prefetchEquationScene } from "./components/sceneRegistry"
import { FormulaProvider } from "./components/teaching/FormulaContext"
import {
  equationIndexById,
  equationManifest,
  equationSummaryById,
  hasEquation,
  searchEquations,
} from "./data/equationManifest"
import { useAllProgress } from "./progress/useProgress"
import { useSettings } from "./settings/SettingsContext"

const ShortcutOverlay = lazy(() =>
  import("./components/app-shell/ShortcutOverlay").then((module) => ({ default: module.ShortcutOverlay })),
)

const SyncPrompt = lazy(() =>
  import("./components/SyncPrompt").then((module) => ({ default: module.SyncPrompt })),
)

const EquationVisualization = lazy(() =>
  import("./components/EquationVisualization").then((module) => ({ default: module.EquationVisualization })),
)

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
}

function scheduleIdleTask(callback: () => void): number {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout: 900 })
  }

  return globalThis.setTimeout(callback, 250)
}

function cancelIdleTask(handle: number): void {
  if (typeof window !== "undefined" && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle)
    return
  }

  globalThis.clearTimeout(handle)
}

function VisualizationFallback(): ReactElement {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-[34px] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
        <p className="text-sm text-slate-400">Loading visualization...</p>
      </div>
    </div>
  )
}

function getDismissedSyncSignature(): string | null {
  try {
    return localStorage.getItem("sciencebouk-sync-dismissed")
  } catch {
    return null
  }
}

function persistDismissedSyncSignature(signature: string): void {
  try {
    localStorage.setItem("sciencebouk-sync-dismissed", signature)
  } catch {
    // Ignore unavailable storage; the prompt will simply reappear later.
  }
}

function EquationNotFound({ onGoHome }: { onGoHome: () => void }): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Equation not found</p>
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">That equation does not exist in the atlas.</h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        Try another equation from the atlas instead of silently falling into the wrong one.
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90"
      >
        Back to home
      </button>
    </main>
  )
}

export default function App(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const firstEquationId = equationManifest[0]?.id ?? 1
  const rawSelectedId = id ? Number(id) : firstEquationId
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [showShortcuts, setShowShortcuts] = useState(false)
  const { settings, resolvedTheme, update: updateSettings } = useSettings()
  const [sidebarOpen, setSidebarOpen] = useState(() => !settings.sidebarCollapsed)
  const [showSync, setShowSync] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user, isAuthenticated, isPro, logout } = useAuth()
  const { completedCount, totalTimeMinutes, total, progressByEquation, localSyncSignature } = useAllProgress()
  const syncSignature = useMemo(() => (
    isPro ? localSyncSignature : "[]"
  ), [isPro, localSyncSignature])

  const setSidebarOpenAndPersist = useCallback((nextOpen: boolean | ((current: boolean) => boolean)) => {
    setSidebarOpen((current) => {
      const resolvedOpen = typeof nextOpen === "function" ? nextOpen(current) : nextOpen
      updateSettings("sidebarCollapsed", !resolvedOpen)
      return resolvedOpen
    })
  }, [updateSettings])

  const toggleTheme = useCallback(() => {
    updateSettings("theme", resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, updateSettings])

  const handleClearSearch = useCallback(() => setSearchQuery(""), [])
  const handleToggleSidebar = useCallback(
    () => setSidebarOpenAndPersist((current) => !current),
    [setSidebarOpenAndPersist],
  )
  const handleGoHome = useCallback(() => navigate("/"), [navigate])
  const handleOpenProfile = useCallback(() => {
    setDrawerOpen(false)
    navigate("/profile")
  }, [navigate])
  const handleOpenAuthSidebar = useCallback(() => {
    setDrawerOpen(false)
    navigate("/login")
  }, [navigate])
  const handleOpenPro = useCallback(() => {
    setDrawerOpen(false)
    navigate("/pro")
  }, [navigate])
  const handleLogout = useCallback(() => {
    logout()
    setDrawerOpen(false)
  }, [logout])

  const handleOpenDrawer = useCallback(() => setDrawerOpen(true), [])
  const handleOpenProfileHeader = useCallback(() => navigate("/profile"), [navigate])
  const handleOpenAuthHeader = useCallback(() => navigate("/login"), [navigate])
  const handleDismissSync = useCallback(() => {
    setShowSync(false)
    persistDismissedSyncSignature(syncSignature)
  }, [syncSignature])
  const handleSynced = useCallback(() => {
    setShowSync(false)
    persistDismissedSyncSignature(syncSignature)
  }, [syncSignature])

  useEffect(() => {
    if (!isPro || syncSignature === "[]") {
      setShowSync(false)
      return
    }

    setShowSync(getDismissedSyncSignature() !== syncSignature)
  }, [isPro, syncSignature])

  useEffect(() => () => {
    if (searchFocusTimerRef.current) {
      clearTimeout(searchFocusTimerRef.current)
      searchFocusTimerRef.current = null
    }
  }, [])

  const selectedEquation = useMemo(
    () => equationSummaryById.get(rawSelectedId) ?? null,
    [rawSelectedId],
  )
  const routeInvalid = !Number.isInteger(rawSelectedId) || !selectedEquation

  const filteredEquations = useMemo(() => {
    if (!deferredSearchQuery.trim()) return null
    return searchEquations(deferredSearchQuery)
  }, [deferredSearchQuery])

  const selectEquation = useCallback((equationId: number) => {
    if (!hasEquation(equationId)) return
    startTransition(() => {
      navigate(`/equation/${equationId}`)
      setDrawerOpen(false)
      setSearchQuery("")
    })
  }, [navigate])

  const selectEquationFromShortcut = useCallback((baseId: number, shifted: boolean) => {
    const targetId = shifted ? baseId + 10 : baseId
    if (equationManifest.some(e => e.id === targetId)) {
      selectEquation(targetId)
    }
  }, [selectEquation])

  const selectedId = selectedEquation?.id ?? firstEquationId

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault()
        const index = equationIndexById.get(selectedId) ?? -1
        if (index < equationManifest.length - 1) selectEquation(equationManifest[index + 1].id)
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault()
        const index = equationIndexById.get(selectedId) ?? -1
        if (index > 0) selectEquation(equationManifest[index - 1].id)
      } else if (event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault()
        if (!sidebarOpen) setSidebarOpenAndPersist(true)
        if (searchFocusTimerRef.current) {
          clearTimeout(searchFocusTimerRef.current)
        }
        searchFocusTimerRef.current = setTimeout(() => {
          searchInputRef.current?.focus()
          searchFocusTimerRef.current = null
        }, 50)
      } else if (event.key === "Escape") {
        setSearchQuery("")
        setDrawerOpen(false)
        setShowShortcuts(false)
      } else if (event.key === "[" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSidebarOpenAndPersist((current) => !current)
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
  }, [navigate, selectEquation, selectEquationFromShortcut, selectedId, sidebarOpen, setSidebarOpenAndPersist])

  const currentIndex = equationIndexById.get(selectedId) ?? -1
  const prevEquation = currentIndex > 0 ? equationManifest[currentIndex - 1] : null
  const nextEquation = currentIndex < equationManifest.length - 1 ? equationManifest[currentIndex + 1] : null
  const shortcutJumpMax = Math.min(9, equationManifest.length)
  const shiftedShortcutMax = Math.max(0, Math.min(9, equationManifest.length - 10))
  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?"

  useEffect(() => {
    const adjacentIds = [prevEquation?.id, nextEquation?.id].filter((value): value is number => typeof value === "number")
    if (adjacentIds.length === 0) return

    let cancelled = false
    const idleHandle = scheduleIdleTask(() => {
      if (cancelled) return
      void Promise.all(adjacentIds.map((equationId) => prefetchEquationScene(equationId)))
    })

    return () => {
      cancelled = true
      cancelIdleTask(idleHandle)
    }
  }, [nextEquation?.id, prevEquation?.id])

  if (routeInvalid) {
    return <EquationNotFound onGoHome={handleGoHome} />
  }

  return (
      <main className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-1 gap-0 overflow-hidden">
          <EquationBrowserSidebar
            equations={equationManifest}
            filteredEquations={filteredEquations}
            selectedId={selectedId}
            sidebarOpen={sidebarOpen}
            drawerOpen={drawerOpen}
            searchQuery={searchQuery}
            dark={resolvedTheme === "dark"}
            completedCount={completedCount}
            total={total}
            totalTimeMinutes={totalTimeMinutes}
            progressByEquation={progressByEquation}
            prevEquation={prevEquation}
            nextEquation={nextEquation}
            isAuthenticated={isAuthenticated}
            isPro={isPro}
            userEmail={user?.email}
            userInitial={userInitial}
            searchInputRef={searchInputRef}
            onSelectEquation={selectEquation}
            onSearchChange={setSearchQuery}
            onClearSearch={handleClearSearch}
            onOpenDrawer={setDrawerOpen}
            onToggleSidebar={handleToggleSidebar}
            onToggleTheme={toggleTheme}
            onGoHome={handleGoHome}
            onOpenProfile={handleOpenProfile}
            onOpenAuth={handleOpenAuthSidebar}
            onOpenPro={handleOpenPro}
            onLogout={handleLogout}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <EquationHeader
              equation={selectedEquation}
              sidebarOpen={sidebarOpen}
              prevEquation={prevEquation}
              nextEquation={nextEquation}
              isAuthenticated={isAuthenticated}
              userInitial={userInitial}
              onOpenDrawer={handleOpenDrawer}
              onOpenProfile={handleOpenProfileHeader}
              onOpenAuth={handleOpenAuthHeader}
              onSelectEquation={selectEquation}
            />

            <div className="equation-content min-h-0 flex-1 overflow-hidden sm:p-2">
              <FormulaProvider value={selectedEquation.formula}>
                <ErrorBoundary fallback={<VisualizationFallback />}>
                  <Suspense fallback={<VisualizationFallback />}>
                    <EquationVisualization equationId={selectedEquation.id} />
                  </Suspense>
                </ErrorBoundary>
              </FormulaProvider>
            </div>
          </div>
        </div>

        {showShortcuts && (
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <ShortcutOverlay
                open={showShortcuts}
                showZeroShortcut={equationManifest.length >= 10}
                shortcutJumpMax={shortcutJumpMax}
                shiftedShortcutMax={shiftedShortcutMax}
                onClose={() => setShowShortcuts(false)}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {showSync && (
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <SyncPrompt
                onDismiss={handleDismissSync}
                onSynced={handleSynced}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
  )
}
