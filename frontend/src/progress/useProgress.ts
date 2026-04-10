import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import type { BulkSyncItem, ProgressItem } from "../api/client"

// Equation IDs registered at runtime from the API manifest.
// Defaults to IDs 1–17 so progress works before the first API response.
let _equationIds: number[] = Array.from({ length: 17 }, (_, i) => i + 1)

/** Called by App once the equation manifest loads from the API. */
export function registerEquationIds(ids: number[]): void {
  if (ids.length === 0) return
  _equationIds = ids
  progressSnapshotCache.clear()
  notifyProgressListeners()
}

export interface EquationProgress {
  completed: boolean
  lessonStep: string
  timeSpentSeconds: number
  variablesExplored: string[]
  notes: string
  bookmarked: boolean
  lastViewed: string
}

const EMPTY: EquationProgress = {
  completed: false,
  lessonStep: "",
  timeSpentSeconds: 0,
  variablesExplored: [],
  notes: "",
  bookmarked: false,
  lastViewed: "",
}

const STORAGE_KEY_PREFIX = "eq-progress-"
const syncTimers = new Map<number, ReturnType<typeof setTimeout>>()
const progressListeners = new Set<() => void>()
const localProgressCache = new Map<number, EquationProgress>()
const progressSnapshotCache = new Map<string, { version: number; snapshot: ProgressSnapshot }>()

let storageListenerAttached = false
let serverProgressCache = new Map<number, ProgressItem>()
let serverProgressPromise: Promise<Map<number, ProgressItem>> | null = null
let hasFetchedServerProgress = false
let serverProgressBackoffUntil = 0
let activeServerUserId: number | null = null
let serverSyncErrorState = false
let progressVersion = 0

function progressKey(equationId: number): string {
  return `${STORAGE_KEY_PREFIX}${equationId}`
}

function cloneProgress(progress: EquationProgress): EquationProgress {
  return {
    ...progress,
    variablesExplored: [...progress.variablesExplored],
  }
}

function normalizeProgress(progress?: Partial<EquationProgress>): EquationProgress {
  return {
    ...EMPTY,
    ...progress,
    variablesExplored: [...new Set(progress?.variablesExplored ?? EMPTY.variablesExplored)],
  }
}

function notifyProgressListeners() {
  progressVersion += 1
  for (const listener of progressListeners) listener()
}

function setServerSyncErrorState(next: boolean) {
  if (serverSyncErrorState === next) return
  serverSyncErrorState = next
  progressSnapshotCache.delete("server")
  notifyProgressListeners()
}

function parseEquationIdFromKey(key: string): number | null {
  if (!key.startsWith(STORAGE_KEY_PREFIX)) return null
  const equationId = Number(key.slice(STORAGE_KEY_PREFIX.length))
  return Number.isInteger(equationId) ? equationId : null
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key === null) {
    localProgressCache.clear()
    notifyProgressListeners()
    return
  }

  const equationId = parseEquationIdFromKey(event.key)
  if (equationId === null) return

  if (event.newValue === null) {
    localProgressCache.delete(equationId)
  } else {
    try {
      localProgressCache.set(equationId, normalizeProgress(JSON.parse(event.newValue) as Partial<EquationProgress>))
    } catch {
      localProgressCache.delete(equationId)
    }
  }

  notifyProgressListeners()
}

function subscribeToProgress(listener: () => void): () => void {
  progressListeners.add(listener)

  if (typeof window !== "undefined" && !storageListenerAttached) {
    window.addEventListener("storage", handleStorageEvent)
    storageListenerAttached = true
  }

  return () => {
    progressListeners.delete(listener)

    if (typeof window !== "undefined" && storageListenerAttached && progressListeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent)
      storageListenerAttached = false
    }
  }
}

