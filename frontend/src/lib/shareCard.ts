/**
 * Build a self-contained, shareable SVG "card" for an equation and its current
 * computed result — title, result, and attribution on a branded panel. Pure and
 * deterministic (returns an SVG string), so it is easy to unit-test and to hand
 * to `downloadSvg` for an instant image export. The LaTeX formula is rendered by
 * KaTeX elsewhere; the card intentionally shows plain text so it needs no fonts.
 */

export interface ShareCardOptions {
  title: string
  resultLabel?: string // e.g. "V = 21 V"
  author?: string
  year?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;") // defence-in-depth for any future single-quoted attribute
}

export function buildShareCardSvg(opts: ShareCardOptions): string {
  const w = 600
  const h = 315
  const title = escapeXml(opts.title)
  const result = opts.resultLabel ? escapeXml(opts.resultLabel) : ""
  const attribution = escapeXml([opts.author, opts.year].filter(Boolean).join(", "))

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs>`,
    `<rect width="${w}" height="${h}" rx="20" fill="url(#bg)"/>`,
    `<text x="40" y="64" fill="#94a3b8" font-family="sans-serif" font-size="13" letter-spacing="3">SCIENCEBOUK</text>`,
    `<text x="40" y="132" fill="#f8fafc" font-family="sans-serif" font-size="34" font-weight="700">${title}</text>`,
    result ? `<text x="40" y="200" fill="#ef4444" font-family="monospace" font-size="40" font-weight="700">${result}</text>` : "",
    attribution ? `<text x="40" y="270" fill="#64748b" font-family="sans-serif" font-size="16">${attribution}</text>` : "",
    `</svg>`,
  ]
    .filter(Boolean)
    .join("")
}

/** Trigger a browser download of the SVG card (no-op outside the browser). */
export function downloadSvg(svg: string, filename: string): void {
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return
  const blob = new Blob([svg], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
