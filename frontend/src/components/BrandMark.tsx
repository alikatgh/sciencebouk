import type { ReactElement } from "react"

/** The right triangle is both the first experiment and the atlas's visual signature. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="11" fill="currentColor" />
      <path d="M10 26V10L27 26H10Z" fill="white" fillOpacity=".08" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 21h5v5" stroke="white" strokeOpacity=".65" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="1.6" fill="white" />
      <circle cx="27" cy="26" r="1.6" fill="white" />
    </svg>
  )
}
