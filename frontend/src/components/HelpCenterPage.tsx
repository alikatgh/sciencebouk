import type { ReactElement } from "react"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, BookOpen, LifeBuoy, Search, ShieldCheck, Upload } from "lucide-react"
import { Footer } from "./Footer"
import { TopNav } from "./TopNav"
import { Button } from "./ui/button"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"
import { helpCenterContent, interpolateContent } from "../data/pageContent"
import { SUPPORT_EMAIL } from "../config/site"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"

export default function HelpCenterPage(): ReactElement {
  const navigate = useNavigate()
  const manifestQuery = useEquationManifest()
  const manifest = useMemo(
    () => resolveEquationManifest(manifestQuery.data),
    [manifestQuery.data],
  )
  const equationCount = manifest.length
  const renderSupportTemplate = (template: string): ReactElement => {
    const [before, after = ""] = template.split("{supportEmail}")
    return (
      <>
        {before}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ocean hover:underline">{SUPPORT_EMAIL}</a>
        {after}
      </>
    )
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <TopNav showBack />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-6 md:py-12 lg:py-16">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,360px)] lg:gap-10">
            <div className="rounded-[30px] border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:p-7">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                {helpCenterContent.badge}
              </span>
              <h1 className="mt-4 font-display text-[2rem] font-bold tracking-tight text-slate-900 dark:text-white md:text-[2.6rem] md:leading-[0.95]">
                {helpCenterContent.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                {helpCenterContent.description}
              </p>

              <div className="native-scroll mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-6 md:flex-wrap md:overflow-visible md:pb-0">
                <span className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {equationCount} interactive equations
                </span>
                {helpCenterContent.heroChips.map((chip) => (
                  <span key={chip} className="inline-flex min-w-max items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Button onClick={() => navigate("/equation/1")} className="min-h-[48px] justify-center rounded-2xl bg-ocean text-white hover:bg-ocean/90 sm:min-h-0">
                  {helpCenterContent.primaryCta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/changelog")}
                  className="min-h-[48px] justify-center rounded-2xl text-slate-600 dark:text-slate-300 sm:min-h-0"
                >
                  {helpCenterContent.secondaryCta}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/about")}
                  className="min-h-[48px] justify-center rounded-2xl text-slate-600 dark:text-slate-300 sm:min-h-0"
                >
                  {helpCenterContent.tertiaryCta}
                </Button>
              </div>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <LifeBuoy className="h-4 w-4 text-ocean" />
                Quick answers
              </div>
              <div className="mt-4 space-y-3">
                {helpCenterContent.quickAnswers.map((answer) => {
                  let body = answer.body
                  if (answer.id === "progress") {
                    body = BILLING_ENABLED ? answer.enabledBody : BILLING_DISABLED_COPY.body
                  }
                  const resolvedBody = body
                    ? interpolateContent(body, { supportEmail: SUPPORT_EMAIL })
                    : ""

                  return (
                    <div key={answer.title} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{answer.title}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {answer.id === "support"
                          ? renderSupportTemplate(answer.body ?? "")
                          : resolvedBody}
                      </p>
                    </div>
                  )
                })}
              </div>
            </aside>
          </section>

          <section className="mt-10">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{helpCenterContent.learner.title}</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {helpCenterContent.learner.description}
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {helpCenterContent.learner.cards.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {helpCenterContent.learner.checklists.map((checklist, index) => (
              <article key={checklist.title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {index === 0 ? <Search className="h-4 w-4 text-ocean" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                  {checklist.title}
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {checklist.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              ))}
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{helpCenterContent.learner.timelineCard.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {helpCenterContent.learner.timelineCard.body}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/changelog")}
                className="mt-4 rounded-2xl text-slate-600 dark:text-slate-300"
              >
                {helpCenterContent.learner.timelineCard.button} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{helpCenterContent.editors.title}</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {helpCenterContent.editors.description}
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {helpCenterContent.editors.paths.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{helpCenterContent.editors.checklistTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {helpCenterContent.editors.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-sm dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{helpCenterContent.editors.sampleTitle}</h3>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {helpCenterContent.editors.sampleBadge}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {helpCenterContent.editors.sampleBody}
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-relaxed text-slate-200">
                  <code>{helpCenterContent.editors.sampleJsonLines.join("\n")}</code>
                </pre>
              </article>
            </div>

            <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                {helpCenterContent.editors.privacyTitle}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                {helpCenterContent.editors.privacyBody}
              </p>
            </div>
          </section>

          <section className="mt-12 rounded-[28px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-ocean" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{helpCenterContent.support.title}</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {renderSupportTemplate(helpCenterContent.support.body)}
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
