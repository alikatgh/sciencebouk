import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Clock, Flame, Loader2, Settings, Trophy } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { useAllProgress, getLocalProgress } from "../progress/useProgress"
import { equationManifest } from "../data/equationManifest"
import { api } from "../api/client"
import type { DashboardData } from "../api/client"
import { Button } from "./ui/button"
import { TopNav } from "./TopNav"

function CompletionRing({ completed, total }: { completed: number; total: number }): ReactElement {
  const pct = total > 0 ? completed / total : 0
  const r = 44
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="110" height="110" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-700" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-emerald-500"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{completed}</span>
        <span className="text-[10px] text-slate-400">of {total}</span>
      </div>
    </div>
  )
}

export default function Dashboard(): ReactElement {
  const { isPro, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { completedCount, totalTimeMinutes, total } = useAllProgress()
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

  const localCategories = useMemo(() => {
    const cats: Record<string, { total: number; completed: number }> = {}
    for (const eq of equationManifest) {
      const cat = eq.category
      if (!cats[cat]) cats[cat] = { total: 0, completed: 0 }
      cats[cat].total++
      if (getLocalProgress(eq.id).completed) cats[cat].completed++
    }
    return cats
  }, [completedCount])

  const eqProgress = useMemo(() => equationManifest.map((eq) => ({ ...eq, progress: getLocalProgress(eq.id) })), [completedCount])
  const nextEquation = useMemo(() => equationManifest.find((eq) => !getLocalProgress(eq.id).completed) ?? null, [completedCount])
  const streak = serverData?.currentStreak ?? 0

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

  const categoryEntries = Object.entries(localCategories)
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Dashboard</span>} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">
          {/* Top row: stats + next equation */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {/* Left: ring + stats */}
            <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <CompletionRing completed={completedCount} total={total} />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span className="font-bold text-ocean">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-ocean transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{streak}</p>
                      <p className="text-[9px] text-amber-600/60">Day streak</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-950/30">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{totalTimeMinutes}m</p>
                      <p className="text-[9px] text-blue-600/60">Studied</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: next equation + manage */}
            <div className="flex flex-col gap-3">
              {nextEquation && (
                <div className="flex flex-1 flex-col justify-center rounded-2xl border border-ocean/20 bg-ocean/[0.04] p-5 dark:border-ocean/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ocean">Up next</p>
                  <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{nextEquation.title}</p>
                  <p className="text-xs text-slate-400">{nextEquation.category} · {nextEquation.author}</p>
                  <Button variant="outline" size="sm" className="mt-3 w-fit border-ocean/30 text-ocean hover:bg-ocean/10" onClick={() => navigate(`/equation/${nextEquation.id}`)}>
                    Start <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-fit self-end" onClick={handleManageSubscription} disabled={portalLoading}>
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                {portalLoading ? "Loading..." : "Manage subscription"}
              </Button>
            </div>
          </div>

          {/* Bottom: categories + equations grid side by side */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
            {/* Left: category progress */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">By Category</h2>
              <div className="space-y-2.5">
                {categoryEntries.map(([name, { total: t, completed: c }]) => {
                  const catPct = t > 0 ? (c / t) * 100 : 0
                  const displayName = name.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{displayName}</span>
                        <span className={`font-bold ${c === t && t > 0 ? "text-emerald-500" : "text-slate-400"}`}>{c}/{t}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className={`h-full rounded-full transition-all ${c === t && t > 0 ? "bg-emerald-500" : "bg-ocean"}`} style={{ width: `${catPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: equations grid */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">All Equations</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {eqProgress.map((eq) => {
                  const done = eq.progress.completed
                  const started = eq.progress.timeSpentSeconds > 0
                  const mins = Math.round(eq.progress.timeSpentSeconds / 60)
                  return (
                    <button
                      key={eq.id}
                      onClick={() => navigate(`/equation/${eq.id}`)}
                      className={`flex flex-col rounded-xl border p-2.5 text-left transition hover:shadow-sm ${
                        done ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                        : started ? "border-ocean/20 bg-ocean/[0.03]"
                        : "border-slate-150 hover:border-slate-300 dark:border-slate-700"
                      }`}
                      type="button"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          done ? "bg-emerald-500 text-white" : started ? "bg-ocean/15 text-ocean" : "bg-slate-100 text-slate-400 dark:bg-slate-700"
                        }`}>
                          {done ? "✓" : eq.id}
                        </span>
                        {started && !done && <span className="text-[9px] text-ocean">{mins}m</span>}
                      </div>
                      <p className={`mt-1 text-xs font-medium leading-tight ${done ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {eq.title}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
