import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import type { BulkSyncItem, ProgressItem } from "../api/client"
import { fallbackEquationManifest } from "../data/equationManifest"

// Equation IDs registered at runtime from the API manifest.
// Match the full bundled library before the first equation page/API response.
let _equationIds: number[] = fallbackEquationManifest.map((equation) => equation.id)

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
  /** Local metadata: activity alone must not make an unchanged cursor newer. */
  lessonStepUpdatedAt: string
}

const EMPTY: EquationProgress = {
  completed: false,
  lessonStep: "",
  timeSpentSeconds: 0,
  variablesExplored: [],
  notes: "",
  bookmarked: false,
  lastViewed: "",
  lessonStepUpdatedAt: "",
}

const STORAGE_KEY_PREFIX = "eq-progress-"
const syncTimers = new Map<number, ReturnType<typeof setTimeout>>()
interface PendingProgressSync {
  progress: EquationProgress
  includeCursor: boolean
  revision: number
  epoch: number
  ready: boolean
  settled?: Promise<void>
}
const pendingSyncs = new Map<number, PendingProgressSync>()
const inFlightSyncs = new Map<number, PendingProgressSync>()
const syncRevisions = new Map<number, number>()
const unconfirmedLessonCursors = new Set<number>()
const serverCacheRevisions = new Map<number, number>()
const bulkBlockedEquations = new Set<number>()
let bulkSyncPromise: Promise<ProgressItem[]> | null = null
const progressListeners = new Set<() => void>()
const localProgressCache = new Map<number, EquationProgress>()
const progressSnapshotCache = new Map<string, { version: number; snapshot: ProgressSnapshot }>()

let storageListenerAttached = false
let serverProgressCache = new Map<number, ProgressItem>()
let serverProgressPromise: Promise<Map<number, ProgressItem>> | null = null
let hasFetchedServerProgress = false
let serverProgressBackoffUntil = 0
let activeServerUserId: number | null = null
let serverStateEpoch = 0
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
    // Legacy blank cursors may come from activity alone, so only a nonempty
    // legacy cursor can inherit lastViewed. New explicit clears have a clock.
    lessonStepUpdatedAt: progress?.lessonStepUpdatedAt
      ?? (progress?.lessonStep ? progress.lastViewed ?? "" : ""),
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
  pendingSyncs.clear()
  inFlightSyncs.clear()
  syncRevisions.clear()
  unconfirmedLessonCursors.clear()
  serverCacheRevisions.clear()
  bulkBlockedEquations.clear()
  bulkSyncPromise = null
  serverStateEpoch += 1

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
  serverProgressBackoffUntil = 0
  activeServerUserId = null
  serverSyncErrorState = false
  progressSnapshotCache.clear()
  notifyProgressListeners()
}

