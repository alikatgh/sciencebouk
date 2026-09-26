import type { ReactElement } from "react"
import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, CheckCircle2, Search, X, BookOpen, ArrowLeft, Clock3 } from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { ErrorBoundary } from "./ErrorBoundary"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"
import { DeferredInlineMath } from "./math/DeferredInlineMath"
import { activeSubjects, getSubject, inactiveSubjects } from "../data/subjects"
import type { SubjectFormula } from "../data/subjects"
import { interpolateContent, useHomePageContent } from "../data/pageContent"
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
  return <DeferredInlineMath math={formula} />
}

function StarterDrawing({ kind }: { kind: string }): ReactElement {
  return (
    <svg viewBox="0 0 240 105" className="h-[105px] w-full" aria-hidden="true">
      {kind === "triangle" ? (
        <g fill="none" strokeWidth="2.5">
          <path d="M65 20 V83 H165 Z" fill="#315cdd" fillOpacity=".05" stroke="#315cdd" />
          <path d="M65 70 H78 V83" stroke="#9aa9c8" strokeWidth="1.5" />
          <path d="M65 20 L165 83" stroke="#b85e30" />
          <path d="M65 83 H165" stroke="#167c66" />
          <text x="51" y="58" fontSize="14" stroke="none" fill="#315cdd">a</text>
          <text x="111" y="100" fontSize="14" stroke="none" fill="#167c66">b</text>
          <text x="129" y="44" fontSize="14" stroke="none" fill="#b85e30">c</text>
        </g>
      ) : kind === "motion" ? (
        <g>
          <path d="M28 82 H212" stroke="#ced8e9" strokeWidth="2" />
          <rect x="101" y="34" width="50" height="46" rx="5" fill="#edf2ff" stroke="#315cdd" strokeWidth="2" />
          <path d="M31 55 H87 M76 46 L87 55 L76 64" fill="none" stroke="#167c66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M163 47 H196 M163 59 H184" stroke="#9db4f2" strokeWidth="2" strokeLinecap="round" />
          <text x="54" y="36" fontSize="14" fill="#167c66">F</text>
          <text x="120" y="63" fontSize="14" fill="#315cdd">m</text>
        </g>
      ) : (
        <g fill="none">
          <path d="M34 16 V84 H215" stroke="#ced8e9" strokeWidth="1.5" />
          <path d="M35 79 C85 79 145 66 204 16" stroke="#167c66" strokeWidth="3" />
          <path d="M35 79 C85 79 145 66 204 16 V84 H35 Z" fill="#167c66" fillOpacity=".06" />
          {[{x:70,y:77},{x:118,y:68},{x:159,y:50},{x:204,y:16}].map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="4" stroke="#167c66" fill="white" strokeWidth="2" />)}
        </g>
      )}
    </svg>
  )
}

