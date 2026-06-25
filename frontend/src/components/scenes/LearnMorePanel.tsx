import type { ReactElement } from "react"
import { useState } from "react"
import { getEquationFact } from "../../data/equationFacts"
import { getConceptCheck } from "../../data/conceptChecks"
import { getPrerequisites } from "../../data/prerequisites"
import { getWorkedExample } from "../../data/workedExamples"
import { track } from "../../lib/analytics"
import { ConceptCheck } from "./ConceptCheck"

/**
 * One tabbed "Learn more" panel that consolidates the optional learning aids for
 * a subject scene — a surprising fact, a one-question concept check, and the
 * prerequisite "builds-on" links — instead of stacking three separate cards
 * below the visualization. Only tabs that have curated content appear; the panel
 * renders nothing when none do. The parent keys the scene subtree by equation
 * id, so the active tab resets on navigation.
 */
type TabKey = "fact" | "example" | "check" | "builds"

export function LearnMorePanel({ equationId }: { equationId: number }): ReactElement | null {
  const fact = getEquationFact(equationId)
  const example = getWorkedExample(equationId)
  const hasCheck = getConceptCheck(equationId) !== null
  const prereqs = getPrerequisites(equationId)

  const tabs: Array<{ key: TabKey; label: string }> = []
  if (fact) tabs.push({ key: "fact", label: "Did you know?" })
  if (example) tabs.push({ key: "example", label: "Worked example" })
  if (hasCheck) tabs.push({ key: "check", label: "Quick check" })
  if (prereqs) tabs.push({ key: "builds", label: "Builds on" })

  const [active, setActive] = useState<TabKey | null>(null)
  if (tabs.length === 0) return null
  const current = active && tabs.some((t) => t.key === active) ? active : tabs[0].key

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white/50 p-1 dark:border-slate-700 dark:bg-slate-800/40">
      <div role="tablist" aria-label="Learn more" className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={current === tab.key}
            onClick={() => {
              setActive(tab.key)
              track("learn_more_tab", { equationId, tab: tab.key })
            }}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[0.7rem] font-semibold transition ${
              current === tab.key
                ? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="px-3 pb-2.5 pt-2 text-left">
        {current === "fact" && fact && (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{fact}</p>
        )}
        {current === "example" && example && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{example.given}</p>
            <div className="mt-1.5 flex flex-col gap-0.5 font-mono text-xs text-slate-700 dark:text-slate-200">
              {example.steps.map((step, i) => (
                <span key={i}>{step}</span>
              ))}
            </div>
          </div>
        )}
        {current === "check" && <ConceptCheck equationId={equationId} />}
        {current === "builds" && prereqs && (
          <div className="flex flex-wrap items-center gap-1.5">
            {prereqs.map((pre) => (
              <a
                key={pre.id}
                href={`/equation/${pre.id}`}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-ocean transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                {pre.title} →
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
