import type { ReactElement } from "react"
import { useNavigate } from "react-router-dom"
import { Github, Crown, ExternalLink } from "lucide-react"
import { TopNav } from "./TopNav"
import { Button } from "./ui/button"

const GITHUB_URL = "https://github.com/alikatgh/sciencebouk"

export default function AboutPage(): ReactElement {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <TopNav showBack />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-12">

          {/* Hero */}
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
            Grab a variable. Drag it.<br />Watch the equation respond.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400">
            17 equations that shaped the world, turned into interactive visualizations
            you can touch and understand. No textbook. No video.
            Just drag, change, and see why the formula works.
          </p>
          <p className="mt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
            Built for people who gave up on math a long time ago.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If you have to read to understand, we failed. If you can drag and discover, we succeeded.
          </p>

          <Button onClick={() => navigate("/equation/1")} className="mt-6 bg-ocean text-white hover:bg-ocean/90">
            Try Pythagoras right now
          </Button>

          {/* Open Source */}
          <section className="mt-14">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-slate-900 dark:text-white" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Open Source</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Every equation, every visualization, every line of code is open.
              Fork it, self-host it, study it, improve it.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              <Github className="h-4 w-4" /> View on GitHub <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </section>

          {/* Free vs Pro */}
          <section className="mt-14">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Free vs Pro</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Free — forever</p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <li>All 17 equations (and every future one)</li>
                  <li>All interactive visualizations</li>
                  <li>All guided lessons</li>
                  <li>Progress saved on your device</li>
                </ul>
                <p className="mt-3 text-xs text-slate-400">No account needed. No limits. New subjects added free as they launch.</p>
              </div>

              <div className="rounded-xl border-2 border-ocean bg-ocean/[0.03] p-5">
                <p className="text-sm font-bold text-ocean">Pro — $4.99/month</p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <li>Everything free, plus:</li>
                  <li>Progress sync across devices</li>
                  <li>Learning dashboard + streaks</li>
                  <li>Personal notes + bookmarks</li>
                  <li>Settings sync</li>
                </ul>
                <Button onClick={() => navigate("/pro")} size="sm" className="mt-4 bg-ocean text-white hover:bg-ocean/90">
                  <Crown className="mr-1.5 h-3.5 w-3.5" /> Go Pro
                </Button>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Pro pays for hosting, sync, and the next wave of subjects:
              Chemistry, Biology, and Computer Science.
              Everything core stays free. We're building for the long term.
            </p>
          </section>

          {/* What's next */}
          <section className="mt-14">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">What's Next</h2>
            <div className="mt-3 space-y-2">
              {[
                { done: true, text: "17 interactive equations with D3 visualizations" },
                { done: true, text: "Step-by-step lessons you complete by dragging" },
                { done: true, text: "Live formula substitution with real numbers" },
                { done: true, text: "Accounts, Pro, and progress sync" },
                { done: false, text: "Chemistry (8 formulas)" },
                { done: false, text: "Biology (8 formulas)" },
                { done: false, text: "Computer Science (8 formulas)" },
                { done: false, text: "Mobile app" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    item.done
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                  }`}>
                    {item.done ? "\u2713" : "\u2192"}
                  </span>
                  <span className={item.done ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Contribute */}
          <section className="mt-14">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contribute</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Found a math error? Want to add an equation?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                <Github className="h-3.5 w-3.5" /> Star on GitHub
              </a>
              <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                Report a bug
              </a>
            </div>
          </section>

          <div className="mt-14 border-t border-slate-100 pt-4 dark:border-slate-800" />
        </div>
      </div>
    </main>
  )
}
