import type { ReactElement, ReactNode } from "react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, User, ArrowLeft, Crown, BarChart2, Settings, ChevronDown, Info } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { AuthModal } from "../auth/AuthModal"
import { Button } from "./ui/button"

interface TopNavProps {
  left?: ReactNode
  showBack?: boolean
  onBack?: () => void
}

function getUserDisplayName(user: { email: string; profile: { display_name: string } }): string {
  if (user.profile.display_name) return user.profile.display_name
  // Derive from email: "john.doe@gmail.com" → "John"
  const local = user.email.split("@")[0]
  const first = local.split(/[._-]/)[0]
  return first.charAt(0).toUpperCase() + first.slice(1)
}

function getUserInitials(user: { email: string; profile: { display_name: string } }): string {
  const name = user.profile.display_name
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return user.email[0]?.toUpperCase() ?? "?"
}

export function TopNav({ left, showBack, onBack }: TopNavProps): ReactElement {
  const navigate = useNavigate()
  const { user, isAuthenticated, isPro, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  const handleBlur = () => {
    setTimeout(() => {
      if (menuRef.current && !menuRef.current.contains(document.activeElement)) {
        setMenuOpen(false)
      }
    }, 150)
  }

  const displayName = user ? getUserDisplayName(user) : ""
  const initials = user ? getUserInitials(user) : ""
  const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/api$/, "")
  const rawAvatarUrl = user?.profile.avatar_url
  const avatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith("http") ? rawAvatarUrl : `${API_BASE}${rawAvatarUrl}`) : null

  return (
    <header className="relative z-50 flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        {/* Left */}
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={onBack ?? (() => navigate("/"))}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              type="button"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {left ?? (
            <button
              onClick={() => navigate("/")}
              className="text-base font-bold text-slate-900 transition hover:text-ocean dark:text-white"
              type="button"
            >
              Sciencebouk
            </button>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef} onBlur={handleBlur}>
              {!isPro && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate("/pro")}
                  className="mr-1 gap-1 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                >
                  <Crown className="h-3 w-3" /> Pro
                </Button>
              )}

              {/* Avatar button — opens dropdown */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                type="button"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ocean/15 text-[11px] font-bold text-ocean">
                    {initials}
                  </span>
                )}
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:inline">
                  {displayName}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full z-[100] mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800">
                  {/* User info header */}
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    {isPro && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Crown className="h-2.5 w-2.5" /> Pro
                      </span>
                    )}
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/profile") }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      type="button"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      Profile
                    </button>

                    {isPro && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate("/dashboard") }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        type="button"
                      >
                        <BarChart2 className="h-4 w-4 text-slate-400" />
                        Dashboard
                      </button>
                    )}

                    {!isPro && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate("/pro") }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-ocean transition hover:bg-ocean/5"
                        type="button"
                      >
                        <Crown className="h-4 w-4" />
                        Upgrade to Pro
                      </button>
                    )}

                    <button
                      onClick={() => { setMenuOpen(false); navigate("/settings") }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      type="button"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Settings
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/about") }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                      type="button"
                    >
                      <Info className="h-4 w-4 text-slate-400" />
                      About
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 py-1 dark:border-slate-700">
                    <button
                      onClick={() => { setMenuOpen(false); logout(); navigate("/") }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/20"
                      type="button"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/about")}
                className="text-xs text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                type="button"
              >
                About
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuth(true)}
                className="h-7 gap-1 text-xs"
              >
                <User className="h-3 w-3" /> Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </header>
  )
}
