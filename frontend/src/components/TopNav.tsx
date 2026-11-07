import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { User, ArrowLeft, Crown, ChevronDown } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { SITE_BASE } from "../config/api"
import { SITE_NAME } from "../config/site"
import { BILLING_ENABLED, useBillingDisabledCopy } from "../config/billing"

import { ErrorBoundary } from "./ErrorBoundary"
import { Button } from "./ui/button"
import { BrandMark } from "./BrandMark"

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
  const location = useLocation()
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
    <header className="sticky top-0 z-50 flex-shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div
        className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-1.5 px-3 pb-2 pt-2 sm:gap-4 sm:px-6 lg:px-8"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        {showBack && <button type="button" onClick={onBack ?? (() => navigate("/"))} aria-label="Go back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-ocean dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /></button>}
        <Link to="/" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2.5 rounded-lg font-display text-lg font-extrabold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:text-white sm:justify-start sm:text-xl" aria-label={`${SITE_NAME} home`}>
          <BrandMark className="h-8 w-8 shrink-0 text-ocean" />
          <span className={showBack ? "hidden md:inline" : "hidden min-[480px]:inline"}>{SITE_NAME}</span>
        </Link>
        <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-0.5 text-sm font-medium sm:ml-4 sm:gap-1">
          <Link to="/#subjects-section" aria-current={location.pathname === "/" ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ocean sm:px-3 ${location.pathname === "/" ? "text-ocean dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}>Library</Link>
          <Link to="/help" aria-current={location.pathname === "/help" ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ocean sm:px-3 ${location.pathname === "/help" ? "text-ocean dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}>Help</Link>
        </nav>

        {/* Right */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isAuthenticated && user ? (
            <div className="relative flex items-center gap-1 sm:gap-2" ref={menuRef} onBlur={handleBlur}>
              {!isPro && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate("/pro")}
                  disabled={!BILLING_ENABLED}
                  aria-label={BILLING_ENABLED ? "Explore Pro" : billingDisabledCopy.detail}
                  className={`${showBack ? "hidden min-[480px]:inline-flex" : ""} h-11 min-w-11 rounded-lg px-0 [@media(pointer:coarse)]:px-0 sm:h-9 sm:min-w-0 sm:px-2 sm:[@media(pointer:coarse)]:min-h-11 ${
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
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg py-1 pl-1.5 pr-2 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ocean dark:hover:bg-slate-800"
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
                <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 dark:text-slate-300 lg:inline">
                  {displayName}
                </span>
                <ChevronDown className={`hidden h-3 w-3 text-slate-400 transition lg:block ${menuOpen ? "rotate-180" : ""}`} />
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/login")}
                className="min-h-11 rounded-lg border-slate-200 px-3 text-sm dark:border-slate-700 sm:px-4"
              >
                <User className="hidden h-3.5 w-3.5 sm:block" /> Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
      {left && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <div className="mx-auto flex min-h-12 max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">{left}</div>
          </div>
        </div>
      )}
    </header>
  )
}
