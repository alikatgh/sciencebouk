import type { ReactElement } from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { GITHUB_URL, SITE_DOMAIN } from "../config/site"

const EASTER_EGG_LINES = [
  "\"Read serious bouks — life will do the rest.\" — Fyodor Dostoevsky",
]

export function Footer(): ReactElement {
  const [easterEgg] = useState(() => EASTER_EGG_LINES[Math.floor(Math.random() * EASTER_EGG_LINES.length)])
  const [hovered, setHovered] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  return (
    <footer className="mt-auto border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl sm:hidden">
        <div
          className="rounded-t-[28px] border-x border-t border-slate-200/80 bg-slate-50/95 px-4 pb-5 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Formulas</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
                  Open source
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">{SITE_DOMAIN}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileExpanded((current) => !current)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {mobileExpanded ? "Less" : "More"}
            </button>
          </div>

          <nav className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Link to="/about" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">About</Link>
            <Link to="/pro" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
              {BILLING_ENABLED ? "Pro" : BILLING_DISABLED_COPY.badge}
            </Link>
            <Link to="/privacy" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Privacy</Link>
            <Link to="/terms" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Terms</Link>
          </nav>

          {mobileExpanded && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Link to="/changelog" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Changelog</Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">GitHub</a>
              <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="col-span-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center font-medium shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Report a bug</a>
            </div>
          )}

          {mobileExpanded && (
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              Open source interactive math learning.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto hidden max-w-5xl flex-col items-center gap-3 px-4 py-6 sm:flex sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Formulas</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span
            className="relative cursor-default"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {SITE_DOMAIN}
            {hovered && (
              <span className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[11px] leading-snug text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {easterEgg}
                <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              </span>
            )}
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-600 dark:hover:text-slate-300">GitHub</a>
          <Link to="/pro" className="transition hover:text-slate-600 dark:hover:text-slate-300">
            {BILLING_ENABLED ? "Pro" : BILLING_DISABLED_COPY.badge}
          </Link>
          <Link to="/about" className="transition hover:text-slate-600 dark:hover:text-slate-300">About</Link>
          <Link to="/changelog" className="transition hover:text-slate-600 dark:hover:text-slate-300">Changelog</Link>
          <Link to="/privacy" className="transition hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
          <Link to="/terms" className="transition hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-600 dark:hover:text-slate-300">Report a bug</a>
        </nav>

        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          Open source interactive math learning.
        </p>
      </div>
    </footer>
  )
}
