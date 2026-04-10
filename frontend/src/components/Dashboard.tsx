import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Clock, Flame, Loader2, Settings, Trophy, Sparkles, Target, BookOpen } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { useAllProgress } from "../progress/useProgress"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"
import { api } from "../api/client"
import type { DashboardData } from "../api/client"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { dashboardPageContent, interpolateContent } from "../data/pageContent"
import { prefetchEquationExperience } from "../lib/prefetchEquationExperience"
import { safeRedirect } from "../lib/safeRedirect"
import { Button } from "./ui/button"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"

export default function Dashboard(): ReactElement {
  const { isPro, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const manifestQuery = useEquationManifest()
  const equationManifest = resolveEquationManifest(manifestQuery.data)
  const { completedCount, totalTimeMinutes, total, progressByEquation } = useAllProgress()
  const [serverData, setServerData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!isPro || !isAuthenticated) { setLoading(false); return }
    setAnalyticsError(false)
    api.analytics.dashboard()
      .then((data) => { setServerData(data); setAnalyticsError(false) })
      .catch(() => { setAnalyticsError(true) })
      .finally(() => setLoading(false))
  }, [isPro, isAuthenticated])

  const handleManageSubscription = useCallback(async () => {
    if (!BILLING_ENABLED) return
    setPortalLoading(true)
    try { const { url } = await api.payments.portal(); safeRedirect(url) } catch { setPortalLoading(false) }
  }, [])

  const { completed, inProgress, notStarted, explored, continueEq } = useMemo(() => {
    const completedItems: Array<{
      id: number
      title: string
      formula: string
      author: string
      year: string
      category: string
      completed: boolean
      timeSpent: number
      varsExplored: number
    }> = []
    const inProgressItems: typeof completedItems = []
    const notStartedItems: typeof completedItems = []
    let exploredCount = 0

    for (const equation of equationManifest) {
      const progress = progressByEquation.get(equation.id)
      const item = {
        ...equation,
        completed: progress?.completed ?? false,
        timeSpent: progress?.timeSpentSeconds ?? 0,
        varsExplored: progress?.variablesExplored?.length ?? 0,
      }

      if (item.timeSpent > 0) exploredCount += 1

      if (item.completed) {
        completedItems.push(item)
        continue
      }

      if (item.timeSpent > 0) {
        inProgressItems.push(item)
        continue
      }

      notStartedItems.push(item)
    }

    inProgressItems.sort((a, b) => b.timeSpent - a.timeSpent)

    return {
      completed: completedItems,
      inProgress: inProgressItems,
      notStarted: notStartedItems,
      explored: exploredCount,
      continueEq: inProgressItems[0] ?? notStartedItems[0] ?? null,
    }
  }, [equationManifest, progressByEquation])
  const streak = serverData?.currentStreak ?? 0
  const mobileStatCards = [
    {
      key: "completed",
      value: `${completedCount}`,
      suffix: `/${total}`,
      label: dashboardPageContent.stats.completed,
      icon: <Target className="h-5 w-5 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      key: "explored",
      value: `${explored}`,
      label: dashboardPageContent.stats.explored,
      icon: <BookOpen className="h-5 w-5 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      key: "streak",
      value: `${streak}`,
      label: dashboardPageContent.stats.streak,
      icon: <Flame className="h-5 w-5 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      key: "time",
      value: `${totalTimeMinutes}m`,
      label: dashboardPageContent.stats.studyTime,
      icon: <Clock className="h-5 w-5 text-purple-500" />,
      iconBg: "bg-purple-50 dark:bg-purple-950/40",
    },
  ]

  // Single <main> landmark — inner content switches based on state
  // analyticsError is shown as a brief notice when the analytics fetch fails
  if (!isPro) {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950">
        <TopNav showBack />
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <div className="w-full max-w-sm rounded-[30px] border border-slate-200 bg-white px-5 py-7 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean/10 text-ocean">
              <Trophy className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">{dashboardPageContent.upgrade.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {BILLING_ENABLED
                ? dashboardPageContent.upgrade.enabledBody
                : interpolateContent(dashboardPageContent.upgrade.disabledBodyTemplate, { badge: BILLING_DISABLED_COPY.badge })}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => navigate("/")} className="min-h-[48px] rounded-2xl sm:min-h-0 sm:rounded-md">{dashboardPageContent.upgrade.backButton}</Button>
              <Button
                onClick={() => navigate("/pro")}
                disabled={!BILLING_ENABLED}
                className={
                  BILLING_ENABLED
                    ? "min-h-[48px] rounded-2xl bg-ocean text-white hover:bg-ocean/90 sm:min-h-0 sm:rounded-md"
                    : "min-h-[48px] rounded-2xl border border-slate-200 bg-white text-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 sm:min-h-0 sm:rounded-md"
                }
              >
                {BILLING_ENABLED ? dashboardPageContent.upgrade.upgradeButton : dashboardPageContent.upgrade.pausedButton}
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">{dashboardPageContent.title}</span>} />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ocean" />
        </div>
      ) : (
        <div className="native-scroll flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:py-5">

            {/* Analytics error notice */}
            {analyticsError && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                {dashboardPageContent.analyticsError}
              </div>
            )}

            {/* Hero row: continue learning + stats */}
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              {/* Left: continue learning — the main CTA */}
              {continueEq ? (
                <button
                  onClick={() => navigate(`/equation/${continueEq.id}`)}
                  onMouseEnter={() => {
                    void prefetchEquationExperience(continueEq.id)
                  }}
                  onFocus={() => {
                    void prefetchEquationExperience(continueEq.id)
                  }}
                  className="flex flex-col items-start gap-3 rounded-[28px] border-2 border-ocean bg-gradient-to-r from-ocean/[0.06] to-ocean/[0.02] p-4 text-left transition hover:shadow-lg active:scale-[0.995] dark:from-ocean/[0.12] dark:to-ocean/[0.04] sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5"
                  type="button"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-ocean text-white shadow-lg shadow-ocean/25 sm:h-14 sm:w-14">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-ocean">
                      {inProgress.length > 0 ? dashboardPageContent.cta.continueStarted : dashboardPageContent.cta.startJourney}
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
                    <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {interpolateContent(dashboardPageContent.cta.allDoneTemplate, { total })}
                    </p>
                  </div>
                </div>
              )}

              {/* Right: stats grid */}
              <div className="native-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
                {mobileStatCards.map((card) => (
                  <div
                    key={card.key}
                    className="flex min-w-[10.25rem] snap-start items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-4 lg:min-w-0 lg:shadow-none"
                  >
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {card.value}
                        {card.suffix && <span className="text-sm font-normal text-slate-400">{card.suffix}</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress — most important section after CTA */}
            {inProgress.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Sparkles className="h-3.5 w-3.5 text-ocean" /> {dashboardPageContent.sections.keepGoing}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-400 shadow-sm dark:bg-slate-800">
                    {interpolateContent(dashboardPageContent.sections.keepGoingCountTemplate, { count: inProgress.length })}
                  </span>
                </div>
                <div className="native-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4">
                  {inProgress.map((eq) => {
                    const mins = Math.round(eq.timeSpent / 60)
                    return (
                      <button
                        key={eq.id}
                        onClick={() => navigate(`/equation/${eq.id}`)}
                        onMouseEnter={() => {
                          void prefetchEquationExperience(eq.id)
                        }}
                        onFocus={() => {
                          void prefetchEquationExperience(eq.id)
                        }}
                        className="flex min-w-[15rem] snap-start items-center gap-3 rounded-[22px] border border-ocean/20 bg-ocean/[0.03] p-3.5 text-left transition hover:bg-ocean/[0.06] hover:shadow-sm sm:min-w-0 sm:rounded-xl sm:p-3"
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {dashboardPageContent.sections.discover}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-400 shadow-sm dark:bg-slate-800">
                    {interpolateContent(dashboardPageContent.sections.discoverCountTemplate, { count: notStarted.length })}
                  </span>
                </div>
                <div className="native-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4">
                  {notStarted.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => navigate(`/equation/${eq.id}`)}
                      onMouseEnter={() => {
                        void prefetchEquationExperience(eq.id)
                      }}
                      onFocus={() => {
                        void prefetchEquationExperience(eq.id)
                      }}
                      className="flex min-w-[15rem] snap-start items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:min-w-0 sm:rounded-xl sm:p-3 sm:shadow-none"
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    ✓ {dashboardPageContent.sections.completed}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-400 shadow-sm dark:bg-slate-800">
                    {interpolateContent(dashboardPageContent.sections.completedCountTemplate, { count: completed.length })}
                  </span>
                </div>
                <div className="native-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4">
                  {completed.map((eq) => (
                    <button
                      key={eq.id}
                      onClick={() => navigate(`/equation/${eq.id}`)}
                      onMouseEnter={() => {
                        void prefetchEquationExperience(eq.id)
                      }}
                      onFocus={() => {
                        void prefetchEquationExperience(eq.id)
                      }}
                      className="flex min-w-[15rem] snap-start items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50/50 p-3.5 text-left shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20 sm:min-w-0 sm:rounded-xl sm:p-3 sm:shadow-none"
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
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-xl sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <p className="text-xs leading-relaxed text-slate-400 sm:hidden">
                  Account and billing stay tucked away here while the learning surface stays clean.
                </p>
                <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="min-h-[46px] rounded-2xl text-slate-400 sm:min-h-0 sm:rounded-md">
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  {portalLoading ? "Loading..." : "Manage subscription"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </main>
  )
}
