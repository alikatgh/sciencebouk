import { useSyncExternalStore } from "react"
import { getFavorites, toggleFavorite as persistToggle } from "./favorites"

/**
 * A tiny external store over the favorites localStorage so any list item can
 * subscribe to favourite changes and re-render the instant one is toggled —
 * without threading state through the sidebar prop chain.
 */
let snapshot: number[] = getFavorites()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useFavoriteIds(): number[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function useIsFavorite(id: number): boolean {
  return useFavoriteIds().includes(id)
}

export function toggleFavorite(id: number): void {
  persistToggle(id)
  snapshot = getFavorites()
  for (const listener of listeners) listener()
}
