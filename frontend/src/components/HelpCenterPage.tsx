import type { ReactElement } from "react"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, BookOpen, LifeBuoy, Search, ShieldCheck, Upload } from "lucide-react"
import { Footer } from "./Footer"
import { TopNav } from "./TopNav"
import { Button } from "./ui/button"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { SUPPORT_EMAIL } from "../config/site"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"

const userQuickStart = [
  {
    title: "Pick any formula and start touching it",
    body:
      "Each equation page is built around one interactive scene. Drag variables, use presets, and watch the picture update before you read the explanation.",
  },
  {
    title: "Read the plain-language explanation under the canvas",
    body:
      "Every formula has a short real-world hook, a simpler explanation, and guided lesson steps. The goal is to make the hard-looking formula feel human first.",
  },
  {
    title: "Move at your own pace",
    body:
      "You can browse equation by equation, search the atlas, and come back later. Core learning stays free while the beta hardens.",
  },
]

const editorPaths = [
  {
    title: "Edit one equation directly",
    body:
      "Open the equation record in Django Admin and update the title, formula, hook, hook action, variables, presets, lessons, or glossary fields.",
  },
  {
    title: "Bulk import many equations with JSON",
    body:
      "In Admin, go to Courses -> Equations -> Import JSON. Drag in a JSON file or paste JSON text. The importer matches rows by id or sort_order and updates the public site content.",
  },
]

const editorChecklist = [
  "sort_order controls the atlas order and public equation id",
  "title, formula, author, year, and category are the required fields for a new equation",
  "hook and hookAction drive the simple explanation shown around the visualization",
  "variables, presets, lessons, and glossary are the rich teaching blocks that power the interactive experience",
  "Courses and Lessons in admin are useful for broader course shells, while most per-equation teaching content lives on the Equation record itself",
]

const sampleJson = `[
  {
    "id": 18,
    "title": "Euler-Lagrange Equation",
    "formula": "\\\\frac{d}{dt}\\\\frac{\\\\partial L}{\\\\partial \\\\dot{q}}-\\\\frac{\\\\partial L}{\\\\partial q}=0",
    "author": "Euler and Lagrange",
    "year": "1750s",
    "category": "physics",
    "hook": "Nature tends to choose the path that balances competing costs.",
    "hookAction": "Drag the path and compare how the action changes.",
    "variables": [],
    "presets": [],
    "lessons": [],
    "glossary": []
  }
]`

export default function HelpCenterPage(): ReactElement {
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
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,360px)] lg:gap-10">
            <div className="rounded-[30px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:p-7">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                Help Center
              </span>
              <h1 className="mt-4 font-display text-[2rem] font-bold tracking-tight text-slate-900 dark:text-white md:text-[2.6rem] md:leading-[0.95]">
                How Sciencebo works, in plain English.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                This is the home base for learners, teachers, and editors. Start here if you want to understand
                how to use the site, how the lessons are structured, or how to add new formulas through the admin panel.
              </p>

              <div className="native-scroll mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-6 md:flex-wrap md:overflow-visible md:pb-0">
                <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {equationCount} interactive equations
                </span>
                <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Learner-first explanations
                </span>
                <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Admin-powered content updates
                </span>
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button onClick={() => navigate("/equation/1")} className="min-h-[48px] justify-center rounded-2xl bg-ocean text-white hover:bg-ocean/90 sm:min-h-0">
                  Open the first equation <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/changelog")}
                  className="min-h-[48px] justify-center rounded-2xl text-slate-600 dark:text-slate-300 sm:min-h-0"
                >
                  Open changelog
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/about")}
                  className="min-h-[48px] justify-center rounded-2xl text-slate-600 dark:text-slate-300 sm:min-h-0"
                >
                  Read the story behind the project
                </Button>
              </div>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <LifeBuoy className="h-4 w-4 text-ocean" />
                Quick answers
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Need an account?</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    No. The core equation experience is open to everyone.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Progress and sync</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {BILLING_ENABLED
                      ? "Accounts can unlock sync and dashboard features."
                      : BILLING_DISABLED_COPY.body}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Need help?</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ocean hover:underline">{SUPPORT_EMAIL}</a>.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">For learners</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Every equation page follows the same pattern: interactive canvas first, simple explanation second,
              then guided steps and supporting context. We want the visual intuition to land before the formalism does.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {userQuickStart.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Search className="h-4 w-4 text-ocean" />
                  What to do on an equation page
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>Use the plus and minus controls or pinch/scroll to zoom the visualization.</li>
                  <li>Drag colored variables to see the formula respond in real time.</li>
                  <li>Read the short hook if the full formula still feels intimidating.</li>
                  <li>Work through the lesson steps when you want a slower, guided path.</li>
                </ul>
              </article>

              <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  What stays free during beta
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>All live equations and visual lessons.</li>
                  <li>Browsing, searching, and reading the atlas.</li>
                  <li>The core teaching content for every formula we publish.</li>
                  <li>Accounts, sync, dashboard, and billing features only expand when the beta is ready.</li>
                </ul>
              </article>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Want the product timeline?</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                The changelog now has two views: General for learners and users, Engineering for the deeper technical story behind each release.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/changelog")}
                className="mt-4 rounded-2xl text-slate-600 dark:text-slate-300"
              >
                Read the changelog <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">For editors and teachers</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              If you have admin access, you can expand the atlas without touching code. Most of the public teaching
              experience lives in the Equation admin record, and bulk updates can now be imported with JSON.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {editorPaths.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Content model cheat sheet</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {editorChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">Example JSON import</h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Safe public example
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Paste this into the import tool as a template. No credentials or private URLs are required here.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-relaxed text-slate-200">
                  <code>{sampleJson}</code>
                </pre>
              </article>
            </div>

            <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Privacy note
              </div>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                This guide is intentionally generic. It explains the content workflow, but it does not publish admin
                credentials, private infrastructure details, or personal deployment information.
              </p>
            </div>
          </section>

          <section className="mt-12 rounded-[28px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Still stuck?</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              If a formula feels confusing, a scene breaks, or you want help structuring new content, send a note to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ocean hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
