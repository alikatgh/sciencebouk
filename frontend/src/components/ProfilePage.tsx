import type { ReactElement } from "react"
import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Crown, LogOut, BarChart2, CreditCard, Camera, Pencil, Check, X, ArrowRight } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { useAllProgress } from "../progress/useProgress"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"
import { api } from "../api/client"
import { SITE_BASE } from "../config/api"
import { BILLING_ENABLED, useBillingDisabledCopy } from "../config/billing"
import { interpolateContent, useProfilePageContent } from "../data/pageContent"
import { prefetchEquationExperience } from "../lib/prefetchEquationExperience"
import { safeRedirect } from "../lib/safeRedirect"
import { PageFrame } from "./PageFrame"

export default function ProfilePage(): ReactElement {
  const billingDisabledCopy = useBillingDisabledCopy()
  const profilePageContent = useProfilePageContent()
  const navigate = useNavigate()
  const { user, isAuthenticated, isPro, logout, refreshUser } = useAuth()
  const manifestQuery = useEquationManifest()
  const equationManifest = resolveEquationManifest(manifestQuery.data)
  const { completedCount, totalTimeMinutes, total, progressByEquation } = useAllProgress()
  const [managingSubscription, setManagingSubscription] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.profile.display_name ?? "")
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileError, setProfileError] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayName = user?.profile.display_name || user?.email.split("@")[0] || ""
  const initials = user?.profile.display_name
    ? user.profile.display_name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email[0]?.toUpperCase() ?? "?")
  const rawAvatarUrl = user?.profile.avatar_url
  const avatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith("http") ? rawAvatarUrl : `${SITE_BASE}${rawAvatarUrl}`) : null


  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    setProfileError("")
    try {
      await api.profile.update(nameInput.trim())
      await refreshUser()
      setEditingName(false)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : profilePageContent.errors.saveName)
    } finally {
      setSaving(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!BILLING_ENABLED) return
    setManagingSubscription(true)
    try {
      const { url } = await api.payments.portal()
      safeRedirect(url)
    } catch { setManagingSubscription(false) }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setProfileError("")
    try {
      await api.profile.uploadAvatar(file)
      await refreshUser()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : profilePageContent.errors.uploadPhoto)
    } finally {
      e.target.value = ""
      setUploadingAvatar(false)
    }
  }

  const { inProgressCount, nextEquation, closestInProgress, sortedEquations } = useMemo(() => {
    const eqProgress = equationManifest.map((equation) => ({
      ...equation,
      progress: progressByEquation.get(equation.id),
    }))

    let inProgressTotal = 0
    let nextFresh: (typeof eqProgress)[number] | null = null

    for (const equation of eqProgress) {
      const completed = equation.progress?.completed ?? false
      const timeSpent = equation.progress?.timeSpentSeconds ?? 0

      if (!completed && timeSpent > 0) {
        inProgressTotal += 1
      } else if (!completed && timeSpent === 0 && nextFresh === null) {
        nextFresh = equation
      }
    }

    const inProgressEquations = eqProgress
      .filter((equation) => !(equation.progress?.completed ?? false) && (equation.progress?.timeSpentSeconds ?? 0) > 0)
      .sort((a, b) => (b.progress?.timeSpentSeconds ?? 0) - (a.progress?.timeSpentSeconds ?? 0))

    const sortedEquationCards = [...eqProgress].sort((a, b) => {
      const aDone = a.progress?.completed ?? false
      const bDone = b.progress?.completed ?? false
      const aStarted = (a.progress?.timeSpentSeconds ?? 0) > 0
      const bStarted = (b.progress?.timeSpentSeconds ?? 0) > 0

      if (aStarted && !aDone && !(bStarted && !bDone)) return -1
      if (bStarted && !bDone && !(aStarted && !aDone)) return 1
      if (!aDone && bDone) return -1
      if (aDone && !bDone) return 1
      return a.id - b.id
    })

    return {
      inProgressCount: inProgressTotal,
      closestInProgress: inProgressEquations[0] ?? null,
      nextEquation: inProgressEquations[0] ?? nextFresh,
      sortedEquations: sortedEquationCards,
    }
  }, [equationManifest, progressByEquation])
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  if (!isAuthenticated || !user) {
    return (
      <PageFrame title={profilePageContent.title}>
        <div className="mx-auto my-10 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-lg leading-7 text-slate-600 dark:text-slate-300">{profilePageContent.signedOut.body}</p>
          <button onClick={() => navigate("/")} className="mt-6 min-h-11 rounded-xl bg-ocean px-6 py-2.5 text-sm font-semibold text-white" type="button">{profilePageContent.signedOut.button}</button>
        </div>
      </PageFrame>
    )
  }


  return (
    <PageFrame title={profilePageContent.title} description="Your learning, your pace. Pick up an experiment or revisit something you have discovered.">
          {/* Top section: profile + stats side by side */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: identity */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="group relative flex-shrink-0">
                  {avatarUrl ? (
                    <>
                      <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.replace("hidden", "flex") }} />
                      <div className="hidden h-16 w-16 items-center justify-center rounded-full bg-ocean/10 text-xl font-bold text-ocean">{initials}</div>
                    </>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ocean/10 text-xl font-bold text-ocean">{initials}</div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-ocean text-white transition hover:bg-ocean/90 disabled:cursor-wait dark:border-slate-900"
                    type="button"
                    aria-label="Upload photo"
                  >
                    {uploadingAvatar ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input ref={nameRef} type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false) }}
                        className="min-w-0 w-full rounded-lg border border-ocean/30 bg-ocean/5 px-2 py-1 text-base font-bold text-slate-900 outline-none focus:border-ocean dark:bg-slate-700 dark:text-white"
                        aria-label={profilePageContent.placeholders.name} placeholder={profilePageContent.placeholders.name} autoFocus disabled={saving} />
                      <button onClick={handleSaveName} disabled={saving} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ocean text-white" type="button" aria-label="Save changes"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditingName(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" type="button" aria-label="Cancel editing"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="min-w-0 break-words font-display text-xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
                      <button onClick={() => { setNameInput(user.profile.display_name || ""); setEditingName(true) }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ocean dark:hover:bg-slate-800" type="button" aria-label="Edit display name"><Pencil className="h-3 w-3" /></button>
                    </div>
                  )}
                  <p className="mt-0.5 break-words text-sm text-slate-500">{user.email}</p>
                  <div className="mt-1.5">
                    {isPro ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Crown className="h-3 w-3" /> {profilePageContent.badges.pro}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{profilePageContent.badges.free}</span>
                    )}
                  </div>
                  {profileError && <p role="alert" className="mt-2 text-sm text-red-600">{profileError}</p>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{interpolateContent(profilePageContent.progress.completedTemplate, { completed: completedCount, total })}</span>
                  <span className="font-bold text-ocean">{pct}%</span>
                </div>
                <div
                  className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                  role="progressbar"
                  aria-valuenow={completedCount}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-label="Equations completed"
                >
                  <div className="h-full rounded-full bg-ocean transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-row sm:flex-wrap">
                {isPro && (
                  <button onClick={() => navigate("/dashboard")} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 sm:justify-start sm:rounded-lg" type="button">
                    <BarChart2 className="h-3.5 w-3.5 text-ocean" /> {profilePageContent.actions.dashboard}
                  </button>
                )}
                {isPro && BILLING_ENABLED && (
                  <button onClick={handleManageSubscription} disabled={managingSubscription} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 sm:justify-start sm:rounded-lg" type="button">
                    <CreditCard className="h-3.5 w-3.5" /> {profilePageContent.actions.billing}
                  </button>
                )}
                {!isPro && (
                  <button
                    onClick={() => navigate("/pro")}
                    disabled={!BILLING_ENABLED}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold sm:justify-start sm:rounded-lg ${
                      BILLING_ENABLED
                        ? "border-2 border-ocean text-ocean hover:bg-ocean/5"
                        : "border border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                    }`}
                    type="button"
                    title={BILLING_ENABLED ? undefined : billingDisabledCopy.detail}
                  >
                    <Crown className="h-3.5 w-3.5" /> {BILLING_ENABLED ? profilePageContent.actions.upgrade : profilePageContent.actions.proLater}
                  </button>
                )}
                <button onClick={() => { logout(); navigate("/") }} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900/30 sm:justify-start sm:rounded-lg" type="button">
                  <LogOut className="h-3.5 w-3.5" /> {profilePageContent.actions.signOut}
                </button>
              </div>
            </div>

            {/* Right: continue learning + stats */}
            <div className="flex flex-col gap-3">
              {/* Continue learning CTA */}
              {nextEquation && (
                <button
                  onClick={() => navigate(`/equation/${nextEquation.id}`)}
                  onMouseEnter={() => {
                    void prefetchEquationExperience(nextEquation.id)
                  }}
                  onFocus={() => {
                    void prefetchEquationExperience(nextEquation.id)
                  }}
                  className="flex flex-1 items-center gap-4 rounded-2xl border border-ocean/20 bg-white p-6 text-left transition-colors hover:border-ocean hover:bg-ocean/[0.03] dark:bg-slate-900"
                  type="button"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ocean text-white">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ocean">
                      {closestInProgress ? profilePageContent.progress.continue : profilePageContent.progress.start}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">{nextEquation.title}</p>
                    {closestInProgress && (
                      <p className="text-xs text-slate-500">
                        {interpolateContent(profilePageContent.progress.keepGoingTemplate, {
                          minutes: Math.round((closestInProgress.progress?.timeSpentSeconds ?? 0) / 60),
                        })}
                      </p>
                    )}
                  </div>
                </button>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-5 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xl font-bold text-emerald-600">{completedCount}</p>
                  <p className="text-xs text-slate-500">{profilePageContent.progress.statsDone}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-5 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xl font-bold text-blue-600">{totalTimeMinutes}m</p>
                  <p className="text-xs text-slate-500">{profilePageContent.progress.statsStudied}</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-5 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xl font-bold text-purple-600">{inProgressCount}</p>
                  <p className="text-xs text-slate-500">{profilePageContent.progress.statsExploring}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Equations — sorted by relevance: in-progress first, then not started, completed last */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <h2 className="mb-5 font-display text-xl font-bold text-slate-800 dark:text-slate-200">{profilePageContent.progress.yourEquations}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedEquations.map((eq) => {
                const progress = eq.progress
                const done = progress?.completed ?? false
                const started = (progress?.timeSpentSeconds ?? 0) > 0
                const mins = Math.round((progress?.timeSpentSeconds ?? 0) / 60)
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
                    className={`group relative flex min-h-[120px] flex-col rounded-xl border p-4 text-left transition-colors hover:border-ocean/50 ${
                      done
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                        : started
                        ? "border-ocean/20 bg-ocean/[0.03] dark:border-ocean/30"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        done ? "bg-emerald-500 text-white" : started ? "bg-ocean/15 text-ocean" : "bg-slate-100 text-slate-400 dark:bg-slate-700"
                      }`}>
                        {done ? "✓" : eq.id}
                      </span>
                      {done && <span className="text-[11px] text-emerald-500">Done</span>}
                      {started && !done && <span className="text-[11px] text-ocean">{mins}m</span>}
                    </div>
                    <p className={`mt-2 text-base font-semibold leading-6 ${done ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {eq.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{eq.category}</p>
                  </button>
                )
              })}
            </div>
          </div>
    </PageFrame>
  )
}
