import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Clock, Flame, Loader2, Settings, Trophy, Sparkles, Target, BookOpen } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { useAllProgress } from "../progress/useProgress"
import { equationManifest } from "../data/equationManifest"
import { api } from "../api/client"
import type { DashboardData } from "../api/client"
import { Button } from "./ui/button"
import { TopNav } from "./TopNav"

export default function Dashboard(): ReactElement {
  const { isPro, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { completedCount, totalTimeMinutes, total, progressByEquation } = useAllProgress()
  const [serverData, setServerData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!isPro || !isAuthenticated) { setLoading(false); return }
    api.analytics.dashboard().then(setServerData).catch(() => {}).finally(() => setLoading(false))
  }, [isPro, isAuthenticated])

  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true)
    try { const { url } = await api.payments.portal(); window.location.href = url } catch { setPortalLoading(false) }
  }, [])

  const eqProgress = useMemo(
    () => equationManifest.map((eq) => {
      const p = progressByEquation.get(eq.id)
      return {
        ...eq,
        completed: p?.completed ?? false,
        timeSpent: p?.timeSpentSeconds ?? 0,
        varsExplored: p?.variablesExplored?.length ?? 0,
      }
    }),
    [progressByEquation],
  )

  // Smart sections
  const completed = eqProgress.filter((e) => e.completed)
  const inProgress = eqProgress.filter((e) => !e.completed && e.timeSpent > 0).sort((a, b) => b.timeSpent - a.timeSpent)
  const notStarted = eqProgress.filter((e) => !e.completed && e.timeSpent === 0)
  const explored = eqProgress.filter((e) => e.timeSpent > 0).length
  const streak = serverData?.currentStreak ?? 0
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  // Best "continue" candidate: most time spent, not completed
  const continueEq = inProgress[0] ?? notStarted[0] ?? null

  if (!isPro) {
    return (
      <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <TopNav showBack />
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <Trophy className="h-12 w-12 text-ocean" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Learning Dashboard</h1>
          <p className="mt-2 text-center text-sm text-slate-500">Track your progress with Pro.</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>Back</Button>
            <Button onClick={() => navigate("/pro")} className="bg-ocean text-white hover:bg-ocean/90">Upgrade</Button>
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-ocean" />
      </main>
    )
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Dashboard</span>} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">

          {/* Hero row: continue learning + stats */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Left: continue learning — the main CTA */}
            {continueEq ? (
              <button
                onClick={() => navigate(`/equation/${continueEq.id}`)}
                className="flex items-center gap-4 rounded-2xl border-2 border-ocean bg-gradient-to-r from-ocean/[0.06] to-ocean/[0.02] p-5 text-left transition hover:shadow-lg active:scale-[0.995] dark:from-ocean/[0.12] dark:to-ocean/[0.04]"
                type="button"
              >
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-ocean text-white shadow-lg shadow-ocean/25">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-ocean">
                    {inProgress.length > 0 ? "Continue where you left off" : "Start your journey"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{continueEq.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {continueEq.timeSpent > 0
                      ? `${Math.round(continueEq.timeSpent / 60)}m studied · ${continueEq.varsExplored} variables explored`
                      : `${continueEq.category} · ${continueEq.author}`
                    }
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/30">
                <div className="text-center">
                  <Trophy className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">All 17 equations completed!</p>
                </div>
              </div>
            )}

            {/* Right: stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <Target className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}<span className="text-sm font-normal text-slate-400">/{total}</span></p>
                  <p className="text-[10px] text-slate-400">Completed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{explored}</p>
                  <p className="text-[10px] text-slate-400">Explored</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <Flame className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{streak}</p>
                  <p className="text-[10px] text-slate-400">Day streak</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalTimeMinutes}m</p>
                  <p className="text-[10px] text-slate-400">Total study time</p>
                </div>
              </div>
            </div>
          </div>

          {/* In Progress — most important section after CTA */}
          {inProgress.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-ocean" /> Keep going
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inProgress.map((eq) => {
                  const mins = Math.round(eq.timeSpent / 60)
                  return (
                    <button
                      key={eq.id}
                      onClick={() => navigate(`/equation/${eq.id}`)}
                      className="flex items-center gap-3 rounded-xl border border-ocean/20 bg-ocean/[0.03] p-3 text-left transition hover:bg-ocean/[0.06] hover:shadow-sm"
                      type="button"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ocean/10 text-xs font-bold text-ocean">
                        {eq.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{eq.title}</p>
                        <p className="text-[10px] text-slate-400">{mins}m · {eq.varsExplored} vars explored</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Not Started — discovery section */}
          {notStarted.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Discover
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {notStarted.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => navigate(`/equation/${eq.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    type="button"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-700">
                      {eq.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{eq.title}</p>
                      <p className="text-[10px] text-slate-400">{eq.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Completed — celebration section */}
          {completed.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                ✓ Completed
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {completed.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => navigate(`/equation/${eq.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-left transition hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                    type="button"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">{eq.title}</p>
                      <p className="text-[10px] text-emerald-500/60">{Math.round(eq.timeSpent / 60)}m total</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer: manage subscription */}
          <div className="mt-6 flex justify-end pb-4">
            <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="text-slate-400">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              {portalLoading ? "Loading..." : "Manage subscription"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
