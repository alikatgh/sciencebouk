import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import type { BulkSyncItem, ProgressItem } from "../api/client"
import { equationManifest } from "../data/equationManifest"

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
  if (equationId <= 0 || typeof localStorage === "undefined") return

  const normalized = normalizeProgress(progress)
  localProgressCache.set(equationId, normalized)
  localStorage.setItem(progressKey(equationId), JSON.stringify(normalized))
  notifyProgressListeners()
}

export function clearStoredProgress() {
  if (typeof localStorage === "undefined") return

  for (const timer of syncTimers.values()) clearTimeout(timer)
  syncTimers.clear()

  for (const equation of equationManifest) {
    localStorage.removeItem(progressKey(equation.id))
  }

  localProgressCache.clear()
  serverProgressCache = new Map()
  serverProgressPromise = null
  hasFetchedServerProgress = false
  progressSnapshotCache.clear()
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

  if (!serverProgressPromise) {
    serverProgressPromise = api.progress.getAll()
      .then((items) => {
        serverProgressCache = new Map(items.map((item) => [item.equation_id, item]))
        hasFetchedServerProgress = true
        return serverProgressCache
      })
      .finally(() => {
        serverProgressPromise = null
      })
  }

  return serverProgressPromise
}

function debouncedSync(eqId: number, progress: EquationProgress) {
  const existingTimer = syncTimers.get(eqId)
  if (existingTimer) clearTimeout(existingTimer)

  const timer = setTimeout(() => {
    api.progress.update(eqId, toProgressPayload(progress))
      .then((serverItem) => {
        serverProgressCache.set(eqId, serverItem)
        notifyProgressListeners()
      })
      .catch(() => {})
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

  for (const equation of equationManifest) {
    const progress = readMergedProgress(equation.id, includeServer)
    progressByEquation.set(equation.id, progress)
    if (progress.completed) completedCount += 1
    totalTimeSeconds += progress.timeSpentSeconds
  }

  const snapshot = {
    completedCount,
    totalTimeMinutes: Math.round(totalTimeSeconds / 60),
    total: equationManifest.length,
    progressByEquation,
  }

  progressSnapshotCache.set(cacheKey, { version: progressVersion, snapshot })
  return snapshot
}

export function getLocalProgressSyncItems(): BulkSyncItem[] {
  return equationManifest.reduce<BulkSyncItem[]>((items, equation) => {
    const progress = readMergedProgress(equation.id, false)

    if (
      !progress.completed &&
      progress.timeSpentSeconds <= 0 &&
      progress.lessonStep === "" &&
      progress.variablesExplored.length === 0 &&
      progress.notes === "" &&
      !progress.bookmarked
    ) {
      return items
    }

    items.push({
      equation_id: equation.id,
      completed: progress.completed,
      lesson_step: progress.lessonStep,
      time_spent_seconds: progress.timeSpentSeconds,
      variables_explored: progress.variablesExplored,
      notes: progress.notes,
      bookmarked: progress.bookmarked,
    })
    return items
  }, [])
}

export function useProgress(equationId: number) {
  const { isAuthenticated, isPro } = useAuth()
  const [progress, setProgress] = useState<EquationProgress>(() => getLocalProgress(equationId))

  useEffect(() => {
    let cancelled = false

    setProgress(getLocalProgress(equationId))

    if (!isPro || !isAuthenticated || equationId <= 0) return

    getServerProgressMap()
      .then((cache) => {
        if (cancelled) return
        const match = cache.get(equationId)
        if (!match) return
        const merged = mergeProgress(readMergedProgress(equationId, false), match)
        setLocalProgress(equationId, merged)
        setProgress(merged)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [equationId, isAuthenticated, isPro])

  const updateProgress = useCallback((update: Partial<EquationProgress>) => {
    setProgress((previous) => {
      const next = normalizeProgress({
        ...previous,
        ...update,
        lastViewed: new Date().toISOString(),
      })

      setLocalProgress(equationId, next)
      if (isPro && isAuthenticated) {
        updateServerCache(equationId, next)
        debouncedSync(equationId, next)
      }
      return next
    })
  }, [equationId, isAuthenticated, isPro])

  const markVariableExplored = useCallback((variableName: string) => {
    setProgress((previous) => {
      if (previous.variablesExplored.includes(variableName)) return previous

      const next = normalizeProgress({
        ...previous,
        variablesExplored: [...previous.variablesExplored, variableName],
        lastViewed: new Date().toISOString(),
      })

      setLocalProgress(equationId, next)
      if (isPro && isAuthenticated) {
        updateServerCache(equationId, next)
        debouncedSync(equationId, next)
      }
      return next
    })
  }, [equationId, isAuthenticated, isPro])

  return { progress, updateProgress, markVariableExplored }
}

export function useAllProgress() {
  const { isAuthenticated, isPro } = useAuth()
  const includeServer = isAuthenticated && isPro
  const getSnapshot = useCallback(
    () => getProgressSnapshot(includeServer),
    [includeServer],
  )
  const snapshot = useSyncExternalStore(subscribeToProgress, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!includeServer) return
    if (hasFetchedServerProgress) {
      notifyProgressListeners()
      return
    }

    getServerProgressMap()
      .then(() => {
        notifyProgressListeners()
      })
      .catch(() => {})
  }, [includeServer])

  return snapshot
}
