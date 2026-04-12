import type { ReactElement } from "react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, FileText, GitBranch, ShieldCheck, Sparkles } from "lucide-react"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"
import { Button } from "./ui/button"
import {
  interpolateContent,
  type ChangelogEngineeringChangeType,
  type ChangelogGeneralChangeType,
  type ChangelogRelease,
  useChangelogContent,
} from "../data/pageContent"

type ChangeMode = "general" | "engineering"
type ReleaseLabel = "major" | "minor" | "patch"

const GENERAL_TYPE_STYLES: Record<ChangelogGeneralChangeType, { dot: string; label: string; text: string }> = {
  new: { dot: "bg-ocean", label: "New", text: "text-ocean" },
  fix: { dot: "bg-emerald-500", label: "Fix", text: "text-emerald-600 dark:text-emerald-400" },
  improved: { dot: "bg-amber-400", label: "Improved", text: "text-amber-600 dark:text-amber-400" },
  security: { dot: "bg-red-400", label: "Security", text: "text-red-600 dark:text-red-400" },
}

const ENGINEERING_TYPE_STYLES: Record<ChangelogEngineeringChangeType, { dot: string; label: string; text: string }> = {
  frontend: { dot: "bg-violet-500", label: "Frontend", text: "text-violet-600 dark:text-violet-400" },
  backend: { dot: "bg-sky-500", label: "Backend", text: "text-sky-600 dark:text-sky-400" },
  content: { dot: "bg-amber-400", label: "Content", text: "text-amber-600 dark:text-amber-400" },
  infra: { dot: "bg-slate-500", label: "Infra", text: "text-slate-600 dark:text-slate-400" },
  security: { dot: "bg-red-400", label: "Security", text: "text-red-600 dark:text-red-400" },
}

const LABEL_STYLES: Record<ReleaseLabel, string> = {
  major: "bg-ocean/10 text-ocean border border-ocean/20",
  minor: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  patch: "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500",
}

export default function ChangelogPage(): ReactElement {
  const changelogContent = useChangelogContent()
  const navigate = useNavigate()
  const [mode, setMode] = useState<ChangeMode>("general")

  const releases = changelogContent.releases as ChangelogRelease[]
  const audit = changelogContent.audit

  const totalReleases = releases.length
  const securityCount = useMemo(
    () => releases.reduce((count, release) => (
      count + release.general.filter((change) => change.type === "security").length
    ), 0),
    [releases],
  )

  const heroDescription = interpolateContent(changelogContent.hero.description, {
    start: audit.start,
    end: audit.end,
  })
  const modeSummary = changelogContent.modeDescriptions[mode]
  const footerNote = mode === "general"
    ? changelogContent.footerNotes.general
    : changelogContent.footerNotes.engineering

  return (
    <main className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Changelog</span>} />

      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:py-10">
          <div className="mb-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:mb-8 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean">
                <FileText className="h-3.5 w-3.5" />
                {changelogContent.hero.badge}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <GitBranch className="h-3.5 w-3.5" />
                {audit.commits} commits audited
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">
              {changelogContent.hero.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {heroDescription}
            </p>

            <div className="native-scroll mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {changelogContent.hero.chips.map((chip) => (
                <span key={chip} className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {interpolateContent(chip, {
                    releases: totalReleases,
                    securityCount,
                  })}
                </span>
              ))}
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
                  {changelogContent.hero.generalModeLabel}
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
                  {changelogContent.hero.engineeringModeLabel}
                </button>
              </div>

              <Button variant="outline" onClick={() => navigate("/help")} className="rounded-2xl">
                {changelogContent.hero.helpButton} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{modeSummary}</p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-10">
            {releases.map((release) => {
              const releaseLabel = release.label as ReleaseLabel | undefined

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
                    {releaseLabel && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${LABEL_STYLES[releaseLabel]}`}>
                        {releaseLabel}
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
                {footerNote.title}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {footerNote.body}
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
