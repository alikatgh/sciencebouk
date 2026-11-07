import type { ReactElement } from "react"
import { lazy, Suspense, useEffect, useId, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, CheckCircle2, Search, X, BookOpen, ArrowLeft, Clock3 } from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { ErrorBoundary } from "./ErrorBoundary"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"
import { AutoFitDeferredInlineMath } from "./math/AutoFitDeferredInlineMath"
import { activeSubjects, getSubject, inactiveSubjects } from "../data/subjects"
import type { SubjectFormula } from "../data/subjects"
import { interpolateContent, useHomePageContent } from "../data/pageContent"
import { coreEquationManifest } from "../data/equationManifest"
import { getWhatItMeans } from "../data/whatItMeans"
import { prefetchEquationExperience } from "../lib/prefetchEquationExperience"
import { useAllProgress } from "../progress/useProgress"

const HeroDemo = lazy(() =>
  import("./HeroDemo").then((module) => ({ default: module.HeroDemo })),
)

const starterIdeas = [
  { id: 1, prompt: "How do the sides of a triangle fit together?", topic: "Geometry", kind: "triangle" },
  { id: 34, prompt: "What happens when you push a little harder?", topic: "Physics", kind: "motion" },
  { id: 51, prompt: "How can small changes grow over time?", topic: "Economics", kind: "growth" },
]

function FormulaPreview({ formula }: { formula: string }): ReactElement {
  return <AutoFitDeferredInlineMath math={formula} minScale={0.6} overflow="hidden" />
}