function resetServerProgressState() {
  for (const timer of syncTimers.values()) clearTimeout(timer)
  syncTimers.clear()
  pendingSyncs.clear()
  inFlightSyncs.clear()
  syncRevisions.clear()
  unconfirmedLessonCursors.clear()
  serverCacheRevisions.clear()
  bulkBlockedEquations.clear()
  bulkSyncPromise = null
  serverStateEpoch += 1
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

function progressTimestamp(value: string | null): number {
  const timestamp = value ? Date.parse(value) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function mergeProgress(local: EquationProgress, server: ProgressItem): EquationProgress {
  const localTimestamp = progressTimestamp(local.lastViewed)
  const localCursorTimestamp = progressTimestamp(local.lessonStepUpdatedAt)
  const serverTimestamp = progressTimestamp(server.last_viewed)
  // A blank cursor is meaningful. Preserve a newer local cursor (including a
  // clear), and do not let an in-flight server read overwrite unconfirmed work.
  const useLocalCursor = unconfirmedLessonCursors.has(server.equation_id)
    || (localCursorTimestamp > 0 && localCursorTimestamp >= serverTimestamp)
  return {
    completed: local.completed || server.completed,
    lessonStep: useLocalCursor ? local.lessonStep : server.lesson_step,
    lessonStepUpdatedAt: useLocalCursor ? local.lessonStepUpdatedAt : server.last_viewed ?? "",
    timeSpentSeconds: Math.max(local.timeSpentSeconds, server.time_spent_seconds),
    variablesExplored: [...new Set([...local.variablesExplored, ...server.variables_explored])],
    notes: server.notes || local.notes,
    bookmarked: local.bookmarked || server.bookmarked,
    lastViewed: new Date(Math.max(localTimestamp, serverTimestamp)).toISOString(),
  }
}

function toProgressPayload(progress: EquationProgress, includeCursor: boolean): Partial<ProgressItem> {
  return {
    completed: progress.completed,
    ...(includeCursor ? { lesson_step: progress.lessonStep } : {}),
    time_spent_seconds: progress.timeSpentSeconds,
    variables_explored: progress.variablesExplored,
    notes: progress.notes,
    bookmarked: progress.bookmarked,
    last_viewed: progress.lastViewed,
  }
}

async function getServerProgressMap(): Promise<Map<number, ProgressItem>> {
  if (hasFetchedServerProgress) return serverProgressCache

  // Exponential backoff: don't hammer the server on repeated failures.
  if (Date.now() < serverProgressBackoffUntil) return serverProgressCache

  if (!serverProgressPromise) {
    const epoch = serverStateEpoch
    const revisionsAtStart = new Map(serverCacheRevisions)
    const request = api.progress.getAll()
      .then((items) => {
        if (epoch !== serverStateEpoch) return new Map<number, ProgressItem>()
        const fetched = new Map(items.map((item) => [item.equation_id, item]))
        // A PATCH acknowledged after this read began is newer cache evidence.
        for (const [equationId, item] of serverProgressCache) {
          if (serverCacheRevisions.get(equationId) !== revisionsAtStart.get(equationId)) {
            fetched.set(equationId, item)
          }
        }
        serverProgressCache = fetched
        hasFetchedServerProgress = true
        serverProgressBackoffUntil = 0
        return serverProgressCache
      })
      .catch((err) => {
        // Back off for 30 seconds on failure so we don't fire a request on every render.
        if (epoch === serverStateEpoch) serverProgressBackoffUntil = Date.now() + 30_000
        throw err
      })
      .finally(() => {
        if (serverProgressPromise === request) serverProgressPromise = null
      })
    serverProgressPromise = request
  }

  return serverProgressPromise
}

function flushProgressSync(eqId: number) {
  const request = pendingSyncs.get(eqId)
  if (!request?.ready || inFlightSyncs.has(eqId) || bulkBlockedEquations.has(eqId) || request.epoch !== serverStateEpoch) return
  pendingSyncs.delete(eqId)
  inFlightSyncs.set(eqId, request)

  request.settled = api.progress.update(eqId, toProgressPayload(request.progress, request.includeCursor))
    .then((serverItem) => {
      if (request.epoch !== serverStateEpoch || syncRevisions.get(eqId) !== request.revision) return
      serverProgressCache.set(eqId, serverItem)
      serverCacheRevisions.set(eqId, (serverCacheRevisions.get(eqId) ?? 0) + 1)
      if (request.includeCursor) unconfirmedLessonCursors.delete(eqId)
      notifyProgressListeners()
    })
    .catch(() => {
      // Keep confirmed cache evidence and the unsynced local cursor. A failure
      // must not roll a newer edit back to an earlier optimistic request.
    })
    .finally(() => {
      if (request.epoch !== serverStateEpoch || inFlightSyncs.get(eqId) !== request) return
      inFlightSyncs.delete(eqId)
      flushProgressSync(eqId)
    })
}

function debouncedSync(eqId: number, progress: EquationProgress, includeCursor: boolean) {
  const existingTimer = syncTimers.get(eqId)
  if (existingTimer) clearTimeout(existingTimer)
  const revision = (syncRevisions.get(eqId) ?? 0) + 1
  syncRevisions.set(eqId, revision)
  if (includeCursor) unconfirmedLessonCursors.add(eqId)
  const request = { progress, includeCursor: unconfirmedLessonCursors.has(eqId), revision, epoch: serverStateEpoch, ready: false }
  pendingSyncs.set(eqId, request)
  const timer = setTimeout(() => {
    if (syncTimers.get(eqId) !== timer || request.epoch !== serverStateEpoch) return
    syncTimers.delete(eqId)
    request.ready = true
    flushProgressSync(eqId)
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
    progressTimestamp(progress.lessonStepUpdatedAt) > 0 ||
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
        ...(localProgress.lessonStep !== "" || progressTimestamp(localProgress.lessonStepUpdatedAt) > 0
          ? { lesson_step: localProgress.lessonStep } : {}),
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

/** One tab orders bulk import and live cursor PATCHes through the same barrier. */
export function syncLocalProgressToServer(userId: number): Promise<ProgressItem[]> {
  ensureServerProgressUser(userId)
  if (bulkSyncPromise) return bulkSyncPromise
  const equationIds = new Set(getLocalProgressSyncItems().map((item) => item.equation_id))
  if (equationIds.size === 0) return Promise.resolve([])
  const epoch = serverStateEpoch
  const priorWrites: Promise<void>[] = []
  for (const equationId of equationIds) {
    bulkBlockedEquations.add(equationId)
    const settled = inFlightSyncs.get(equationId)?.settled
    if (settled) priorWrites.push(settled)
  }

  const request = Promise.all(priorWrites)
    .then(async () => {
      if (epoch !== serverStateEpoch) throw new Error("Progress account changed")
      // Waiting for an older PATCH may have allowed a learner to advance. Read
      // the current snapshot here instead of uploading the original stale one.
      const items = getLocalProgressSyncItems().filter((item) => equationIds.has(item.equation_id))
      const revisionsAtStart = new Map(syncRevisions)
      const results = await api.progress.bulkSync(items)
      if (epoch !== serverStateEpoch) throw new Error("Progress account changed")
      for (const item of results) {
        if (syncRevisions.get(item.equation_id) !== revisionsAtStart.get(item.equation_id)) continue
        serverProgressCache.set(item.equation_id, item)
        serverCacheRevisions.set(item.equation_id, (serverCacheRevisions.get(item.equation_id) ?? 0) + 1)
      }
      notifyProgressListeners()
      return results
    })
    .finally(() => {
      if (epoch === serverStateEpoch) {
        for (const equationId of equationIds) {
          bulkBlockedEquations.delete(equationId)
          flushProgressSync(equationId)
        }
      }
      if (bulkSyncPromise === request) bulkSyncPromise = null
    })
  bulkSyncPromise = request
  return request
}

export function getLocalProgressSyncSignature(): string {
  return getProgressSnapshot(false).localSyncSignature
}

export function useProgress(equationId: number) {
  const { user, isAuthenticated, isPro } = useAuth()
  const [progress, setProgress] = useState<EquationProgress>(() => readMergedProgress(equationId, false))
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

  const persistProgress = useCallback((next: EquationProgress, includeCursor: boolean) => {
    if (equationId <= 0) return

    if (isPro && isAuthenticated && activeServerUserId === user?.id) {
      debouncedSync(equationId, next, includeCursor)
    }
    setLocalProgress(equationId, next)
  }, [equationId, isAuthenticated, isPro, user?.id])

  const commitProgress = useCallback((updater: (previous: EquationProgress) => EquationProgress | null, includeCursor = false) => {
    const next = updater(progressRef.current)
    if (!next) return

    progressRef.current = next
    setProgress(next)
    persistProgress(next, includeCursor)
  }, [persistProgress])

  const updateProgress = useCallback((update: Partial<EquationProgress>) => {
    const includeCursor = Object.prototype.hasOwnProperty.call(update, "lessonStep")
    const updatedAt = new Date().toISOString()
    commitProgress((previous) => normalizeProgress({
      ...previous,
      ...update,
      completed: previous.completed || update.completed === true,
      timeSpentSeconds: Math.max(previous.timeSpentSeconds, update.timeSpentSeconds ?? 0),
      variablesExplored: [...new Set([...previous.variablesExplored, ...(update.variablesExplored ?? [])])],
      lastViewed: updatedAt,
      lessonStepUpdatedAt: includeCursor ? updatedAt : previous.lessonStepUpdatedAt,
    }), includeCursor)
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
    () => getProgressSnapshot(includeServer && activeServerUserId === user?.id),
    [includeServer, user?.id],
  )
  const snapshot = useSyncExternalStore(subscribeToProgress, getSnapshot, getSnapshot)

  useEffect(() => {
    const epoch = serverStateEpoch
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
        if (epoch !== serverStateEpoch) return
        setServerSyncErrorState(false)
        notifyProgressListeners()
      })
      .catch(() => {
        if (epoch !== serverStateEpoch) return
        setServerSyncErrorState(true)
      })
  }, [includeServer, user?.id])

  return snapshot
}
