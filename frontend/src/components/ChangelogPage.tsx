import type { ReactElement } from "react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, FileText, GitBranch, ShieldCheck, Sparkles } from "lucide-react"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"
import { Button } from "./ui/button"

type GeneralChangeType = "new" | "fix" | "improved" | "security"
type EngineeringChangeType = "frontend" | "backend" | "content" | "infra" | "security"
type ChangeMode = "general" | "engineering"

interface Release {
  version: string
  date: string
  label?: "major" | "minor" | "patch"
  auditTrail: string[]
  summary: string
  general: { type: GeneralChangeType; text: string }[]
  engineering: { type: EngineeringChangeType; text: string }[]
}

const RELEASES: Release[] = [
  {
    version: "0.8.0",
    date: "10 Apr 2026",
    label: "major",
    auditTrail: ["fc6dc0c", "5609f41", "cd93639", "105e782", "a245558", "fb01156"],
    summary: "Content editing got dramatically easier, the public help layer arrived, and the atlas stopped depending on hardcoded frontend data.",
    general: [
      { type: "new", text: "Help Center added for learners and editors, with clear guidance on how the site works." },
      { type: "new", text: "Content editors can now bulk-update formulas through Django Admin with drag-and-drop JSON import." },
      { type: "improved", text: "Equation content now comes from the database, making it much easier to expand the atlas without frontend rewiring." },
      { type: "improved", text: "Blank or broken equation states now fail more gracefully instead of leaving users on empty screens." },
      { type: "fix", text: "More mobile polish landed across dashboard, onboarding, and content surfaces." },
    ],
    engineering: [
      { type: "backend", text: "Added an admin-only JSON importer for equations, including validation, row-level error handling, and tests." },
      { type: "content", text: "Shifted the equation atlas away from static frontend assumptions toward API-backed database content." },
      { type: "frontend", text: "Added resilient manifest fallback logic and a generic scene fallback to prevent white-screen failures when content is missing." },
      { type: "infra", text: "Expanded env-driven config cleanup so content and deployment behavior rely less on hardcoded values." },
      { type: "frontend", text: "Continued the mobile pass across dashboard, onboarding, and beta messaging surfaces." },
    ],
  },
  {
    version: "0.7.0",
    date: "8-10 Apr 2026",
    label: "major",
    auditTrail: ["4396ec4", "3d01f4d", "d619132", "d04f9c2", "6feec7a", "a33e0d6", "1edb7ca"],
    summary: "The mobile browser experience was pushed much closer to a native app, especially on small and awkward screen sizes.",
    general: [
      { type: "improved", text: "Equation screens now feel tighter, calmer, and more app-like on phones." },
      { type: "improved", text: "Header controls, drawers, dialogs, and teaching panels were tuned for thumb use and narrow screens." },
      { type: "improved", text: "Dense formulas and scene labels were cleaned up across gravity, relativity, quantum, wave, fluid, and finance views." },
      { type: "improved", text: "Mobile home, account, and dashboard surfaces now scroll and transition more naturally." },
      { type: "fix", text: "Tiny-phone clutter was reduced instead of simply shrinking everything into unreadability." },
    ],
    engineering: [
      { type: "frontend", text: "Added focused mobile visualization mode plus snap states for the teaching sheet." },
      { type: "frontend", text: "Reworked equation shell chrome, drawer behavior, sticky controls, and mobile transitions across the app." },
      { type: "frontend", text: "Ran scene-specific label density passes across wave, log, Euler, gravity, fluids, complex numbers, relativity, and quantum scenes." },
      { type: "frontend", text: "Moved mobile behavior toward dynamic viewport height handling so browser chrome changes stop breaking layouts." },
      { type: "frontend", text: "Refined mobile dialogs and account surfaces to behave more like app surfaces than desktop overlays." },
    ],
  },
  {
    version: "0.6.0",
    date: "7 Apr 2026",
    label: "major",
    auditTrail: ["3a03e0e", "51e1b3c", "04b9a06", "8f7aa7d", "d139d4e", "bda86e1"],
    summary: "Sciencebo shifted into a safer public beta shape: real legal pages, production prep, and no forced payments during the learning-first phase.",
    general: [
      { type: "new", text: "The product moved to a free beta stance while the core learning experience is validated." },
      { type: "improved", text: "Privacy and Terms pages were upgraded from placeholders to real site copy." },
      { type: "improved", text: "Production auth and domain setup work landed to support the live site." },
      { type: "security", text: "Personal deployment notes and private operational docs were kept out of the public repo." },
    ],
    engineering: [
      { type: "infra", text: "Prepared production auth and domain configuration for the live deployment path." },
      { type: "security", text: "Billing was paused behind flags so beta users stay free while payment code remains intact but inactive." },
      { type: "content", text: "Replaced placeholder legal content with public-ready copy and unified contact info." },
      { type: "security", text: "Kept private deploy docs and personal legal/deployment notes local-only rather than tracked." },
    ],
  },
  {
    version: "0.5.0",
    date: "6 Apr 2026",
    label: "major",
    auditTrail: ["4e65121", "58344e1", "315553b", "1d9e8eb", "4b60514", "6a65bbe"],
    summary: "The app became much sturdier: smoother teaching layouts, better auth continuity, and sharper production-minded hardening.",
    general: [
      { type: "new", text: "Google sign-in landed alongside the existing auth flows." },
      { type: "improved", text: "Zooming and responsive teaching layouts became smoother and more reliable." },
      { type: "fix", text: "Login state now restores more cleanly after reloads and auth transitions." },
      { type: "security", text: "A broad security and stability hardening pass landed across auth, progress sync, and interactions." },
      { type: "improved", text: "Typography, footer polish, and the first changelog pass made the product feel more editorially complete." },
    ],
    engineering: [
      { type: "security", text: "Ran a comprehensive security and stability bug hunt across auth, progress sync, and interaction flows." },
      { type: "backend", text: "Returned richer user payloads on login so the frontend can restore account state more accurately." },
      { type: "frontend", text: "Stopped sizing teaching layouts purely from viewport assumptions and moved toward container-aware behavior." },
      { type: "frontend", text: "Improved responsive visualization zoom behavior and equation teaching layout breakpoints." },
      { type: "content", text: "Added and refined changelog and typography systems, including the STIX Two Text rollout." },
    ],
  },
  {
    version: "0.4.0",
    date: "5 Apr 2026",
    label: "major",
    auditTrail: ["bcdbf5e", "3eac350", "15d154b", "2886055", "1669d8e", "6cfc40f"],
    summary: "The teaching shell settled into a real product: lessons, layouts, KaTeX consistency, and calmer scene behavior.",
    general: [
      { type: "improved", text: "Lessons, settings, and layout behavior were tightened across the app." },
      { type: "fix", text: "Formulas were standardized around KaTeX instead of mixed rendering paths." },
      { type: "improved", text: "Silent progress syncing replaced more intrusive sync prompts." },
      { type: "fix", text: "Entropy and immersive-mode issues were cleaned up so scenes behave more consistently." },
      { type: "fix", text: "Narrow-screen clipping and formula rendering regressions were removed." },
    ],
    engineering: [
      { type: "frontend", text: "Standardized formula rendering around KaTeX and removed the older preview conversion path." },
      { type: "frontend", text: "Normalized scene composition by wrapping straggler scenes with the same teaching shell used elsewhere." },
      { type: "frontend", text: "Fixed narrow-screen SVG clipping and tightened reusable lesson/layout plumbing." },
      { type: "backend", text: "Improved silent progress sync behavior so local and server progress stop fighting the interface." },
    ],
  },
  {
    version: "0.3.0",
    date: "5 Apr 2026",
    label: "major",
    auditTrail: ["2d85ab6", "390f172", "5a0e5f5", "7a0196b"],
    summary: "Sciencebo grew from a concept into a broader learning product with profiles, dashboard views, and richer scene interactions.",
    general: [
      { type: "new", text: "Profile, dashboard, About, and Pro-facing surfaces were added." },
      { type: "new", text: "D3 drag interactions landed across all 17 equation scenes." },
      { type: "new", text: "Resizable panels gave the teaching layout more flexibility on larger screens." },
      { type: "improved", text: "Continue Learning and equation relevance sorting made the profile flow more useful." },
    ],
    engineering: [
      { type: "frontend", text: "Added D3-driven interaction plumbing across every equation scene." },
      { type: "frontend", text: "Introduced resizable panel infrastructure and integrated it into the learning shell." },
      { type: "backend", text: "Expanded the app surface around profile, dashboard, and pro-related user state." },
      { type: "content", text: "Improved homepage math rendering and corrected subject positioning as the product scope sharpened." },
    ],
  },
  {
    version: "0.2.0",
    date: "5 Apr 2026",
    label: "minor",
    auditTrail: ["a682d67", "b191b9d"],
    summary: "The product identity sharpened and the early equation scenes started looking like a coherent atlas instead of disconnected demos.",
    general: [
      { type: "improved", text: "The project was renamed to Sciencebo, with early scene upgrades to match the new direction." },
      { type: "improved", text: "Hero math precision and formula rendering were cleaned up in public-facing surfaces." },
    ],
    engineering: [
      { type: "content", text: "Renamed the project and aligned public-facing scene and subject language with the new brand direction." },
      { type: "frontend", text: "Improved hero precision and reinforced KaTeX rendering on surfaced marketing pages." },
    ],
  },
  {
    version: "0.1.0",
    date: "5 Apr 2026",
    label: "minor",
    auditTrail: ["b7315ca"],
    summary: "The first working foundation landed: an interactive math learning platform with a frontend, backend, auth, and a starting equation atlas.",
    general: [
      { type: "new", text: "Initial interactive math platform launched with React and Django." },
      { type: "new", text: "The first equation atlas and learning shell were established." },
      { type: "new", text: "Auth, formula rendering, and the basic product structure were all in place from day one." },
    ],
    engineering: [
      { type: "frontend", text: "Bootstrapped the React application and interactive math presentation layer." },
      { type: "backend", text: "Bootstrapped the Django backend and auth foundations." },
      { type: "content", text: "Established the initial equation atlas and interactive learning direction." },
    ],
  },
]

