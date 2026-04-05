import type { ReactElement } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { InlineMath } from "react-katex"
import {
  Lock, ArrowRight, ArrowLeft, CheckCircle2, LogOut, User,
  Pi, Atom, FlaskConical, Dna, TrendingUp, Cpu,
  BarChart3, Wrench, Telescope, Grid3X3,
} from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { TooltipProvider } from "./ui/tooltip"
import { TopNav } from "./TopNav"
import { HeroDemo } from "./HeroDemo"
import { subjects, type Subject } from "../data/subjects"
import { useAuth } from "../auth/AuthContext"
import { AuthModal } from "../auth/AuthModal"
import { useAllProgress, getLocalProgress } from "../progress/useProgress"

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

function getLocalCompleted(id: number): boolean {
  try { return getLocalProgress(id).completed } catch { return false }
}

export function HomePage(): ReactElement {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const { completedCount, total } = useAllProgress()

  const activeSubject = selectedSubject ? subjects.find((s) => s.slug === selectedSubject) : null

  return (
    <TooltipProvider delayDuration={300}>
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* Header */}
        <TopNav
          showBack={!!activeSubject}
          onBack={activeSubject ? () => setSelectedSubject(null) : undefined}
          left={
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {activeSubject ? activeSubject.name : "Sciencebouk"}
              </span>
              {completedCount > 0 && !activeSubject && (
                <div className="flex items-center gap-2">
                  <Progress value={(completedCount / total) * 100} className="h-1 w-16" />
                  <span className="text-[10px] text-slate-400">{completedCount}/{total}</span>
                </div>
              )}
            </div>
          }
        />

        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

        <div className="mx-auto max-w-5xl px-4 py-6">
          {!activeSubject ? (
            <>
            {/* === HERO === */}
            <section className="mb-8 overflow-hidden rounded-2xl bg-slate-900 text-white">
              <div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    Grab a variable. Drag it.<br />
                    <span className="text-ocean">Watch the equation respond.</span>
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                    17 equations that shaped the world — turned into interactive visualizations
                    you can touch and understand. No textbook. No video.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => navigate("/equation/1")}
                      className="bg-ocean text-white hover:bg-ocean/90"
                    >
                      Try Pythagoras <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => {
                        const el = document.getElementById("subjects-section")
                        el?.scrollIntoView({ behavior: "smooth" })
                      }}
                      className="text-sm text-slate-400 transition hover:text-white"
                      type="button"
                    >
                      See all equations
                    </button>
                  </div>
                </div>
                {/* Animated equation demo */}
                <div className="hidden flex-col items-center gap-2 md:flex">
                  <HeroDemo />
                  <p className="text-[10px] text-slate-500">click to explore · auto-cycles</p>
                </div>
              </div>
            </section>

            {/* === CONTINUE / FEATURED === */}
            {completedCount > 0 && completedCount < total && (
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Continue learning</h3>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {subjects
                    .filter((s) => s.active)
                    .flatMap((s) => s.formulas.filter((f) => f.id != null && !getLocalCompleted(f.id!)))
                    .slice(0, 4)
                    .map((f) => (
                      <button
                        key={f.id}
                        onClick={() => navigate(`/equation/${f.id}`)}
                        className="flex flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-ocean/30 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        type="button"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <InlineMath math={f.formula} />
                        </span>
                        <span className="mt-1 text-xs font-semibold text-slate-800 dark:text-white">{f.title}</span>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* === SUBJECT CARDS === */}
            <h3 id="subjects-section" className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Subjects</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => {
                const formulaCount = subject.formulas.length
                const completedInSubject = subject.formulas.filter((f) => f.id != null && getLocalCompleted(f.id)).length
                return (
                  <Card
                    key={subject.slug}
                    className={`group cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-[0.99] ${
                      subject.active ? "" : "opacity-60"
                    }`}
                    onClick={() => setSelectedSubject(subject.slug)}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                        subject.active ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      }`}>
                        {iconMap[subject.icon] ?? <Pi className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{subject.name}</h2>
                          {!subject.active && <Badge variant="outline" className="text-[8px] px-1 py-0">Soon</Badge>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{subject.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500">{formulaCount} formulas</span>
                          {subject.active && completedInSubject > 0 && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span className="text-[11px] font-medium text-emerald-600">{completedInSubject} done</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600" />
                    </div>
                    {/* Preview: first 3 formulas */}
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 overflow-hidden" style={{ maxHeight: 24 }}>
                        {subject.formulas.slice(0, 4).map((f, i) => (
                          <span key={i} className="text-[11px] text-slate-400 dark:text-slate-500">
                            <InlineMath math={f.formula} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
            </>
          ) : (
            /* === FORMULA GRID VIEW (inside a subject) === */
            <div>
              <p className="mb-4 text-xs text-slate-400">{activeSubject!.description}</p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {activeSubject!.formulas.map((f: { id?: number; formula: string; title: string; author?: string; year?: string }, i: number) => {
                  const isActive = activeSubject!.active && f.id != null
                  const done = f.id != null && getLocalCompleted(f.id)

                  return (
                    <Card
                      key={i}
                      className={`overflow-hidden transition-all ${
                        isActive
                          ? "cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
                          : "border-dashed opacity-40"
                      }`}
                      onClick={isActive ? () => navigate(`/equation/${f.id}`) : undefined}
                    >
                      {/* Formula — the hero */}
                      <div className="flex min-h-[72px] items-center justify-center border-b border-slate-100 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="text-center text-base text-slate-700 dark:text-slate-300">
                          {isActive ? (
                            <InlineMath math={f.formula} />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600"><InlineMath math={f.formula} /></span>
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
      </main>
    </TooltipProvider>
  )
}
