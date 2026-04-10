import type { ReactElement } from "react"
import { lazy, Suspense, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Lock, ArrowRight, CheckCircle2,
  Pi, Atom, FlaskConical, Dna, TrendingUp, Cpu,
  BarChart3, Wrench, Telescope, Grid3X3,
} from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Progress } from "./ui/progress"
import { ErrorBoundary } from "./ErrorBoundary"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"
import { DeferredInlineMath } from "./math/DeferredInlineMath"
import { activeSubjects, getSubject, inactiveSubjects } from "../data/subjects"
import { homePageContent, interpolateContent } from "../data/pageContent"
import { prefetchEquationExperience } from "../lib/prefetchEquationExperience"
import { useAllProgress } from "../progress/useProgress"

const HeroDemo = lazy(() =>
  import("./HeroDemo").then((module) => ({ default: module.HeroDemo })),
)

const iconMap: Record<string, ReactElement> = {
  "pi": <Pi className="h-5 w-5" />,
  "atom": <Atom className="h-5 w-5" />,
  "flask-conical": <FlaskConical className="h-5 w-5" />,
  "dna": <Dna className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
  "cpu": <Cpu className="h-5 w-5" />,
  "bar-chart-3": <BarChart3 className="h-5 w-5" />,
  "wrench": <Wrench className="h-5 w-5" />,
  "telescope": <Telescope className="h-5 w-5" />,
  "grid-3x3": <Grid3X3 className="h-5 w-5" />,
}

function FormulaPreview({ formula, muted = false }: { formula: string; muted?: boolean }): ReactElement {
  return (
    <span className={muted ? "opacity-30" : ""}>
      <DeferredInlineMath math={formula} />
    </span>
  )
}