function readLocalProgressFromStorage(equationId: number): EquationProgress {
  if (equationId <= 0 || typeof localStorage === "undefined") return { ...EMPTY }

  try {
    const raw = localStorage.getItem(progressKey(equationId))
    return raw ? normalizeProgress(JSON.parse(raw) as Partial<EquationProgress>) : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function readMergedProgress(equationId: number, includeServer: boolean): EquationProgress {
  if (equationId <= 0) return { ...EMPTY }

  const cachedLocal = localProgressCache.get(equationId)
  const localProgress = cachedLocal ?? readLocalProgressFromStorage(equationId)
  localProgressCache.set(equationId, localProgress)

  if (!includeServer) {
    return cloneProgress(localProgress)
  }

  const serverItem = serverProgressCache.get(equationId)
  if (!serverItem) {
    return cloneProgress(localProgress)
  }

  return mergeProgress(localProgress, serverItem)
}

export function getLocalProgress(equationId: number): EquationProgress {
  return readMergedProgress(equationId, true)
}

function setLocalProgress(equationId: number, progress: EquationProgress) {
  if (equationId <= 0) return

  const normalized = normalizeProgress(progress)
  localProgressCache.set(equationId, normalized)

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(progressKey(equationId), JSON.stringify(normalized))
    } catch {
      // Keep progress in memory even if persistent storage is unavailable.
    }
  }

  notifyProgressListeners()
}

export function clearStoredProgress() {
  for (const timer of syncTimers.values()) clearTimeout(timer)
  syncTimers.clear()

  if (typeof localStorage !== "undefined") {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(STORAGE_KEY_PREFIX)) keysToRemove.push(key)
      }
      for (const key of keysToRemove) localStorage.removeItem(key)
    } catch {
      // Ignore storage cleanup failures; caches are still cleared below.
    }
  }

  localProgressCache.clear()
  serverProgressCache = new Map()
  serverProgressPromise = null
  hasFetchedServerProgress = false
  activeServerUserId = null
  serverSyncErrorState = false
  progressSnapshotCache.clear()
  notifyProgressListeners()
}

function resetServerProgressState() {
  for (const timer of syncTimers.values()) clearTimeout(timer)
  syncTimers.clear()
  serverProgressCache = new Map()
  serverProgressPromise = null
  hasFetchedServerProgress = false
  serverProgressBackoffUntil = 0
  serverSyncErrorState = false
  progressSnapshotCache.delete("server")
}

function ensureServerProgressUser(userId: number | null) {
  if (activeServerUserId === userId) return
  activeServerUserId = userId
  resetServerProgressState()
  notifyProgressListeners()
}

function mergeProgress(local: EquationProgress, server: ProgressItem): EquationProgress {
  return {
    completed: local.completed || server.completed,
    lessonStep: server.lesson_step || local.lessonStep,
    timeSpentSeconds: Math.max(local.timeSpentSeconds, server.time_spent_seconds),
    variablesExplored: [...new Set([...local.variablesExplored, ...server.variables_explored])],
    notes: server.notes || local.notes,
    bookmarked: local.bookmarked || server.bookmarked,
    lastViewed: new Date(
      Math.max(new Date(local.lastViewed || 0).getTime(), new Date(server.last_viewed || 0).getTime()),
    ).toISOString(),
  }
}

function toProgressPayload(progress: EquationProgress): Partial<ProgressItem> {
  return {
    completed: progress.completed,
    lesson_step: progress.lessonStep,
    time_spent_seconds: progress.timeSpentSeconds,
    variables_explored: progress.variablesExplored,
    notes: progress.notes,
    bookmarked: progress.bookmarked,
    last_viewed: progress.lastViewed,
  }
}

function updateServerCache(eqId: number, progress: EquationProgress) {
  const previous = serverProgressCache.get(eqId)
  serverProgressCache.set(eqId, {
    equation_id: eqId,
    completed: progress.completed,
    completed_at: previous?.completed_at ?? null,
    lesson_step: progress.lessonStep,
    time_spent_seconds: progress.timeSpentSeconds,
    variables_explored: progress.variablesExplored,
    notes: progress.notes,
    bookmarked: progress.bookmarked,
    last_viewed: progress.lastViewed,
  })
}

