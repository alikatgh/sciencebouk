import type { ReactElement } from "react"
import { Link } from "react-router-dom"
import { BILLING_ENABLED, useBillingDisabledCopy } from "../config/billing"
import { useFooterContent } from "../data/pageContent"
import { GITHUB_URL, SITE_DOMAIN, SITE_NAME } from "../config/site"

export function Footer(): ReactElement {
  const footerContent = useFooterContent()
  const billingDisabledCopy = useBillingDisabledCopy()
  const linkClass = "inline-flex min-h-10 items-center text-sm text-slate-500 transition-colors hover:text-ocean dark:text-slate-400 dark:hover:text-white"

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-sm">
            <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">{SITE_NAME}</Link>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{footerContent.tagline}</p>
            <p className="mt-2 text-sm text-slate-400">{SITE_DOMAIN}</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-3 gap-x-5 gap-y-0 sm:gap-x-8 md:grid-cols-4">
            <Link to="/#subjects-section" className={linkClass}>Library</Link>
            <Link to="/help" className={linkClass}>Help</Link>
            <Link to="/about" className={linkClass}>About</Link>
            <Link to="/pro" className={linkClass}>{BILLING_ENABLED ? "Pro" : billingDisabledCopy.badge}</Link>
            <Link to="/changelog" className={linkClass}>Changelog</Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>GitHub</a>
            <Link to="/privacy" className={linkClass}>Privacy</Link>
            <Link to="/terms" className={linkClass}>Terms</Link>
            <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className={linkClass}>Report a bug</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