export function HomePage(): ReactElement {
  const navigate = useNavigate()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const { completedCount, total, progressByEquation } = useAllProgress()

  const completedEquationIds = useMemo(() => {
    const completedIds = new Set<number>()

    for (const [equationId, progress] of progressByEquation) {
      if (progress.completed) completedIds.add(equationId)
    }

    return completedIds
  }, [progressByEquation])

  const activeSubject = useMemo(
    () => (selectedSubject ? getSubject(selectedSubject) : null),
    [selectedSubject],
  )

  const continueLearningFormulas = useMemo(
    () => activeSubjects
      .flatMap((subject) => subject.formulas.filter((formula) => formula.id != null && !completedEquationIds.has(formula.id)))
      .slice(0, 4),
    [completedEquationIds],
  )

  const activeSubjectCards = useMemo(
    () => activeSubjects.map((subject) => ({
      subject,
      completedInSubject: subject.formulas.reduce((count, formula) => (
        formula.id != null && completedEquationIds.has(formula.id) ? count + 1 : count
      ), 0),
    })),
    [completedEquationIds],
  )

  const hasComingSoonSubjects = inactiveSubjects.length > 0

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
        {/* Header */}
        <TopNav
          showBack={!!activeSubject}
          onBack={activeSubject ? () => setSelectedSubject(null) : undefined}
          left={
            <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="max-w-full break-words text-[15px] font-bold leading-tight text-slate-900 dark:text-white sm:truncate sm:text-base">
                {activeSubject ? activeSubject.name : homePageContent.title}
              </span>
              {completedCount > 0 && !activeSubject && (
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                  <Progress
                    value={(completedCount / total) * 100}
                    className="h-1 w-full max-w-[6rem] sm:w-16"
                    aria-label={`${completedCount} of ${total} equations completed`}
                  />
                  <span className="shrink-0 text-[10px] text-slate-400">{completedCount}/{total}</span>
                </div>
              )}
            </div>
          }
        />
        <div className="flex-1">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
            {!activeSubject ? (
              <>
            {/* === HERO === */}
            <section className="mb-6 overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="grid items-center gap-5 p-4 sm:p-6 md:grid-cols-[1fr_auto] md:p-8">
                <div>
                  <h1 className="font-display text-[1.55rem] font-bold tracking-tight leading-tight md:text-3xl">
                    {homePageContent.hero.titleLine1}<br />
                    <span className="text-ocean">{homePageContent.hero.titleLine2}</span>
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                    {interpolateContent(homePageContent.hero.descriptionTemplate, { total })}
                  </p>
                  <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <Button
                      onClick={() => navigate("/equation/1")}
                      onMouseEnter={() => {
                        void prefetchEquationExperience(1)
                      }}
                      onFocus={() => {
                        void prefetchEquationExperience(1)
                      }}
                      className="min-h-[48px] justify-center rounded-2xl bg-ocean text-white hover:bg-ocean/90 sm:min-h-0"
                    >
                      {homePageContent.hero.primaryCta} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => {
                        const el = document.getElementById("subjects-section")
                        el?.scrollIntoView({ behavior: "smooth" })
                      }}
                      className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white sm:border-0 sm:px-0 sm:py-0"
                      type="button"
                    >
                      {homePageContent.hero.secondaryCta}
                    </button>
                  </div>
                </div>
                {/* Animated equation demo */}
                <div className="hidden flex-col items-center gap-2 md:flex">
                  <ErrorBoundary fallback={null}>
                    <Suspense
                      fallback={
                        <div className="w-56 rounded-2xl bg-white/10 px-5 py-5 backdrop-blur">
                          <div className="h-4 w-24 rounded bg-white/20" />
                          <div className="mt-4 h-8 w-full rounded bg-white/10" />
                          <div className="mt-4 flex items-end justify-center gap-2">
                            <div className="h-10 w-10 rounded bg-blue-400/20" />
                            <div className="h-14 w-14 rounded bg-amber-400/20" />
                            <div className="h-16 w-16 rounded bg-red-400/20" />
                          </div>
                        </div>
                      }
                    >
                      <HeroDemo />
                    </Suspense>
                  </ErrorBoundary>
                  <p className="text-[10px] text-slate-500">{homePageContent.hero.demoCaption}</p>
                </div>
              </div>
            </section>

            {/* === CONTINUE / FEATURED === */}
            {completedCount > 0 && completedCount < total && continueLearningFormulas.length > 0 && (
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{homePageContent.sections.continueLearning}</h3>
                <div className="native-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                  {continueLearningFormulas.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => navigate(`/equation/${f.id}`)}
                        onMouseEnter={() => {
                          void prefetchEquationExperience(f.id!)
                        }}
                        onFocus={() => {
                          void prefetchEquationExperience(f.id!)
                        }}
                        className="flex min-w-[15rem] snap-start flex-shrink-0 flex-col rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:border-ocean/30 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:min-w-0"
                        type="button"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <FormulaPreview formula={f.formula} />
                        </span>
                        <span className="mt-1 text-xs font-semibold text-slate-800 dark:text-white">{f.title}</span>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* === FEATURED: 17 Equations === */}
            <div id="subjects-section" className="space-y-3">
              {activeSubjectCards.map(({ subject, completedInSubject }) => {
                return (
                  <Card
                    key={subject.slug}
                    role="button"
                    tabIndex={0}
                    className="group cursor-pointer overflow-hidden rounded-[28px] border-2 border-slate-900 bg-slate-900 text-white transition-all hover:shadow-xl active:scale-[0.995] dark:border-slate-700 dark:bg-slate-800"
                    onClick={() => setSelectedSubject(subject.slug)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSubject(subject.slug) } }}
                    aria-label={`Open ${subject.name}`}
                  >
                    <div className="flex items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-5">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 sm:h-12 sm:w-12">
                        {iconMap[subject.icon] ?? <Pi className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold leading-tight sm:text-lg">{subject.name}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:mt-0.5 sm:text-sm">{subject.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs font-medium text-slate-400">
                            {interpolateContent(homePageContent.sections.subjectCountTemplate, { count: subject.formulas.length })}
                          </span>
                          {completedInSubject > 0 && (
                            <span className="text-xs font-medium text-emerald-400">
                              {interpolateContent(homePageContent.sections.subjectCompletedTemplate, { count: completedInSubject })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 transition group-hover:text-white sm:h-5 sm:w-5" />
                    </div>
                    <div className="border-t border-slate-700 bg-slate-800/50 px-4 py-2 sm:px-5 sm:py-2.5 dark:bg-slate-900/50">
                      <div className="native-scroll flex snap-x snap-mandatory gap-x-4 gap-y-1 overflow-x-auto pb-1 md:max-h-7 md:flex-wrap md:overflow-hidden md:pb-0">
                        {subject.formulas.slice(0, 5).map((f, i) => (
                          <span key={i} className="shrink-0 snap-start text-[11px] text-slate-400 md:shrink md:text-xs">
                            <FormulaPreview formula={f.formula} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* === COMING NEXT === */}
            {hasComingSoonSubjects && (
              <div className="mt-8">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">{homePageContent.sections.comingNext}</h3>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {inactiveSubjects.map((subject) => (
                    <button
                      key={subject.slug}
                      type="button"
                      className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-dashed border-slate-200 px-4 py-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98] dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                      onClick={() => setSelectedSubject(subject.slug)}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                        {iconMap[subject.icon] ?? <Pi className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{subject.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {interpolateContent(homePageContent.sections.comingSoonCountTemplate, { count: subject.formulas.length })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
              </>
            ) : (
            /* === FORMULA GRID VIEW (inside a subject) === */
              <div>
                <p className="mb-4 text-xs text-slate-400">{activeSubject!.description}</p>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {activeSubject!.formulas.map((f: { id?: number; formula: string; title: string; author?: string; year?: string }, i: number) => {
                    const isActive = activeSubject!.active && f.id != null
                    const done = f.id != null && completedEquationIds.has(f.id)

                    return (
                      <Card
                        key={i}
                        role={isActive ? "button" : undefined}
                        tabIndex={isActive ? 0 : undefined}
                        aria-label={isActive ? `Open ${f.title}` : undefined}
                          className={`overflow-hidden rounded-[22px] transition-all ${
                            isActive
                              ? "cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
                              : "border-dashed opacity-40"
                        }`}
                        onClick={isActive ? () => navigate(`/equation/${f.id}`) : undefined}
                        onKeyDown={isActive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/equation/${f.id}`) } } : undefined}
                        onMouseEnter={isActive ? () => {
                          void prefetchEquationExperience(f.id!)
                        } : undefined}
                        onFocus={isActive ? () => {
                          void prefetchEquationExperience(f.id!)
                        } : undefined}
                      >
                        {/* Formula — the hero */}
                        <div className="flex min-h-[72px] items-center justify-center border-b border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                          <div className="text-center text-base text-slate-700 dark:text-slate-300">
                            {isActive ? (
                              <FormulaPreview formula={f.formula} />
                            ) : (
                              <FormulaPreview formula={f.formula} muted />
                            )}
                          </div>
                        </div>
                        {/* Meta */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          {isActive ? (
                            <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                              done ? "bg-emerald-100 text-emerald-600" : "text-slate-300"
                            }`}>
                              {done ? <CheckCircle2 className="h-3 w-3" /> : f.id}
                            </span>
                          ) : (
                            <Lock className="h-3 w-3 text-slate-300" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">{f.title}</p>
                            {f.author && <p className="truncate text-[10px] text-slate-400">{f.author}{f.year ? `, ${f.year}` : ""}</p>}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
    </main>
  )
}
