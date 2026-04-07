import type { KeyboardEvent, ReactElement } from "react"
import { BarChart2, Crown, Info, LogOut, Settings, User } from "lucide-react"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"

interface TopNavAccountMenuProps {
  displayName: string
  email: string
  isPro: boolean
  onClose: () => void
  onOpenProfile: () => void
  onOpenDashboard: () => void
  onOpenPro: () => void
  onOpenSettings: () => void
  onOpenAbout: () => void
  onLogout: () => void
}

export function TopNavAccountMenu({
  displayName,
  email,
  isPro,
  onClose,
  onOpenProfile,
  onOpenDashboard,
  onOpenPro,
  onOpenSettings,
  onOpenAbout,
  onLogout,
}: TopNavAccountMenuProps): ReactElement {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[role='menuitem']"),
    )
    const current = document.activeElement
    const index = items.indexOf(current as HTMLElement)

    if (event.key === "ArrowDown") {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    }
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-[100] mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800"
      onKeyDown={handleKeyDown}
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
        <p className="text-xs text-slate-400">{email}</p>
        {isPro && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Crown className="h-2.5 w-2.5" /> Pro
          </span>
        )}
      </div>

      <div className="py-1">
        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => { onClose(); onOpenProfile() }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
          type="button"
        >
          <User className="h-4 w-4 text-slate-400" />
          Profile
        </button>

        {isPro && (
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => { onClose(); onOpenDashboard() }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            type="button"
          >
            <BarChart2 className="h-4 w-4 text-slate-400" />
            Dashboard
          </button>
        )}

        {!isPro && (
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => { onClose(); onOpenPro() }}
            disabled={!BILLING_ENABLED}
            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
              BILLING_ENABLED
                ? "text-ocean hover:bg-ocean/5"
                : "text-slate-400"
            }`}
            type="button"
            title={BILLING_ENABLED ? undefined : BILLING_DISABLED_COPY.detail}
          >
            <Crown className="h-4 w-4" />
            {BILLING_ENABLED ? "Upgrade to Pro" : "Pro later"}
          </button>
        )}

        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => { onClose(); onOpenSettings() }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
          type="button"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          Settings
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => { onClose(); onOpenAbout() }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
          type="button"
        >
          <Info className="h-4 w-4 text-slate-400" />
          About
        </button>
      </div>

      <div className="border-t border-slate-100 py-1 dark:border-slate-700">
        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => { onClose(); onLogout() }}
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/20"
          type="button"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
