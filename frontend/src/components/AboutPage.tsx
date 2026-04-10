import type { ReactElement } from "react"
import { lazy, Suspense, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Github, Crown, ArrowRight, Atom, FlaskConical, Cpu, Smartphone, type LucideIcon } from "lucide-react"
import { TopNav } from "./TopNav"
import { ErrorBoundary } from "./ErrorBoundary"
import { Footer } from "./Footer"
import { Button } from "./ui/button"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { aboutPageContent, interpolateContent } from "../data/pageContent"
import { GITHUB_URL } from "../config/site"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"

const HeroDemo = lazy(() =>
  import("./HeroDemo").then((module) => ({ default: module.HeroDemo })),
)

const COMING_SOON_ICONS: Record<string, LucideIcon> = {
  "flask-conical": FlaskConical,
  atom: Atom,
  cpu: Cpu,
  smartphone: Smartphone,
}

export default function AboutPage(): ReactElement {
  const navigate = useNavigate()
  const manifestQuery = useEquationManifest()
  const manifest = useMemo(
    () => resolveEquationManifest(manifestQuery.data),
    [manifestQuery.data],
  )
  const equationCount = manifest.length

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <TopNav showBack />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-6 md:py-12 lg:py-16">

          {/* ── HERO: text + live demo side by side ── */}
          <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,300px)] md:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,320px)] lg:gap-14">
            <div className="max-w-2xl rounded-[30px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm backdrop-blur md:max-w-none md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:border-slate-800 dark:bg-slate-900/70 md:dark:bg-transparent">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                {aboutPageContent.badge}
              </span>
              <h1 className="mt-4 font-display text-[2rem] font-bold tracking-tight text-slate-900 dark:text-white md:text-[2.6rem] md:leading-[0.95]">
                {aboutPageContent.titleLines[0]}<br />{aboutPageContent.titleLines[1]}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                {interpolateContent(aboutPageContent.descriptionTemplate, { equationCount })}
              </p>
              <p className="mt-6 text-base font-semibold text-slate-900 dark:text-slate-100">
                {aboutPageContent.beliefTitle}
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 md:max-w-none">
                {aboutPageContent.beliefBody}
              </p>

              <div className="native-scroll mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-6 md:flex-wrap md:overflow-visible md:pb-0">
                <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {equationCount} interactive equations
                </span>
                {aboutPageContent.heroPills.map((pill) => (
                  <span key={pill} className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {pill}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button onClick={() => navigate("/equation/1")} className="min-h-[48px] justify-center rounded-2xl bg-ocean text-white hover:bg-ocean/90 sm:min-h-0">
                  {aboutPageContent.primaryCta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="min-h-[48px] justify-center rounded-2xl text-slate-600 dark:text-slate-300 sm:min-h-0">
                  {interpolateContent(aboutPageContent.browseAllLabelTemplate, { equationCount })}
                </Button>
              </div>
            </div>

            {/* Live demo — the proof */}
            <div className="w-full md:justify-self-end">
              <div className="w-full max-w-[320px] rounded-[28px] bg-slate-900 p-1 shadow-2xl shadow-slate-900/20 sm:max-w-[300px] sm:rounded-2xl md:ml-auto md:max-w-[320px]">
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={<div className="h-56 w-full animate-pulse rounded-xl bg-slate-800" />}>
                    <HeroDemo className="w-full" />
                  </Suspense>
                </ErrorBoundary>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400 md:text-right">
                {aboutPageContent.liveDemoCaption}
              </p>
            </div>
          </section>

          {/* ── TWO-COLUMN GRID ── */}
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start xl:gap-12">

            {/* Left: Free vs Pro */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{aboutPageContent.sections.freeVsProTitle}</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 p-5 dark:border-slate-700 sm:rounded-xl">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{aboutPageContent.freePlan.title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{aboutPageContent.freePlan.price}</p>
                  <p className="text-sm text-slate-400">{aboutPageContent.freePlan.priceNote}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {aboutPageContent.freePlan.features.map((feature) => (
                      <li key={feature}>{interpolateContent(feature, { equationCount })}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-slate-400">{aboutPageContent.freePlan.footnote}</p>
                </div>

                <div className="rounded-[24px] border-2 border-ocean bg-ocean/[0.03] p-5 sm:rounded-xl">
                  <p className="text-sm font-bold text-ocean">
                    {BILLING_ENABLED ? aboutPageContent.proPlan.enabledTitle : aboutPageContent.proPlan.disabledTitle}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {aboutPageContent.proPlan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => navigate("/pro")}
                    size="sm"
                    disabled={!BILLING_ENABLED}
                    className={`mt-4 w-full rounded-2xl sm:w-auto sm:rounded-md ${
                      BILLING_ENABLED
                        ? "bg-ocean text-white hover:bg-ocean/90"
                        : "border border-slate-200 bg-white text-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    <Crown className="mr-1.5 h-3.5 w-3.5" /> {BILLING_ENABLED ? aboutPageContent.proPlan.enabledButton : aboutPageContent.proPlan.disabledButton}
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-3 dark:bg-slate-900 sm:rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {BILLING_ENABLED
                    ? aboutPageContent.funding.enabledHeadline
                    : aboutPageContent.funding.disabledHeadline}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {BILLING_ENABLED
                    ? aboutPageContent.funding.enabledBody
                    : `${BILLING_DISABLED_COPY.detail} ${aboutPageContent.funding.disabledBody}`}
                </p>
              </div>
            </section>

            {/* Right: What's Next + Open Source */}
            <div className="space-y-12">
              {/* What's Next — as desire, not release notes */}
              <section>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{aboutPageContent.sections.comingSoonTitle}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {aboutPageContent.sections.comingSoonDescription}
                </p>
                <div className="native-scroll mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-1 xl:grid-cols-2">
                  {aboutPageContent.comingSoonItems.map((item) => {
                    const Icon = COMING_SOON_ICONS[item.icon] ?? FlaskConical
                    return (
                    <div key={item.name} className="flex min-w-[13.5rem] snap-start items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:min-w-0 sm:rounded-lg sm:py-2.5 sm:shadow-none">
                      <span className={item.color}><Icon className="h-4 w-4" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                        {item.count && <p className="text-[10px] text-slate-400">{item.count} formulas</p>}
                      </div>
                    </div>
                  )})}
                </div>

              </section>

              {/* Open Source — bigger presence */}
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900 sm:rounded-xl sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <Github className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{aboutPageContent.openSource.title}</h2>
                    <p className="text-xs text-slate-500">{aboutPageContent.openSource.license}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {aboutPageContent.openSource.body}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:min-h-0 sm:justify-start sm:rounded-lg"
                  >
                    <Github className="h-4 w-4" /> {aboutPageContent.openSource.primaryLinkLabel}
                  </a>
                  <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-0 sm:justify-start sm:rounded-lg">
                    {aboutPageContent.openSource.secondaryLinkLabel}
                  </a>
                </div>
              </section>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  )
}
