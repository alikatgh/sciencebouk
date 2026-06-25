/**
 * A tiny, dependency-free analytics dispatcher. `track()` fans an event out to
 * any subscribed sink and is guaranteed never to throw — analytics must never
 * break the app. The app can wire a real sink (e.g. the backend `log_event`
 * endpoint) via `onTrack`; until then events are dev-logged only.
 *
 * Deliberately decoupled: feature code calls `track("concept_check_answered",
 * { equationId, correct })` without knowing or caring where events go.
 */

export type AnalyticsProps = Record<string, string | number | boolean>

type Sink = (event: string, props: AnalyticsProps) => void

const sinks = new Set<Sink>()

/** Subscribe a sink; returns an unsubscribe function. */
export function onTrack(sink: Sink): () => void {
  sinks.add(sink)
  return () => {
    sinks.delete(sink)
  }
}

/** Record a usage event. Never throws, even if a sink misbehaves. */
export function track(event: string, props: AnalyticsProps = {}): void {
  for (const sink of sinks) {
    try {
      sink(event, props)
    } catch {
      // a broken sink must not break the feature that emitted the event
    }
  }
  try {
    if (import.meta.env?.DEV) console.debug("[analytics]", event, props)
  } catch {
    // import.meta.env may be undefined in some test contexts — ignore
  }
}

/** Test helper: drop all subscribed sinks. */
export function resetAnalyticsForTests(): void {
  sinks.clear()
}
