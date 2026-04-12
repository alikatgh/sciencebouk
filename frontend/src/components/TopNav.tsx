import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, ArrowLeft, Crown, ChevronDown } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { SITE_BASE } from "../config/api"
import { BILLING_ENABLED, useBillingDisabledCopy } from "../config/billing"

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
  const billingDisabledCopy = useBillingDisabledCopy()
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
    <header className="sticky top-0 z-50 flex-shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div
        className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pb-2.5 pt-2 sm:flex-nowrap sm:items-center sm:py-2.5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        {/* Left */}
        <div className="flex min-w-0 flex-1 basis-0 items-start gap-2 sm:items-center">
          {showBack && (
            <button
              onClick={onBack ?? (() => navigate("/"))}
              className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 sm:mt-0"
              type="button"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {left ?? (
              <button
                onClick={() => navigate("/")}
                className="truncate text-base font-bold text-slate-900 transition hover:text-ocean dark:text-white"
                type="button"
              >
                Formulas
              </button>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1 pl-2 sm:gap-2">
          {isAuthenticated && user ? (
            <div className="relative flex items-center gap-1 sm:gap-2" ref={menuRef} onBlur={handleBlur}>
              {!isPro && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate("/pro")}
                  disabled={!BILLING_ENABLED}
                  className={`h-10 min-w-10 rounded-full px-0 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:px-0 sm:h-8 sm:min-w-0 sm:rounded-md sm:px-2 sm:[@media(pointer:coarse)]:min-h-8 ${
                    BILLING_ENABLED
                      ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                      : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                  }`}
                  title={BILLING_ENABLED ? undefined : billingDisabledCopy.detail}
                >
                  <Crown className="h-3 w-3" />
                  <span className="hidden sm:inline">{BILLING_ENABLED ? "Pro" : "Beta"}</span>
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
                className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full py-1 pl-1 pr-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 [@media(pointer:coarse)]:min-h-[44px] sm:h-8 sm:min-h-0 sm:justify-start sm:pr-2"
                type="button"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover sm:h-7 sm:w-7"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ocean/15 text-[10px] font-bold text-ocean sm:h-7 sm:w-7 sm:text-[11px]">
                    {initials}
                  </span>
                )}
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:inline">
                  {displayName}
                </span>
                <ChevronDown className={`hidden h-3 w-3 text-slate-400 transition sm:block ${menuOpen ? "rotate-180" : ""}`} />
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
                      onOpenHelp={() => navigate("/help")}
                      onOpenAbout={() => navigate("/about")}
                      onLogout={() => { logout(); navigate("/") }}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => navigate("/help")}
                className="min-h-[40px] rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300 sm:min-h-0 sm:border-0 sm:px-0 sm:py-0 sm:font-normal sm:text-xs"
                type="button"
              >
                Help
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/login")}
                className="min-h-[40px] rounded-full px-3 text-xs sm:h-7 sm:min-h-0 sm:rounded-md"
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
