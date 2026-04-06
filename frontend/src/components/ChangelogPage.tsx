import type { ReactElement } from "react"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"

interface Release {
  version: string
  date: string
  label?: "major" | "minor" | "patch"
  changes: { type: "new" | "fix" | "improved" | "security"; text: string }[]
}

const RELEASES: Release[] = [
  {
    version: "0.6.0",
    date: "6 Apr 2026, 10:00",
    label: "minor",
    changes: [
      { type: "new", text: "STIX Two Text set as default body font across the entire app — lessons, sidebar, about, changelog all render in the scientific journal typeface" },
      { type: "new", text: "Changelog page at /changelog, linked from footer" },
      { type: "improved", text: "Switched display font from Newsreader to STIX Two Text (used in Nature, Science, APS journals)" },
    ],
  },
  {
    version: "0.5.0",
    date: "6 Apr 2026, 08:22",
    label: "major",
    changes: [
      { type: "security", text: "Access token moved to memory-only storage — no longer written to localStorage (XSS hardening)" },
      { type: "security", text: "Django DEBUG defaults to False in production; dev SECRET_KEY rejected on live servers" },
      { type: "security", text: "Stripe webhook converted to raw view to preserve body integrity before signature verification" },
      { type: "new", text: "Root ErrorBoundary added — the app recovers gracefully from any component crash" },
      { type: "new", text: "Pro tier gate on progress sync: free users get local progress, Pro users get server sync" },
      { type: "new", text: "Guided lesson auto-advance now uses a stable ref — no more double-advance on fast interactions" },
      { type: "improved", text: "Maxwell equation scene: frequency now displayed live in the formula as you change wavelength" },
      { type: "improved", text: "Relativity scene: removed redundant values panel; speed clamped to prevent Infinity in Lorentz factor" },
      { type: "improved", text: "Complex numbers scene: mobile layout recentered with hidden info panel on narrow screens" },
      { type: "improved", text: "Gravity scene: guided lesson now correctly unlocks the orbital radius variable" },
      { type: "fix", text: "Stripe checkout now reads price_type and maps to correct monthly/yearly price ID" },
      { type: "fix", text: "Progress sync N+1 query fixed — bulk sync now pre-fetches all equations in one query" },
      { type: "fix", text: "Anonymous progress rows now have a unique constraint; IntegrityError handled gracefully" },
      { type: "fix", text: "TypeScript strict mode enabled: noUnusedLocals + noUnusedParameters — 0 errors" },
    ],
  },
  {
    version: "0.4.0",
    date: "5 Apr 2026, 21:40",
    label: "major",
    changes: [
      { type: "new", text: "Mobile layout overhaul: teaching panel slides up from bottom on narrow screens" },
      { type: "new", text: "Resizable teaching panel on desktop — drag to adjust width, state persisted across sessions" },
      { type: "improved", text: "SVG clipping fixed on narrow screens across all 17 equation scenes" },
      { type: "improved", text: "Presets respect locked variables during guided lessons" },
      { type: "fix", text: "KaTeX formula converter fully removed — all formulas now render with react-katex exclusively" },
      { type: "fix", text: "Entropy scene removed from immersive mode and now uses the standard app shell" },
      { type: "fix", text: "Progress auto-syncs silently in the background — no more popup prompt" },
    ],
  },
  {
    version: "0.3.0",
    date: "5 Apr 2026, 16:54",
    label: "major",
    changes: [
      { type: "new", text: "Pro subscription via Stripe — monthly and yearly plans with webhook-verified status" },
      { type: "new", text: "Dashboard: progress tracking across all 17 equations with lesson completion state" },
      { type: "new", text: "Profile page with Continue Learning CTA and equations sorted by relevance" },
      { type: "new", text: "About page with scientist biographies for each equation" },
      { type: "new", text: "D3 drag interactions added to all 17 equation scenes" },
      { type: "new", text: "Resizable panels across the app" },
    ],
  },
  {
    version: "0.2.0",
    date: "5 Apr 2026, 15:18",
    label: "minor",
    changes: [
      { type: "new", text: "17 interactive equation scenes: Pythagoras, Maxwell, Schrödinger, Relativity, Euler, and more" },
      { type: "new", text: "Guided lesson runner with step-by-step instructions, hints, and celebration on completion" },
      { type: "new", text: "Live formula display — letter formula and live numbers update as you drag sliders" },
      { type: "new", text: "Glossary term highlighting — hover a term in a lesson to highlight it in the visualization" },
      { type: "new", text: "Settings page: formula size, dark mode, difficulty, animation speed, sound effects" },
      { type: "improved", text: "Renamed project to Sciencebouk" },
    ],
  },
  {
    version: "0.1.0",
    date: "5 Apr 2026, 15:03",
    label: "minor",
    changes: [
      { type: "new", text: "Initial commit: interactive math learning platform with React 19 + Django 5.2" },
      { type: "new", text: "KaTeX rendering for all mathematical formulas" },
      { type: "new", text: "JWT authentication with register, login, and token refresh" },
      { type: "new", text: "17 equations across Geometry, Algebra, Calculus, Physics, Statistics, and more" },
    ],
  },
]

const TYPE_STYLES = {
  new: { dot: "bg-ocean", label: "New", text: "text-ocean" },
  fix: { dot: "bg-emerald-500", label: "Fix", text: "text-emerald-600 dark:text-emerald-400" },
  improved: { dot: "bg-amber-400", label: "Improved", text: "text-amber-600 dark:text-amber-400" },
  security: { dot: "bg-red-400", label: "Security", text: "text-red-600 dark:text-red-400" },
}

const LABEL_STYLES = {
  major: "bg-ocean/10 text-ocean border border-ocean/20",
  minor: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  patch: "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500",
}

export default function ChangelogPage(): ReactElement {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Changelog</span>} />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">Changelog</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">What's new in Sciencebouk</p>
        </div>

        <div className="space-y-10">
          {RELEASES.map((release) => (
            <div key={release.version} className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-0 top-2 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
              {/* Timeline dot */}
              <div className="absolute left-[-4px] top-2 h-2 w-2 rounded-full bg-ocean" />

              <div className="mb-3 flex items-center gap-2.5">
                <span className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  v{release.version}
                </span>
                {release.label && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LABEL_STYLES[release.label]}`}>
                    {release.label}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">{release.date}</span>
              </div>

              <ul className="space-y-2">
                {release.changes.map((change, i) => {
                  const s = TYPE_STYLES[change.type]
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${s.dot}`} />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${s.text}`}>
                          {s.label}
                        </span>
                        {change.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  )
}
