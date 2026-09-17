import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { resolveEquationManifest, useEquationManifest } from "../data/equationManifest"
import pages from "./pages.json"
import knownEquations from "./equations.json"

export function Seo(): null {
  const { pathname } = useLocation()
  const query = useEquationManifest()
  useEffect(() => {
    const path = pathname.replace(/\/$/, "") || "/"
    let page = (pages as Record<string, { title: string; description: string }>)[path]
    const match = /^\/equation\/([1-9]\d*)$/.exec(path)
    if (match) {
      const equation = (query.data?.length ? resolveEquationManifest(query.data) : knownEquations).find(item => item.id === Number(match[1]))
      if (equation) page = { title: `${equation.title} — interactive visualization`, description: equation.description }
      // Failed or unfinished data requests must not turn valid server HTML into noindex.
      else if (!query.isSuccess) return
    }
    const title = `${page?.title || "Account or unavailable page"} · Sciencebouk`
    const description = page?.description || "Sign in to manage your Sciencebouk account and learning progress."
    const canonical = `https://sciencebo.uk${path}`
    document.title = title
    const meta = (attribute: string, name: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
      if (!node) { node = document.createElement("meta"); node.setAttribute(attribute, name); document.head.append(node) }
      node.content = content
    }
    meta("name", "description", description)
    meta("name", "robots", page ? "index, follow, max-image-preview:large" : "noindex, follow")
    meta("property", "og:title", title)
    meta("property", "og:description", description)
    meta("property", "og:url", canonical)
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.append(link) }
    link.href = canonical
  }, [pathname, query.data, query.isSuccess])
  return null
}
