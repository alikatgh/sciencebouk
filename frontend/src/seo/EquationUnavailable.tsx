import equations from "./equations.json"

export function EquationUnavailable({ id, retry }: { id: number; retry: () => void }) {
  const equation = equations.find(item => item.id === id)
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950">
      <a href="/" className="text-ocean">Sciencebouk</a>
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">{equation?.title || "Lesson temporarily unavailable"}</h1>
      {equation && <p className="max-w-xl text-slate-600 dark:text-slate-300">{equation.description}</p>}
      {equation && <p className="max-w-xl break-words font-mono text-slate-600 dark:text-slate-300">{equation.formula}</p>}
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">The interactive lesson could not load. Please try again.</p>
      <button type="button" onClick={retry} className="rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-white">Retry lesson</button>
    </main>
  )
}
