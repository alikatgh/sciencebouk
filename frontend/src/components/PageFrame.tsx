import type { ReactNode } from "react"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"

interface PageFrameProps {
  children: ReactNode
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
}

/** Shared reading and account surface; the equation workspace has its own shell. */
export function PageFrame({ children, title, description, actions, className = "" }: PageFrameProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f3f6fb] text-ink dark:bg-slate-950 dark:text-slate-100">
      <TopNav showBack />
      <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] sm:px-6 sm:py-12 lg:px-8 ${className}`}>
        {title && (
          <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink dark:text-white sm:text-4xl">{title}</h1>
              {description && <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">{description}</p>}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        )}
        {children}
      </main>
      <Footer />
    </div>
  )
}