const GENERAL_TYPE_STYLES: Record<GeneralChangeType, { dot: string; label: string; text: string }> = {
  new: { dot: "bg-ocean", label: "New", text: "text-ocean" },
  fix: { dot: "bg-emerald-500", label: "Fix", text: "text-emerald-600 dark:text-emerald-400" },
  improved: { dot: "bg-amber-400", label: "Improved", text: "text-amber-600 dark:text-amber-400" },
  security: { dot: "bg-red-400", label: "Security", text: "text-red-600 dark:text-red-400" },
}

const ENGINEERING_TYPE_STYLES: Record<EngineeringChangeType, { dot: string; label: string; text: string }> = {
  frontend: { dot: "bg-violet-500", label: "Frontend", text: "text-violet-600 dark:text-violet-400" },
  backend: { dot: "bg-sky-500", label: "Backend", text: "text-sky-600 dark:text-sky-400" },
  content: { dot: "bg-amber-400", label: "Content", text: "text-amber-600 dark:text-amber-400" },
  infra: { dot: "bg-slate-500", label: "Infra", text: "text-slate-600 dark:text-slate-400" },
  security: { dot: "bg-red-400", label: "Security", text: "text-red-600 dark:text-red-400" },
}

const LABEL_STYLES = {
  major: "bg-ocean/10 text-ocean border border-ocean/20",
  minor: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  patch: "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500",
} as const

