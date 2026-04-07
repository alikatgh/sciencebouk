import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, ArrowLeft, Crown, ChevronDown } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { SITE_BASE } from "../config/api"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"

import { ErrorBoundary } from "./ErrorBoundary"
import { Button } from "./ui/button"

interface TopNavProps {
  left?: ReactNode
  showBack?: boolean
  onBack?: () => void
}

function loadTopNavAccountMenu() {
  return import("./TopNavAccountMenu")
}

const TopNavAccountMenu = lazy(() =>
  loadTopNavAccountMenu().then((module) => ({ default: module.TopNavAccountMenu })),
)

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
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    // Move focus to first menu item when menu opens
    const firstItem = menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")
    firstItem?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  // Close menu on outside click
  const handleBlur = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
    }

    blurTimerRef.current = setTimeout(() => {
      if (menuRef.current && !menuRef.current.contains(document.activeElement)) {
        setMenuOpen(false)
      }
      blurTimerRef.current = null
    }, 150)
  }

  const displayName = user ? getUserDisplayName(user) : ""
  const initials = user ? getUserInitials(user) : ""
  const rawAvatarUrl = user?.profile.avatar_url
  const avatarUrl = rawAvatarUrl ? (rawAvatarUrl.startsWith("http") ? rawAvatarUrl : `${SITE_BASE}${rawAvatarUrl}`) : null
  const closeMenu = () => setMenuOpen(false)

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
              Formulas
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
                  disabled={!BILLING_ENABLED}
                  className={`mr-1 gap-1 ${
                    BILLING_ENABLED
                      ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                      : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                  }`}
                  title={BILLING_ENABLED ? undefined : BILLING_DISABLED_COPY.detail}
                >
                  <Crown className="h-3 w-3" /> {BILLING_ENABLED ? "Pro" : "Beta"}
                </Button>
              )}

              {/* Avatar button — opens dropdown */}
              <button
                ref={triggerRef}
                onClick={() => setMenuOpen(!menuOpen)}
                onMouseEnter={() => {
                  void loadTopNavAccountMenu()
                }}
                onFocus={() => {
                  void loadTopNavAccountMenu()
                }}
                className="inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                type="button"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
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
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <TopNavAccountMenu
                      displayName={displayName}
                      email={user.email}
                      isPro={isPro}
                      onClose={closeMenu}
                      onOpenProfile={() => navigate("/profile")}
                      onOpenDashboard={() => navigate("/dashboard")}
                      onOpenPro={() => navigate("/pro")}
                      onOpenSettings={() => navigate("/settings")}
                      onOpenAbout={() => navigate("/about")}
                      onLogout={() => { logout(); navigate("/") }}
                    />
                  </Suspense>
                </ErrorBoundary>
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
                onClick={() => navigate("/login")}
                className="h-7 gap-1 text-xs"
              >
                <User className="h-3 w-3" /> Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