function StarterDrawing({ kind }: { kind: string }): ReactElement {
  return (
    <svg viewBox="0 0 140 100" className="h-[92px] w-full" aria-hidden="true">
      {kind === "triangle" ? (
        <g fill="none" strokeWidth="2" className="text-[#315cdd] dark:text-[#a9beff]">
          <path d="M36 18 V77 H111 Z" fill="currentColor" fillOpacity=".06" stroke="currentColor" />
          <path d="M36 65 H48 V77" className="stroke-slate-400" strokeWidth="1.3" />
          <path d="M36 77 H111" className="stroke-[#167c66] dark:stroke-[#77d9bd]" />
          <text x="22" y="52" fontSize="12" stroke="none" fill="currentColor">a</text>
          <text x="69" y="93" fontSize="12" stroke="none" className="fill-[#167c66] dark:fill-[#77d9bd]">b</text>
        </g>
      ) : kind === "motion" ? (
        <g className="text-[#315cdd] dark:text-[#a9beff]">
          <path d="M12 78 H130" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
          <rect x="65" y="35" width="43" height="41" rx="4" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeWidth="2" />
          <path d="M14 55 H53 M44 47 L53 55 L44 63" fill="none" className="stroke-[#167c66] dark:stroke-[#77d9bd]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="29" y="39" fontSize="12" className="fill-[#167c66] dark:fill-[#77d9bd]">F</text>
          <text x="81" y="60" fontSize="12" fill="currentColor">m</text>
        </g>
      ) : (
        <g fill="none" className="text-[#167c66] dark:text-[#77d9bd]">
          <path d="M22 17 V79 H125" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
          <path d="M23 74 C60 74 89 60 119 20" stroke="currentColor" strokeWidth="2.5" />
          {[{x:42,y:72},{x:70,y:63},{x:96,y:45},{x:119,y:20}].map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" stroke="currentColor" className="fill-white dark:fill-[#121e32]" strokeWidth="1.5" />)}
        </g>
      )}
    </svg>
  )
}

function searchable(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function HomePage(): ReactElement {
  const libraryId = useId()
  const homePageContent = useHomePageContent()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(12)
  const { completedCount, total, progressByEquation } = useAllProgress()

  const equations = useMemo(() => {
    const unique = new Map<number, SubjectFormula>()
    for (const subject of activeSubjects) {
      for (const formula of subject.formulas) {
        if (formula.id != null && !unique.has(formula.id)) unique.set(formula.id, formula)
      }
    }
    return Array.from(unique.values())
  }, [])

  const completedEquationIds = useMemo(
    () => new Set(Array.from(progressByEquation).filter(([, progress]) => progress.completed).map(([id]) => id)),
    [progressByEquation],
  )
  const activeSubject = selectedSubject ? getSubject(selectedSubject) : null
  const recentEquations = useMemo(() => equations
    .filter((equation) => {
      const progress = progressByEquation.get(equation.id!)
      return progress && !progress.completed && (progress.lastViewed || progress.timeSpentSeconds > 0 || progress.lessonStep)
    })
    .sort((a, b) => (Date.parse(progressByEquation.get(b.id!)?.lastViewed || "") || 0) - (Date.parse(progressByEquation.get(a.id!)?.lastViewed || "") || 0))
    .slice(0, 3), [equations, progressByEquation])

  const nextEquation = equations.find((equation) => !completedEquationIds.has(equation.id!))
  const visibleEquations = useMemo(() => {
    const scope = activeSubject ? activeSubject.formulas : equations
    const tokens = searchable(query.trim()).split(/\s+/).filter(Boolean)
    return scope.filter((equation) => {
      const topics = activeSubjects.filter((subject) => subject.formulas.some((formula) => formula.id === equation.id)).map((subject) => subject.name).join(" ")
      const haystack = searchable(`${equation.title} ${equation.author ?? ""} ${equation.year ?? ""} ${equation.formula} ${topics}`)
      return tokens.every((token) => haystack.includes(token))
    })
  }, [activeSubject, equations, query])

  useEffect(() => {
    setSelectedSubject(null)
    if (location.hash === "#subjects-section") {
      const frame = requestAnimationFrame(() => document.getElementById("subjects-section")?.scrollIntoView())
      return () => cancelAnimationFrame(frame)
    }
  }, [location.key, location.hash])

  function chooseSubject(slug: string | null) {
    setSelectedSubject(slug)
    setQuery("")
    setVisibleCount(12)
    requestAnimationFrame(() => document.getElementById("subjects-section")?.scrollIntoView())
  }

  function browseLibrary() {
    setSelectedSubject(null)
    setQuery("")
    setVisibleCount(12)
    requestAnimationFrame(() => document.getElementById("subjects-section")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    }))
  }

  function openEquation(id: number) {
    navigate(`/equation/${id}`)
  }

  function equationCard(equation: SubjectFormula, index: number): ReactElement {
    const available = equation.id != null && (activeSubject?.active ?? true)
    const done = equation.id != null && completedEquationIds.has(equation.id)
    const isRecent = available && !done && recentEquations.some((recent) => recent.id === equation.id)
    const meaning = equation.id != null ? getWhatItMeans(equation.id)?.plainEnglish.split(/(?<=[.!?])\s+/)[0] : undefined
    const subject = activeSubjects.find((item) => item.slug !== "core" && item.formulas.some((formula) => formula.id === equation.id))
    const category = coreEquationManifest.find((item) => item.id === equation.id)?.category?.replace(/_/g, " ")
    const topic = subject?.name ?? (category ? category.charAt(0).toUpperCase() + category.slice(1) : activeSubject?.name)
    const topicId = `${libraryId}-topic-${equation.id ?? index}`
    const statusId = `${libraryId}-status-${equation.id ?? index}`
    const descriptionIds = [topic ? topicId : null, done || isRecent ? statusId : null].filter(Boolean).join(" ") || undefined
    const content = (
      <>
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span id={topicId} className="truncate">{topic}</span>
          {done ? <span id={statusId} className="flex shrink-0 items-center gap-1.5 text-[#167c66] dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Completed</span> : isRecent ? <span id={statusId} className="flex shrink-0 items-center gap-1.5 text-[#167c66] dark:text-emerald-300"><Clock3 className="h-3.5 w-3.5" />Resume</span> : available ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-ocean dark:group-hover:text-[#a9beff]" /> : <span>Coming soon</span>}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold leading-snug tracking-[-.02em] text-ink dark:text-slate-100">{equation.title}</h3>
        {meaning && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{meaning}</p>}
        <div className="mt-auto pt-5">
          <div aria-hidden="true" className="min-w-0 overflow-hidden border-t border-[var(--studio-line)] py-4 text-[.9rem] text-slate-600 dark:text-slate-300"><FormulaPreview formula={equation.formula} /></div>
          {(equation.author || equation.year) && <p className="text-xs text-slate-500 dark:text-slate-400">{[equation.author, equation.year].filter(Boolean).join(", ")}</p>}
        </div>
      </>
    )
    const cardClassName = "group flex min-h-[265px] min-w-0 flex-col rounded-[18px] border border-[var(--studio-line)] bg-[var(--studio-panel)] px-5 pb-4 pt-5 text-left transition-colors hover:border-[#a5b8e9] dark:hover:border-[#6b82b4]"
    return available ? (
      <button key={equation.id ?? index} type="button" onClick={() => openEquation(equation.id!)} onMouseEnter={() => void prefetchEquationExperience(equation.id!)} onFocus={() => void prefetchEquationExperience(equation.id!)} aria-label={`Open ${equation.title}`} aria-describedby={descriptionIds} className={cardClassName}>
        {content}
      </button>
    ) : <article key={index} className={`${cardClassName} border-dashed`}>{content}</article>
  }

  return (
    <main className="studio-shell flex min-h-[100dvh] flex-col">
      <TopNav />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {!activeSubject && (
          <>
            {(recentEquations.length > 0 || completedCount > 0) && (
              <section aria-labelledby="continue-heading" className="mb-8 rounded-[18px] border border-[#cbded9] bg-[#edf5f2] px-5 py-5 dark:border-emerald-900 dark:bg-emerald-950/25 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 id="continue-heading" className="font-display text-lg font-bold tracking-tight text-ink dark:text-slate-100">{homePageContent.sections.continueLearning}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{completedCount >= total && total > 0 ? "Every lesson completed. Revisit an equation and try a new experiment." : recentEquations.length > 0 ? "Your last experiment is ready when you are." : "Ready for your next experiment?"}</p>
                  </div>
                  <div className="w-full max-w-[200px]">
                    <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">{completedCount} of {total} completed</p>
                    <Progress value={total ? completedCount / total * 100 : 0} className="h-1.5 bg-emerald-900/10" aria-label={`${completedCount} of ${total} equations completed`} />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {(recentEquations.length > 0 ? recentEquations : nextEquation ? [nextEquation] : []).map((equation) => (
                    <button key={equation.id} type="button" onClick={() => openEquation(equation.id!)} onMouseEnter={() => void prefetchEquationExperience(equation.id!)} onFocus={() => void prefetchEquationExperience(equation.id!)} className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-3 text-left text-ink hover:bg-white/70 dark:bg-[var(--studio-panel)] dark:text-slate-100 dark:hover:bg-slate-800">
                      <Clock3 className="h-4 w-4 shrink-0 text-[#167c66] dark:text-emerald-300" />
                      <span className="min-w-0 flex-1 text-sm font-medium">{equation.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#167c66] dark:text-emerald-300" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="grid items-center gap-8 pb-10 sm:gap-10 lg:grid-cols-[.95fr_1.05fr] lg:gap-16 lg:pb-12" aria-labelledby="home-title">
              <div className="min-w-0 lg:pb-4">
                <h1 id="home-title" className="max-w-[600px] font-display text-[2.5rem] font-semibold leading-[1.12] tracking-[-.055em] text-ink dark:text-slate-100 sm:text-[3.15rem] lg:text-[3.75rem]">
                  {homePageContent.hero.titleLine1}{" "}{homePageContent.hero.titleLine2}
                </h1>
                <p className="mt-6 max-w-[440px] text-base leading-[1.7] text-slate-600 dark:text-slate-400 sm:text-lg">
                  {interpolateContent(homePageContent.hero.descriptionTemplate, { total: equations.length })}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button onClick={() => openEquation(1)} onMouseEnter={() => void prefetchEquationExperience(1)} onFocus={() => void prefetchEquationExperience(1)} className="min-h-12 rounded-xl bg-ocean px-5 text-base font-medium text-white hover:bg-[#264bc0]">
                    {homePageContent.hero.primaryCta}<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" onClick={browseLibrary} className="min-h-12 rounded-xl px-4 text-base font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">{homePageContent.hero.secondaryCta}</Button>
                </div>
              </div>
              <ErrorBoundary fallback={<div className="rounded-[24px] border border-[var(--studio-line)] bg-[var(--studio-panel)] p-8 text-slate-600 dark:text-slate-300">Open Pythagoras to try the interactive experiment.</div>}>
                <Suspense fallback={<div className="h-[500px] rounded-[24px] border border-[var(--studio-line)] bg-[var(--studio-panel)]" aria-label="Loading interactive example" />}>
                  <HeroDemo />
                </Suspense>
              </ErrorBoundary>
            </section>

            <section className="mb-12 border-y border-[var(--studio-line)] py-6 sm:mb-14" aria-labelledby="starters-heading">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="starters-heading" className="font-display text-lg font-bold tracking-tight text-ink dark:text-slate-100">Start with a question</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">A few places to begin.</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3 md:gap-5">
                {starterIdeas.map((idea) => {
                  const equation = equations.find((item) => item.id === idea.id)
                  if (!equation) return null
                  return (
                    <button type="button" key={idea.id} onClick={() => openEquation(idea.id)} onMouseEnter={() => void prefetchEquationExperience(idea.id)} onFocus={() => void prefetchEquationExperience(idea.id)} className="group grid min-w-0 grid-cols-[100px_1fr] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white dark:hover:bg-slate-900 lg:grid-cols-[110px_1fr]">
                      <StarterDrawing kind={idea.kind} />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{idea.topic}</p>
                        <h3 className="mt-1 font-display text-[15px] font-bold leading-snug tracking-[-.015em] text-ink dark:text-slate-100">{idea.prompt}</h3>
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ocean dark:text-[#a9beff]">{equation.title}<ArrowRight className="h-3.5 w-3.5 shrink-0" /></p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <section id="subjects-section" className="scroll-mt-28" aria-labelledby="library-heading">
          {activeSubject && <button type="button" onClick={() => chooseSubject(null)} className="mb-5 flex min-h-11 items-center gap-2 text-sm font-medium text-ocean dark:text-[#a9beff]"><ArrowLeft className="h-4 w-4" />All subjects</button>}
          <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 id="library-heading" className="font-display text-[1.9rem] font-bold tracking-[-.04em] text-ink dark:text-slate-100 sm:text-[2.25rem]">{activeSubject ? activeSubject.name : "The equation library"}</h2>
              <p className="mt-2 max-w-xl text-base text-slate-600 dark:text-slate-400">{activeSubject ? activeSubject.description : "Find the idea behind the formula. Then make it move."}</p>
            </div>
            <div className="relative w-full lg:max-w-[360px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12) }} placeholder="Search equations, people, topics" aria-label="Search equations" className="h-12 w-full rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] pl-11 pr-11 text-base text-ink outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/15 dark:text-slate-100 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden" />
              {query && <button type="button" onClick={() => { setQuery(""); setVisibleCount(12) }} aria-label="Clear search" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-ink dark:hover:text-slate-100"><X className="h-4 w-4" /></button>}
            </div>
          </div>
          <nav aria-label="Subjects" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            <button type="button" aria-pressed={!activeSubject} onClick={() => chooseSubject(null)} className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-full border px-4 py-2 text-left text-sm font-medium ${!activeSubject ? "border-ink bg-ink text-white dark:border-slate-200 dark:bg-slate-200 dark:text-ink" : "border-[var(--studio-line)] bg-[var(--studio-panel)] text-slate-600 hover:border-slate-400 dark:text-slate-300"}`}>
              <span>All equations</span><span className="text-xs tabular-nums opacity-60">{equations.length}</span>
            </button>
            {activeSubjects.map((subject) => (
              <button key={subject.slug} type="button" onClick={() => chooseSubject(subject.slug)} aria-label={`Open ${subject.name}`} aria-pressed={selectedSubject === subject.slug} className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-full border px-4 py-2 text-left text-sm ${selectedSubject === subject.slug ? "border-ink bg-ink font-medium text-white dark:border-slate-200 dark:bg-slate-200 dark:text-ink" : "border-[var(--studio-line)] bg-[var(--studio-panel)] text-slate-600 hover:border-slate-400 dark:text-slate-300"}`}>
                <span>{subject.name}</span><span className="text-xs tabular-nums opacity-60">{subject.formulas.length}</span>
              </button>
            ))}
          </nav>
          <div className="min-w-0">
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400" role="status">{visibleEquations.length} {visibleEquations.length === 1 ? "equation" : "equations"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
            {visibleEquations.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleEquations.slice(0, visibleCount).map(equationCard)}</div>
                {visibleCount < visibleEquations.length && <div className="mt-8 flex flex-col items-center gap-3"><Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + 12)} className="min-h-12 rounded-xl border-[var(--studio-line)] bg-[var(--studio-panel)] px-6 text-sm">Show more equations</Button><p className="text-xs text-slate-500 dark:text-slate-400">Showing {visibleCount} of {visibleEquations.length}</p></div>}
              </>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[var(--studio-line)] bg-[var(--studio-panel)] px-6 py-14 text-center">
                <BookOpen className="mx-auto mb-4 h-7 w-7 text-slate-400" />
                <h3 className="font-display text-lg font-bold text-ink dark:text-slate-100">No equations found</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try an equation name, a scientist, or another subject.</p>
                <Button type="button" variant="outline" onClick={() => { setQuery(""); setVisibleCount(12) }} className="mt-5 min-h-11 rounded-xl">Clear search</Button>
              </div>
            )}
          </div>
        </section>

        {inactiveSubjects.length > 0 && !activeSubject && (
          <section className="mt-12 border-t border-[var(--studio-line)] pt-8">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink dark:text-slate-100">{homePageContent.sections.comingNext}</h2>
            <div className="mt-4 flex flex-wrap gap-3">{inactiveSubjects.map((subject) => <button key={subject.slug} type="button" onClick={() => chooseSubject(subject.slug)} className="min-h-11 rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-3 text-left text-sm text-slate-600 dark:text-slate-300">{subject.name}<span className="ml-3 text-slate-500 dark:text-slate-400">{interpolateContent(homePageContent.sections.comingSoonCountTemplate, { count: subject.formulas.length })}</span></button>)}</div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  )
}