function searchable(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function HomePage(): ReactElement {
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
    const content = (
      <>
        <div className="flex min-h-[96px] min-w-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f7fc] px-3 py-5 text-[1.05rem] text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
          <div className="max-w-full overflow-x-auto py-1"><FormulaPreview formula={equation.formula} /></div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[15px] font-bold leading-snug text-slate-800 dark:text-slate-100">{equation.title}</h3>
            {(equation.author || equation.year) && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{[equation.author, equation.year].filter(Boolean).join(", ")}</p>}
          </div>
          {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Completed" /> : available ? <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-ocean" /> : null}
        </div>
        {!available && <p className="mt-2 text-sm text-slate-500">Coming soon</p>}
      </>
    )
    return available ? (
      <button key={equation.id ?? index} type="button" onClick={() => openEquation(equation.id!)} onMouseEnter={() => void prefetchEquationExperience(equation.id!)} onFocus={() => void prefetchEquationExperience(equation.id!)} aria-label={`Open ${equation.title}`} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-ocean/50 hover:bg-[#fcfdff] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-ocean">
        {content}
      </button>
    ) : <article key={index} className="min-w-0 rounded-2xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">{content}</article>
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f3f6fb] dark:bg-slate-950">
      <TopNav />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-7 sm:px-6 sm:pt-10 lg:px-8">
        {!activeSubject && (
          <>
            <section className="grid items-center gap-8 pb-12 sm:gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:pb-16" aria-labelledby="home-title">
              <div className="min-w-0 lg:py-8">
                <h1 id="home-title" className="max-w-[640px] font-display text-[2.25rem] font-bold leading-[1.12] tracking-[-0.045em] text-slate-900 dark:text-white sm:text-5xl lg:text-[3.6rem]">
                  {homePageContent.hero.titleLine1}{" "}{homePageContent.hero.titleLine2}
                </h1>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                  {interpolateContent(homePageContent.hero.descriptionTemplate, { total: equations.length })}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button onClick={() => openEquation(1)} onMouseEnter={() => void prefetchEquationExperience(1)} onFocus={() => void prefetchEquationExperience(1)} className="min-h-12 rounded-xl bg-ocean px-6 text-base text-white hover:bg-ocean/90">
                    {homePageContent.hero.primaryCta}<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" onClick={browseLibrary} className="min-h-12 rounded-xl px-4 text-base text-slate-600 dark:text-slate-300">{homePageContent.hero.secondaryCta}</Button>
                </div>
              </div>
              <ErrorBoundary fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Open Pythagoras to try the interactive experiment.</div>}>
                <Suspense fallback={<div className="h-[420px] rounded-[24px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-label="Loading interactive example" />}>
                  <HeroDemo />
                </Suspense>
              </ErrorBoundary>
            </section>

            {(recentEquations.length > 0 || completedCount > 0) && (
              <section aria-labelledby="continue-heading" className="mb-12 rounded-2xl border border-[#cbded9] bg-[#edf5f2] p-5 dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <h2 id="continue-heading" className="font-display text-xl font-bold text-slate-900 dark:text-white">{homePageContent.sections.continueLearning}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{completedCount >= total && total > 0 ? "Every lesson completed. Revisit an equation and try a new experiment." : recentEquations.length > 0 ? "Pick up an experiment where you left it." : "Ready for your next experiment?"}</p>
                  </div>
                  <div className="w-full max-w-[220px]">
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{completedCount} of {total} completed</p>
                    <Progress value={total ? completedCount / total * 100 : 0} className="h-1.5 bg-emerald-900/10" aria-label={`${completedCount} of ${total} equations completed`} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {(recentEquations.length > 0 ? recentEquations : nextEquation ? [nextEquation] : []).map((equation) => (
                    <button key={equation.id} type="button" onClick={() => openEquation(equation.id!)} className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-4 py-4 text-left text-slate-800 transition hover:border-emerald-700/40 dark:bg-slate-900 dark:text-slate-100">
                      <Clock3 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                      <span className="min-w-0 flex-1 text-sm font-semibold">{equation.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-14" aria-labelledby="starters-heading">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="starters-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Start with a question</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Three ways to get hands-on.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {starterIdeas.map((idea) => {
                  const equation = equations.find((item) => item.id === idea.id)
                  if (!equation) return null
                  return (
                    <button type="button" key={idea.id} onClick={() => openEquation(idea.id)} onMouseEnter={() => void prefetchEquationExperience(idea.id)} onFocus={() => void prefetchEquationExperience(idea.id)} className="group grid min-w-0 grid-cols-[100px_1fr] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-ocean/50 dark:border-slate-700 dark:bg-slate-900 md:block md:p-5">
                      <StarterDrawing kind={idea.kind} />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 md:mt-3">{idea.topic}</p>
                        <h3 className="mt-1 font-display text-base font-bold leading-snug text-slate-800 dark:text-white sm:text-lg">{idea.prompt}</h3>
                        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ocean">{equation.title}<ArrowRight className="h-4 w-4 shrink-0" /></p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <section id="subjects-section" className="scroll-mt-28" aria-labelledby="library-heading">
          {activeSubject && <button type="button" onClick={() => chooseSubject(null)} className="mb-5 flex min-h-10 items-center gap-2 text-sm font-semibold text-ocean"><ArrowLeft className="h-4 w-4" />All subjects</button>}
          <div className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 id="library-heading" className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{activeSubject ? activeSubject.name : "The equation library"}</h2>
              <p className="mt-2 max-w-xl text-base text-slate-600 dark:text-slate-400">{activeSubject ? activeSubject.description : "Follow your curiosity. Choose a subject or find an equation."}</p>
            </div>
            <div className="relative w-full lg:max-w-[340px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12) }} placeholder="Search equations, people, topics" aria-label="Search equations" className="[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-11 text-base text-slate-800 outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              {query && <button type="button" onClick={() => { setQuery(""); setVisibleCount(12) }} aria-label="Clear search" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="h-4 w-4" /></button>}
            </div>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr] lg:gap-8">
            <nav aria-label="Subjects" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-28 lg:flex-col lg:overflow-visible lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-2 lg:dark:border-slate-700 lg:dark:bg-slate-900">
              <button type="button" aria-pressed={!activeSubject} onClick={() => chooseSubject(null)} className={`flex min-h-11 shrink-0 items-center justify-between gap-4 rounded-xl px-3 py-3 text-left text-sm font-semibold ${!activeSubject ? "bg-ocean text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                <span>All equations</span><span className="text-xs tabular-nums opacity-80">{equations.length}</span>
              </button>
              {activeSubjects.map((subject) => (
                <button key={subject.slug} type="button" onClick={() => chooseSubject(subject.slug)} aria-label={`Open ${subject.name}`} aria-pressed={selectedSubject === subject.slug} className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm leading-snug ${selectedSubject === subject.slug ? "bg-ocean text-white font-semibold" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                  <span className="max-w-[185px]">{subject.name}</span><span className="text-xs tabular-nums opacity-80">{subject.formulas.length}</span>
                </button>
              ))}
            </nav>
            <div className="min-w-0">
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400" role="status">{visibleEquations.length} {visibleEquations.length === 1 ? "equation" : "equations"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
              {visibleEquations.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleEquations.slice(0, visibleCount).map(equationCard)}</div>
                  {visibleCount < visibleEquations.length && <div className="mt-6 flex flex-col items-center gap-3"><Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + 12)} className="min-h-12 rounded-xl bg-white px-6 dark:bg-slate-900">Show more equations</Button><p className="text-sm text-slate-500">Showing {visibleCount} of {visibleEquations.length}</p></div>}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                  <BookOpen className="mx-auto mb-4 h-7 w-7 text-slate-400" />
                  <h3 className="font-display text-lg font-bold text-slate-800 dark:text-white">No equations found</h3>
                  <p className="mt-2 text-sm text-slate-500">Try an equation name, a scientist, or another subject.</p>
                  <Button type="button" variant="outline" onClick={() => { setQuery(""); setVisibleCount(12) }} className="mt-5 rounded-xl">Clear search</Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {inactiveSubjects.length > 0 && !activeSubject && (
          <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">{homePageContent.sections.comingNext}</h2>
            <div className="mt-4 flex flex-wrap gap-3">{inactiveSubjects.map((subject) => <button key={subject.slug} type="button" onClick={() => chooseSubject(subject.slug)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{subject.name}<span className="ml-3 text-slate-400">{interpolateContent(homePageContent.sections.comingSoonCountTemplate, { count: subject.formulas.length })}</span></button>)}</div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  )
}
