import type { ReactElement } from "react"
import { ExternalLink, Lightbulb, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Button } from "./ui/button"
import scientistsData from "../data/scientists.json"

interface Scientist {
  id: number
  name: string
  fullName: string
  born: string
  died: string
  nationality: string
  portrait: string
  bio: string
  funFact: string
  impact: string
  links: Array<{ label: string; url: string }>
  equationIds: number[]
}

const scientists = scientistsData as Scientist[]

export function getScientistByEquation(equationId: number): Scientist | null {
  return scientists.find((s) => s.equationIds.includes(equationId)) ?? null
}

interface ScientistModalProps {
  open: boolean
  onClose: () => void
  equationId: number
}

export function ScientistModal({ open, onClose, equationId }: ScientistModalProps): ReactElement {
  const scientist = getScientistByEquation(equationId)

  if (!scientist) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unknown Scientist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">No scientist information available for this equation yet.</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{scientist.fullName}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex gap-4">
          {/* Portrait */}
          <img
            src={scientist.portrait}
            alt={scientist.name}
            className="h-24 w-24 flex-shrink-0 rounded-xl object-cover shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{scientist.nationality}</Badge>
              <span className="text-xs text-slate-400">{scientist.born} — {scientist.died}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {scientist.bio}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          {/* Fun fact */}
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{scientist.funFact}</p>
          </div>

          {/* Impact */}
          <div className="flex items-start gap-3 rounded-lg bg-ocean/5 px-4 py-3 dark:bg-ocean/10">
            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-ocean" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ocean">Why it matters</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{scientist.impact}</p>
            </div>
          </div>
        </div>

        {/* Links */}
        {scientist.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {scientist.links.map((link) => (
              <Button key={link.url} variant="outline" size="sm" asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
