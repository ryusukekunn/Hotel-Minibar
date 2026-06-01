import { useState, useEffect } from 'react'
import { WifiOff, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react'
import { getPendingActionsCount, getOfflineActions, markActionSynced, clearSyncedActions } from '../../lib/offline'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function OfflineSyncBanner() {
  const isOnline = useOnlineStatus()
  const { user } = useAuth()
  const [pending, setPending] = useState(getPendingActionsCount())
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  useEffect(() => {
    setPending(getPendingActionsCount())
  }, [isOnline])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pending > 0) {
      syncPendingActions()
    }
  }, [isOnline])

  async function syncPendingActions() {
    if (!user || syncing) return
    setSyncing(true)

    const actions = getOfflineActions().filter(a => !a.synced)
    let synced = 0

    for (const action of actions) {
      try {
        if (action.type === 'consumption') {
          await supabase.from('consumption_logs').insert(action.payload as any)
        } else if (action.type === 'note') {
          await supabase.from('room_notes').insert(action.payload as any)
        } else if (action.type === 'status_change') {
          const { room_id, status, changed_by, notes } = action.payload as any
          await supabase.from('rooms').update({ status }).eq('id', room_id)
          await supabase.from('room_status_logs').insert({ room_id, to_status: status, from_status: 'unknown', changed_by, notes })
        }
        markActionSynced(action.id)
        synced++
      } catch (err) {
        console.error('Sync error for action', action.id, err)
      }
    }

    clearSyncedActions()
    setPending(getPendingActionsCount())
    setSyncing(false)

    if (synced > 0) {
      setJustSynced(true)
      toast.success(`${synced} akcija sinhronizovano`)
      setTimeout(() => setJustSynced(false), 3000)
    }
  }

  if (isOnline && pending === 0 && !justSynced) return null

  return (
    <div className={`
      fixed top-16 left-0 right-0 z-40 px-4 py-2
      lg:left-72 transition-all duration-300
    `}>
      <div className={`
        max-w-2xl mx-auto rounded-xl px-4 py-3 flex items-center gap-3
        ${!isOnline
          ? 'bg-amber-500/10 border border-amber-500/30'
          : justSynced
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-blue-500/10 border border-blue-500/30'
        }
      `}>
        {!isOnline ? (
          <>
            <WifiOff size={16} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-300">Oflajn mod</p>
              {pending > 0 && (
                <p className="text-xs text-amber-400/70">{pending} akcija čeka sinhronizaciju</p>
              )}
            </div>
          </>
        ) : justSynced ? (
          <>
            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-xs font-medium text-emerald-300 flex-1">Sinhronizacija završena</p>
          </>
        ) : (
          <>
            <UploadCloud size={16} className="text-blue-400 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-300">
                {syncing ? 'Sinhronizacija...' : `${pending} akcija čeka`}
              </p>
            </div>
            {!syncing && (
              <button
                onClick={syncPendingActions}
                className="text-xs text-blue-400 font-medium hover:text-blue-300 touch-manipulation"
              >
                Sinhronizuj
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
