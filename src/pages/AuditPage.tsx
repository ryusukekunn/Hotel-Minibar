import { useState, useEffect } from 'react'
import { BookOpen, Filter, RefreshCw, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import type { RoomStatusLog } from '../types'

interface LogEntry {
  id: string
  room_number: string
  from_status: string
  to_status: string
  changed_by_name: string
  changed_by_role: string
  notes: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  free: 'Slobodna',
  occupied: 'Zauzeta',
  checkout: 'Odjava',
  waiting_inspection: 'Čeka pregled',
  inspected: 'Pregledano',
  ready_for_charge: 'Za naplatu',
  completed: 'Završeno',
}

const STATUS_COLORS: Record<string, string> = {
  free: 'text-slate-400',
  occupied: 'text-blue-400',
  checkout: 'text-orange-400',
  waiting_inspection: 'text-amber-400',
  inspected: 'text-purple-400',
  ready_for_charge: 'text-emerald-400',
  completed: 'text-slate-500',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 30

  useEffect(() => {
    loadLogs(0, true)
  }, [])

  async function loadLogs(pageNum: number, reset = false) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('room_status_logs')
        .select(`
          id, from_status, to_status, notes, created_at,
          rooms(number),
          profiles(full_name, role)
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (error) throw error

      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        room_number: row.rooms?.number ?? '?',
        from_status: row.from_status,
        to_status: row.to_status,
        changed_by_name: row.profiles?.full_name ?? 'Sistem',
        changed_by_role: row.profiles?.role ?? 'system',
        notes: row.notes,
        created_at: row.created_at,
      }))

      setHasMore(mapped.length === PAGE_SIZE)
      setLogs(prev => reset ? mapped : [...prev, ...mapped])
      setPage(pageNum)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    reception: 'Recepcija',
    housekeeping: 'Sobarica',
    system: 'Sistem',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">Audit log</h1>
          <p className="text-slate-400 text-sm">Istorija promena statusa soba</p>
        </div>
        <button
          onClick={() => loadLogs(0, true)}
          disabled={loading}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nema zabeleženih promena</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">Soba {log.room_number}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[log.from_status] ?? 'text-slate-400'}`}>
                    {STATUS_LABELS[log.from_status] ?? log.from_status}
                  </span>
                  <span className="text-slate-600 text-xs">→</span>
                  <span className={`text-xs font-semibold ${STATUS_COLORS[log.to_status] ?? 'text-slate-400'}`}>
                    {STATUS_LABELS[log.to_status] ?? log.to_status}
                  </span>
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap flex items-center gap-1">
                  <Clock size={11} />
                  {format(new Date(log.created_at), 'dd.MM. HH:mm')}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs text-slate-500">
                  {log.changed_by_name}
                  <span className="ml-1 text-slate-600">({roleLabels[log.changed_by_role] ?? log.changed_by_role})</span>
                </div>
              </div>

              {log.notes && (
                <p className="text-xs text-slate-400 mt-1.5 italic">"{log.notes}"</p>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => loadLogs(page + 1)}
              disabled={loading}
              className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
              ) : (
                'Učitaj više'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