async function getServerProgressMap(): Promise<Map<number, ProgressItem>> {
  if (hasFetchedServerProgress) return serverProgressCache

  // Exponential backoff: don't hammer the server on repeated failures.
  if (Date.now() < serverProgressBackoffUntil) return serverProgressCache

  if (!serverProgressPromise) {
    serverProgressPromise = api.progress.getAll()
      .then((items) => {
        serverProgressCache = new Map(items.map((item) => [item.equation_id, item]))
        hasFetchedServerProgress = true
        serverProgressBackoffUntil = 0
        return serverProgressCache
      })
      .catch((err) => {
        // Back off for 30 seconds on failure so we don't fire a request on every render.
        serverProgressBackoffUntil = Date.now() + 30_000
        throw err
      })
      .finally(() => {
        serverProgressPromise = null
      })
  }

  return serverProgressPromise
}

// rollbackEntry must be captured BEFORE calling updateServerCache so it
// represents the pre-optimistic server state, not the already-updated one.
function debouncedSync(eqId: number, progress: EquationProgress, rollbackEntry: ProgressItem | undefined) {
  const existingTimer = syncTimers.get(eqId)
  if (existingTimer) clearTimeout(existingTimer)

  const timer = setTimeout(() => {
    api.progress.update(eqId, toProgressPayload(progress))
      .then((serverItem) => {
        serverProgressCache.set(eqId, serverItem)
        notifyProgressListeners()
      })
      .catch(() => {
        // Roll back the optimistic cache write so the stale entry does not
        // override real server progress on the next mergeProgress call.
        if (rollbackEntry !== undefined) {
          serverProgressCache.set(eqId, rollbackEntry)
        } else {
          serverProgressCache.delete(eqId)
        }
      })
      .finally(() => {
        if (syncTimers.get(eqId) === timer) syncTimers.delete(eqId)
      })
  }, 2000)

  syncTimers.set(eqId, timer)
}

export interface ProgressSnapshot {
  completedCount: number
  totalTimeMinutes: number
  total: number
  progressByEquation: Map<number, EquationProgress>
  localSyncItems: BulkSyncItem[]
  localSyncSignature: string
  serverSyncError: boolean
}

function shouldSyncProgress(progress: EquationProgress): boolean {
  return (
    progress.completed ||
    progress.timeSpentSeconds > 0 ||
    progress.lessonStep !== "" ||
    progress.variablesExplored.length > 0 ||
    progress.notes !== "" ||
    progress.bookmarked
  )
}

function getProgressSnapshot(includeServer: boolean): ProgressSnapshot {
  const cacheKey = includeServer ? "server" : "local"
  const cached = progressSnapshotCache.get(cacheKey)
  if (cached && cached.version === progressVersion) {
    return cached.snapshot
  }

  let completedCount = 0
  let totalTimeSeconds = 0
  const progressByEquation = new Map<number, EquationProgress>()
  const localSyncItems: BulkSyncItem[] = []

  for (const equationId of _equationIds) {
    const localProgress = readMergedProgress(equationId, false)
    const progress = includeServer
      ? readMergedProgress(equationId, true)
      : localProgress

    progressByEquation.set(equationId, progress)
    if (progress.completed) completedCount += 1
    totalTimeSeconds += progress.timeSpentSeconds

    if (shouldSyncProgress(localProgress)) {
      localSyncItems.push({
        equation_id: equationId,
        completed: localProgress.completed,
        lesson_step: localProgress.lessonStep,
        time_spent_seconds: localProgress.timeSpentSeconds,
        variables_explored: localProgress.variablesExplored,
        notes: localProgress.notes,
        bookmarked: localProgress.bookmarked,
      })
    }
  }

  const snapshot = {
    completedCount,
    totalTimeMinutes: Math.round(totalTimeSeconds / 60),
    total: _equationIds.length,
    progressByEquation,
    localSyncItems,
    localSyncSignature: JSON.stringify(localSyncItems),
    serverSyncError: includeServer ? serverSyncErrorState : false,
  }

  progressSnapshotCache.set(cacheKey, { version: progressVersion, snapshot })
  return snapshot
}

