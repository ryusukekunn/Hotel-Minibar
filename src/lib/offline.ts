import type { OfflineAction } from '../types'

const OFFLINE_KEY = 'hotel_minibar_offline_actions'
const CACHE_KEY = 'hotel_minibar_cache'

// ============================================================
// OFLAJN REDOSLED AKCIJA
// ============================================================

export function getOfflineActions(): OfflineAction[] {
  try {
    const data = localStorage.getItem(OFFLINE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function addOfflineAction(
  type: OfflineAction['type'],
  payload: Record<string, unknown>
): OfflineAction {
  const action: OfflineAction = {
    id: crypto.randomUUID(),
    type,
    payload,
    created_at: new Date().toISOString(),
    synced: false,
  }
  
  const actions = getOfflineActions()
  actions.push(action)
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(actions))
  return action
}

export function markActionSynced(id: string): void {
  const actions = getOfflineActions()
  const updated = actions.map(a => a.id === id ? { ...a, synced: true } : a)
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(updated))
}

export function clearSyncedActions(): void {
  const actions = getOfflineActions()
  const pending = actions.filter(a => !a.synced)
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(pending))
}

export function getPendingActionsCount(): number {
  return getOfflineActions().filter(a => !a.synced).length
}

// ============================================================
// LOKALNI KEŠ ZA PODATKE
// ============================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export function setCacheEntry<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  try {
    const cache = getFullCache()
    cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignoriši greške pri čuvanju keša
  }
}

export function getCacheEntry<T>(key: string): T | null {
  try {
    const cache = getFullCache()
    const entry = cache[key] as CacheEntry<T> | undefined
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      delete cache[key]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      return null
    }
    
    return entry.data
  } catch {
    return null
  }
}

function getFullCache(): Record<string, CacheEntry<unknown>> {
  try {
    const data = localStorage.getItem(CACHE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY)
}

// ============================================================
// PROVERA STATUSA MREŽE
// ============================================================

export function isOnline(): boolean {
  return navigator.onLine
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
