import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { PageFrame } from "./PageFrame"
import { SITE_DOMAIN, SUPPORT_EMAIL } from "../config/site"
import { interpolateContent, useLegalPageContent } from "../data/pageContent"

type LegalDocumentPageProps = {
  title: string
  documentPath: string
}

type LoadState = "loading" | "ready" | "missing"

const ARTICLE_CLASSNAME = "mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-7 dark:border-slate-800 dark:bg-slate-900 sm:px-10 sm:py-10 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-ink dark:[&_h1]:text-white [&_h1]:mb-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_h3]:mt-7 [&_h3]:mb-3 [&_p]:text-base [&_p]:leading-7 [&_p]:text-slate-600 dark:[&_p]:text-slate-300 [&_p]:mb-4 [&_ul]:mb-5 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_li]:text-base [&_li]:leading-7 [&_li]:text-slate-600 dark:[&_li]:text-slate-300 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-200 [&_a]:break-words [&_a]:font-medium [&_a]:text-ocean [&_a]:underline [&_a]:underline-offset-4"

export function LegalDocumentPage({ title, documentPath }: LegalDocumentPageProps): ReactElement {
  const legalPageContent = useLegalPageContent()
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
    <PageFrame>
        <article className={ARTICLE_CLASSNAME} aria-busy={state === "loading"}>
          {state === "ready" ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : null}

          {state === "loading" ? (
            <>
              <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-slate-800">{legalPageContent.loadingBadge}</p>
              <h1>{title}</h1>
              <p>{legalPageContent.loadingBody}</p>
            </>
          ) : null}

          {state === "missing" ? (
            <>
              <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-slate-800">{legalPageContent.missingBadge}</p>
              <h1>{title}</h1>
              <p>
                {interpolateContent(legalPageContent.missingBodyTemplate, { siteDomain: SITE_DOMAIN })}
              </p>
              <p>
                {interpolateContent(legalPageContent.missingContactTemplate, { supportEmail: SUPPORT_EMAIL })}
              </p>
            </>
          ) : null}
        </article>
    </PageFrame>
  )
}
