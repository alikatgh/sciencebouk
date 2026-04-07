import type { ReactElement } from "react"
import { lazy, Suspense } from "react"
import { useNavigate } from "react-router-dom"
import { Github, Crown, ArrowRight, Atom, FlaskConical, Cpu, Smartphone } from "lucide-react"
import { TopNav } from "./TopNav"
import { ErrorBoundary } from "./ErrorBoundary"
import { Footer } from "./Footer"
import { Button } from "./ui/button"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { GITHUB_URL } from "../config/site"
import { equationManifest } from "../data/equationManifest"

const HeroDemo = lazy(() =>
  import("./HeroDemo").then((module) => ({ default: module.HeroDemo })),
)

export default function AboutPage(): ReactElement {
  const navigate = useNavigate()
  const equationCount = equationManifest.length

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <TopNav showBack />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12 lg:py-16">

          {/* ── HERO: text + live demo side by side ── */}
          <section className="grid items-start gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,300px)] md:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,320px)] lg:gap-14">
            <div className="max-w-2xl md:max-w-none">
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-[2.6rem] md:leading-[0.95]">
                Grab a variable. Drag it.<br />Watch the equation respond.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                {equationCount} equations that shaped the world, turned into interactive visualizations
                you can touch and understand. No textbook. No video.
                Just drag, change, and see why the formula works.
              </p>
              <p className="mt-6 text-base font-semibold text-slate-900 dark:text-slate-100">
                Built for people who gave up on math a long time ago.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 md:max-w-none">
                If you have to read to understand, we failed. If you can drag and discover, we succeeded.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={() => navigate("/equation/1")} className="bg-ocean text-white hover:bg-ocean/90">
                  Try Pythagoras right now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="text-slate-600 dark:text-slate-300">
                  Browse all {equationCount}
                </Button>
              </div>
            </div>

            {/* Live demo — the proof */}
            <div className="w-full md:justify-self-end">
              <div className="w-full max-w-[320px] rounded-2xl bg-slate-900 p-1 shadow-2xl shadow-slate-900/20 sm:max-w-[300px] md:ml-auto md:max-w-[320px]">
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={<div className="h-56 w-full animate-pulse rounded-xl bg-slate-800" />}>
                    <HeroDemo className="w-full" />
                  </Suspense>
                </ErrorBoundary>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400 md:text-right">
                Click to cycle through triples
              </p>
            </div>
          </section>

          {/* ── TWO-COLUMN GRID ── */}
          <div className="mt-14 grid gap-10 md:grid-cols-2 md:items-start xl:gap-12">

            {/* Left: Free vs Pro */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Free vs Pro</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Free — forever</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <li>All {equationCount} equations (and every future one)</li>
                    <li>All interactive visualizations</li>
                    <li>All guided lessons</li>
                    <li>Progress saved on your device</li>
                  </ul>
                  <p className="mt-3 text-xs text-slate-400">No account needed. No limits.</p>
                </div>

                <div className="rounded-xl border-2 border-ocean bg-ocean/[0.03] p-5">
                  <p className="text-sm font-bold text-ocean">
                    {BILLING_ENABLED ? "Pro — $4.99/month" : "Pro later"}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <li>Everything free, plus:</li>
                    <li>Progress sync across devices</li>
                    <li>Learning dashboard + streaks</li>
                    <li>Settings sync</li>
                  </ul>
                  <Button
                    onClick={() => navigate("/pro")}
                    size="sm"
                    disabled={!BILLING_ENABLED}
                    className={`mt-4 ${
                      BILLING_ENABLED
                        ? "bg-ocean text-white hover:bg-ocean/90"
                        : "border border-slate-200 bg-white text-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    <Crown className="mr-1.5 h-3.5 w-3.5" /> {BILLING_ENABLED ? "Go Pro" : "Pro later"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {BILLING_ENABLED
                    ? "Pro funds the next wave of subjects and keeps the servers running."
                    : "We are running a free beta first so the core learning experience can harden before payments turn on."}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {BILLING_ENABLED
                    ? "Chemistry, Biology, Computer Science — all coming. Everything core stays free. We're building for the long term."
                    : `${BILLING_DISABLED_COPY.detail} Chemistry, Biology, and Computer Science are still on the roadmap.`}
                </p>
              </div>
            </section>

            {/* Right: What's Next + Open Source */}
            <div className="space-y-12">
              {/* What's Next — as desire, not release notes */}
              <section>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Coming Soon</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Same interactive format. New subjects.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                  {[
                    { icon: <FlaskConical className="h-4 w-4" />, name: "Chemistry", count: 8, color: "text-emerald-500" },
                    { icon: <Atom className="h-4 w-4" />, name: "Biology", count: 8, color: "text-pink-500" },
                    { icon: <Cpu className="h-4 w-4" />, name: "Computer Science", count: 8, color: "text-violet-500" },
                    { icon: <Smartphone className="h-4 w-4" />, name: "Mobile app", count: null, color: "text-sky-500" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
                      <span className={item.color}>{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                        {item.count && <p className="text-[10px] text-slate-400">{item.count} formulas</p>}
                      </div>
                    </div>
                  ))}
                </div>

              </section>

              {/* Open Source — bigger presence */}
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <Github className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Fully Open Source</h2>
                    <p className="text-xs text-slate-500">MIT License</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Every equation, every visualization, every line of code.
                  Fork it, self-host it, study it, improve it, teach with it.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    <Github className="h-4 w-4" /> View on GitHub
                  </a>
                  <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    Report a bug
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