const CHANGELOG_AUDIT = {
  commits: 67,
  start: "5 Apr 2026",
  end: "10 Apr 2026",
}

export default function ChangelogPage(): ReactElement {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ChangeMode>("general")

  const totalReleases = RELEASES.length
  const securityCount = useMemo(
    () => RELEASES.reduce((count, release) => count + release.general.filter((change) => change.type === "security").length, 0),
    [],
  )

  const modeSummary = mode === "general"
    ? "General mode is for learners and customers. It strips out most jargon and focuses on what changed in the product."
    : "Engineering mode is for builders. It shows the architectural and implementation shifts behind each release."

  return (
    <main className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Changelog</span>} />

      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:py-10">
          <div className="mb-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:mb-8 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean">
                <FileText className="h-3.5 w-3.5" />
                Changelog
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <GitBranch className="h-3.5 w-3.5" />
                {CHANGELOG_AUDIT.commits} commits audited
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
              Product history, in two languages.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              This changelog is curated from audited git history on the main branch, covering {CHANGELOG_AUDIT.start} to {CHANGELOG_AUDIT.end}.
              Use General mode for user-facing updates, or Engineering mode for the technical trail behind the release.
            </p>

            <div className="native-scroll mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {totalReleases} curated releases
              </span>
              <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {securityCount} security-facing changes
              </span>
              <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                Mobile-native polish tracked across multiple passes
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setMode("general")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === "general"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                  aria-pressed={mode === "general"}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setMode("engineering")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mode === "engineering"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                  aria-pressed={mode === "engineering"}
                >
                  Engineering
                </button>
              </div>

              <Button variant="outline" onClick={() => navigate("/help")} className="rounded-2xl">
                Open Help Center <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{modeSummary}</p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-10">
            {RELEASES.map((release) => {
              return (
                <section
                  key={release.version}
                  className="relative rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:pl-6"
                >
                  <div className="absolute bottom-0 left-0 top-2 hidden w-px bg-slate-200 dark:bg-slate-800 sm:block" />
                  <div className="absolute left-[-4px] top-2 hidden h-2 w-2 rounded-full bg-ocean sm:block" />

                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      v{release.version}
                    </span>
                    {release.label && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LABEL_STYLES[release.label]}`}>
                        {release.label}
                      </span>
                    )}
                    <span className="w-full text-xs text-slate-400 dark:text-slate-500 sm:w-auto">{release.date}</span>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {release.summary}
                  </p>

                  {mode === "engineering" && (
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="font-semibold uppercase tracking-[0.16em]">Audit trail</span>
                      {release.auditTrail.map((hash) => (
                        <code
                          key={hash}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {hash}
                        </code>
                      ))}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {mode === "general"
                      ? release.general.map((change, index) => {
                        const style = GENERAL_TYPE_STYLES[change.type]
                        return (
                          <li
                            key={`${release.version}-${mode}-${index}`}
                            className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0"
                          >
                            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
                            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                              <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                                {style.label}
                              </span>
                              {change.text}
                            </span>
                          </li>
                        )
                      })
                      : release.engineering.map((change, index) => {
                        const style = ENGINEERING_TYPE_STYLES[change.type]
                        return (
                          <li
                            key={`${release.version}-${mode}-${index}`}
                            className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0"
                          >
                            <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
                            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                              <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                                {style.label}
                              </span>
                              {change.text}
                            </span>
                          </li>
                        )
                      })}
                  </ul>
                </section>
              )
            })}
          </div>

          <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-2">
              {mode === "general" ? (
                <Sparkles className="h-5 w-5 text-ocean" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-ocean" />
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === "general" ? "Why two modes?" : "How to read the engineering log"}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {mode === "general"
                ? "Normal users should not have to translate commit messages. General mode keeps the focus on what changed in the experience."
                : "Engineering mode is intentionally closer to the build trail. It groups implementation changes into frontend, backend, content, infra, and security so the release story stays readable."}
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
