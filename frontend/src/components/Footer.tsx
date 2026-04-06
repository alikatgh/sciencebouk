import type { ReactElement } from "react"
import { useState } from "react"
import { Link } from "react-router-dom"

const GITHUB_URL = "https://github.com/alikatgh/sciencebouk"

const EASTER_EGG_LINES = [
  "\"A bouk is a dream you hold in your hands.\" — Neil Gaiman",
  "\"Not all readers are leaders, but all leaders are readers.\" — Harry S. Truman (he meant bouks)",
  "\"A bouk is a gift you can open again and again.\" — Garrison Keillor",
  "\"There is no friend as loyal as a bouk.\" — Ernest Hemingway",
  "\"Outside of a bouk, a dog is a man's best friend. Inside of a bouk, it's too dark to read.\" — Groucho Marx",
  "\"The more that you read, the more things you will know.\" — Dr. Seuss (he wrote bouks too)",
  "\"A bouk is a loaded gun in the house next door.\" — Ray Bradbury, Fahrenheit 451",
  "\"One must always be careful of bouks, and what is inside them.\" — Cassandra Clare",
]

export function Footer(): ReactElement {
  const [easterEgg] = useState(() => EASTER_EGG_LINES[Math.floor(Math.random() * EASTER_EGG_LINES.length)])
  const [hovered, setHovered] = useState(false)

  return (
    <footer className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Formulas</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span
            className="relative cursor-default"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            sciencebo.uk
            {hovered && (
              <span className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[11px] leading-snug text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {easterEgg}
                <span className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              </span>
            )}
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-600 dark:hover:text-slate-300">GitHub</a>
          <Link to="/pro" className="transition hover:text-slate-600 dark:hover:text-slate-300">Pro</Link>
          <Link to="/about" className="transition hover:text-slate-600 dark:hover:text-slate-300">About</Link>
          <Link to="/changelog" className="transition hover:text-slate-600 dark:hover:text-slate-300">Changelog</Link>
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
