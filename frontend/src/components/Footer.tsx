import type { ReactElement } from "react"
import { Link } from "react-router-dom"

const GITHUB_URL = "https://github.com/alikatgh/sciencebouk"

export function Footer(): ReactElement {
  return (
    <footer className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Formulas</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span>sciencebo.uk</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-600 dark:hover:text-slate-300">GitHub</a>
          <Link to="/pro" className="transition hover:text-slate-600 dark:hover:text-slate-300">Pro</Link>
          <Link to="/about" className="transition hover:text-slate-600 dark:hover:text-slate-300">About</Link>
          <Link to="/privacy" className="transition hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
          <Link to="/terms" className="transition hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-600 dark:hover:text-slate-300">Report a bug</a>
        </nav>

        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          Open source interactive math learning.
        </p>
      </div>
    </footer>
  )
}
