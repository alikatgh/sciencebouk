import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Footer } from "./Footer"
import { TopNav } from "./TopNav"
import { SITE_DOMAIN, SUPPORT_EMAIL } from "../config/site"

type LegalDocumentPageProps = {
  title: string
  documentPath: string
}

type LoadState = "loading" | "ready" | "missing"

const ARTICLE_CLASSNAME = "mx-auto max-w-3xl px-4 py-12 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h1]:mt-2 [&_h1]:mb-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-slate-600 dark:[&_p]:text-slate-400 [&_p]:mb-3 [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_li]:text-sm [&_li]:text-slate-600 dark:[&_li]:text-slate-400 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-200 [&_a]:font-medium [&_a]:text-ocean [&_a]:underline-offset-2 hover:[&_a]:underline"

export function LegalDocumentPage({ title, documentPath }: LegalDocumentPageProps): ReactElement {
  const [state, setState] = useState<LoadState>("loading")
  const [html, setHtml] = useState("")

  useEffect(() => {
    let active = true

    setState("loading")
    setHtml("")

    void fetch(documentPath, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Missing document: ${response.status}`)

        const text = await response.text()
        if (!active) return

        setHtml(text)
        setState("ready")
      })
      .catch(() => {
        if (!active) return
        setState("missing")
      })

    return () => {
      active = false
    }
  }, [documentPath])

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <TopNav showBack />

      <div className="flex-1 overflow-y-auto">
        <article className={ARTICLE_CLASSNAME}>
          {state === "ready" ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : null}

          {state === "loading" ? (
            <>
              <p className="text-xs text-slate-400">Loading document...</p>
              <h1>{title}</h1>
              <p>Preparing the latest live copy of this document.</p>
            </>
          ) : null}

          {state === "missing" ? (
            <>
              <p className="text-xs text-slate-400">Live document unavailable in this build</p>
              <h1>{title}</h1>
              <p>
                The current legal document for <strong>{SITE_DOMAIN}</strong> is maintained privately for the live
                deployment and was not bundled into this build.
              </p>
              <p>
                If you need a copy or have questions, contact <strong>{SUPPORT_EMAIL}</strong>.
              </p>
            </>
          ) : null}
        </article>
      </div>

      <Footer />
    </main>
  )
}
