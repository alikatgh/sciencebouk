import type { ReactElement } from "react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Crown, LogOut, BarChart2, CreditCard, BookOpen, Clock, CheckCircle2, Camera, Pencil, Check, X } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { useAllProgress } from "../progress/useProgress"
import { equationManifest } from "../data/equationManifest"
import { api } from "../api/client"
import { TopNav } from "./TopNav"

export default function ProfilePage(): ReactElement {
  const navigate = useNavigate()
  const { user, isAuthenticated, isPro, logout, getAccessToken, refreshUser } = useAuth()
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
    ? user.profile.display_name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email[0]?.toUpperCase() ?? "?")
  const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/api$/, "")
  const rawAvatarUrl = user?.profile.avatar_url
  const avatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith("http") ? rawAvatarUrl : `${API_BASE}${rawAvatarUrl}`) : null

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f3f5f7] dark:bg-slate-900">
        <TopNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-slate-500">Sign in to see your profile.</p>
            <button onClick={() => navigate("/")} className="mt-4 rounded-xl bg-ocean px-6 py-2 text-sm font-semibold text-white" type="button">Go home</button>
          </div>
        </div>
      </div>
    )
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    setProfileError("")
    try {
      const token = getAccessToken()
      if (!token) throw new Error("Please sign in again.")
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/auth/me/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: nameInput.trim() }),
      })
      if (!response.ok) throw new Error("Could not save your name.")
      await refreshUser()
      setEditingName(false)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save your name.")
    } finally {
      setSaving(false)
    }
  }

  const handleManageSubscription = async () => {
    setManagingSubscription(true)
    try {
      const { url } = await api.payments.portal()
      window.location.href = url
    } catch { setManagingSubscription(false) }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setProfileError("")
    try {
      const token = getAccessToken()
      if (!token) throw new Error("Please sign in again.")
      const form = new FormData()
      form.append("avatar", file)
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/auth/me/avatar/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) throw new Error("Could not upload your photo.")
      await refreshUser()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not upload your photo.")
    } finally {
      e.target.value = ""
      setUploadingAvatar(false)
    }
  }

  const eqProgress = equationManifest.map((eq) => ({ ...eq, progress: progressByEquation.get(eq.id) }))
  const inProgressCount = eqProgress.filter((e) => !(e.progress?.completed ?? false) && (e.progress?.timeSpentSeconds ?? 0) > 0).length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f3f5f7] dark:bg-slate-900">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Profile</span>} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">
          {/* Top section: profile + stats side by side */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {/* Left: identity */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-4">
                <div className="group relative flex-shrink-0">
                  {avatarUrl ? (
                    <>
                      <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden") }} />
                      <div className="hidden h-16 w-16 items-center justify-center rounded-full bg-ocean/10 text-xl font-bold text-ocean">{initials}</div>
                    </>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ocean/10 text-xl font-bold text-ocean">{initials}</div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 transition hover:bg-black/40 disabled:cursor-wait"
                    type="button"
                    aria-label="Upload photo"
                  >
                    {uploadingAvatar ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
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
                        className="w-full rounded-lg border border-ocean/30 bg-ocean/5 px-2 py-1 text-base font-bold text-slate-900 outline-none focus:border-ocean dark:bg-slate-700 dark:text-white"
                        placeholder="Your name" autoFocus disabled={saving} />
                      <button onClick={handleSaveName} disabled={saving} className="rounded-lg bg-ocean p-1.5 text-white" type="button"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditingName(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" type="button"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">{displayName}</h1>
                      <button onClick={() => { setNameInput(user.profile.display_name || ""); setEditingName(true) }} className="rounded p-1 text-slate-300 hover:text-slate-500" type="button"><Pencil className="h-3 w-3" /></button>
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">{user.email}</p>
                  <div className="mt-1.5">
                    {isPro ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Crown className="h-3 w-3" /> Pro</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">Free</span>
                    )}
                  </div>
                  {profileError && <p className="mt-2 text-xs text-red-500">{profileError}</p>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{completedCount}/{total} completed</span>
                  <span className="font-bold text-ocean">{pct}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-ocean transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {isPro && (
                  <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300" type="button">
                    <BarChart2 className="h-3.5 w-3.5 text-ocean" /> Dashboard
                  </button>
                )}
                {isPro && (
                  <button onClick={handleManageSubscription} disabled={managingSubscription} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300" type="button">
                    <CreditCard className="h-3.5 w-3.5" /> Billing
                  </button>
                )}
                {!isPro && (
                  <button onClick={() => navigate("/pro")} className="flex items-center gap-1.5 rounded-lg border-2 border-ocean px-3 py-1.5 text-xs font-bold text-ocean hover:bg-ocean/5" type="button">
                    <Crown className="h-3.5 w-3.5" /> Upgrade to Pro
                  </button>
                )}
                <button onClick={() => { logout(); navigate("/") }} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900/30" type="button">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </div>

            {/* Right: stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{completedCount}</p>
                <p className="text-[10px] text-slate-400">Completed</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <Clock className="h-5 w-5 text-blue-500" />
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalTimeMinutes}</p>
                <p className="text-[10px] text-slate-400">Minutes</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <BookOpen className="h-5 w-5 text-purple-500" />
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{inProgressCount}</p>
                <p className="text-[10px] text-slate-400">In progress</p>
              </div>
            </div>
          </div>

          {/* Equations grid — compact, fits on screen */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">Your Equations</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {eqProgress.map((eq) => {
                const progress = eq.progress
                const done = progress?.completed ?? false
                const started = (progress?.timeSpentSeconds ?? 0) > 0
                const mins = Math.round((progress?.timeSpentSeconds ?? 0) / 60)
                return (
                  <button
                    key={eq.id}
                    onClick={() => navigate(`/equation/${eq.id}`)}
                    className={`group relative flex flex-col rounded-xl border p-2.5 text-left transition hover:shadow-sm ${
                      done
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                        : started
                        ? "border-ocean/20 bg-ocean/[0.03] dark:border-ocean/30"
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
                      {done && <span className="text-[9px] text-emerald-500">Done</span>}
                      {started && !done && <span className="text-[9px] text-ocean">{mins}m</span>}
                    </div>
                    <p className={`mt-1 text-xs font-medium leading-tight ${done ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {eq.title}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">{eq.category}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
