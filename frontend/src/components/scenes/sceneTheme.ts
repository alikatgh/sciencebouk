export const SCENE_STAGE_CLASS =
  "scene-stage h-full w-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"

export type ScenePalette = {
  ink: string
  muted: string
  faint: string
  hair: string
  grid: string
}

const FALLBACK: ScenePalette = {
  ink: "#1e293b",
  muted: "#64748b",
  faint: "#94a3b8",
  hair: "#e8edf2",
  grid: "#eef2f6",
}

export function readScenePalette(el: Element): ScenePalette {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    ink: v("--scene-ink", FALLBACK.ink),
    muted: v("--scene-muted", FALLBACK.muted),
    faint: v("--scene-faint", FALLBACK.faint),
    hair: v("--scene-hair", FALLBACK.hair),
    grid: v("--scene-grid", FALLBACK.grid),
  }
}