export function getLocalProgressSyncItems(): BulkSyncItem[] {
  return getProgressSnapshot(false).localSyncItems.map((item) => ({
    ...item,
    variables_explored: [...(item.variables_explored ?? [])],
  }))
}

export function getLocalProgressSyncSignature(): string {
  return getProgressSnapshot(false).localSyncSignature
}

export function useProgress(equationId: number) {
  const { user, isAuthenticated, isPro } = useAuth()
  const [progress, setProgress] = useState<EquationProgress>(() => getLocalProgress(equationId))
  const progressRef = useRef(progress)

  useEffect(() => {
    ensureServerProgressUser(user?.id ?? null)
  }, [user?.id])

  useEffect(() => {
    let cancelled = false

    const localProgress = getLocalProgress(equationId)
    progressRef.current = localProgress
    setProgress(localProgress)

    if (!isPro || !isAuthenticated || equationId <= 0) return

    getServerProgressMap()
      .then((cache) => {
        if (cancelled) return
        const match = cache.get(equationId)
        if (!match) return
        const merged = mergeProgress(readMergedProgress(equationId, false), match)
        setLocalProgress(equationId, merged)
        progressRef.current = merged
        setProgress(merged)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [equationId, isAuthenticated, isPro, user?.id])

  const persistProgress = useCallback((next: EquationProgress) => {
    if (equationId <= 0) return

    setLocalProgress(equationId, next)
    if (isPro && isAuthenticated) {
      // Capture rollback BEFORE the optimistic write so failure restores real state.
      const rollback = serverProgressCache.get(equationId)
      updateServerCache(equationId, next)
      debouncedSync(equationId, next, rollback)
    }
  }, [equationId, isAuthenticated, isPro])

  const commitProgress = useCallback((updater: (previous: EquationProgress) => EquationProgress | null) => {
    const next = updater(progressRef.current)
    if (!next) return

    progressRef.current = next
    setProgress(next)
    persistProgress(next)
  }, [persistProgress])

  const updateProgress = useCallback((update: Partial<EquationProgress>) => {
    commitProgress((previous) => normalizeProgress({
      ...previous,
      ...update,
      lastViewed: new Date().toISOString(),
    }))
  }, [commitProgress])

  const markVariableExplored = useCallback((variableName: string) => {
    commitProgress((previous) => {
      if (previous.variablesExplored.includes(variableName)) return null

      return normalizeProgress({
        ...previous,
        variablesExplored: [...previous.variablesExplored, variableName],
        lastViewed: new Date().toISOString(),
      })
    })
  }, [commitProgress])

  return { progress, updateProgress, markVariableExplored }
}

export function useAllProgress() {
  const { user, isAuthenticated, isPro } = useAuth()
  const includeServer = isAuthenticated && isPro

  useEffect(() => {
    ensureServerProgressUser(user?.id ?? null)
  }, [user?.id])

  const getSnapshot = useCallback(
    () => getProgressSnapshot(includeServer),
    [includeServer],
  )
  const snapshot = useSyncExternalStore(subscribeToProgress, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!includeServer) {
      setServerSyncErrorState(false)
      return
    }
    if (hasFetchedServerProgress) {
      notifyProgressListeners()
      return
    }

    getServerProgressMap()
      .then(() => {
        setServerSyncErrorState(false)
        notifyProgressListeners()
      })
      .catch(() => {
        setServerSyncErrorState(true)
      })
  }, [includeServer])

  return snapshot
}
