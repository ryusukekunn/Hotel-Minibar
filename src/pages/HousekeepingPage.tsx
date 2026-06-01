import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, ArrowRight, RefreshCw, Filter } from 'lucide-react'
import { useRooms } from '../hooks/useRooms'
import StatusBadge from '../components/shared/StatusBadge'
import type { Room } from '../types'
import { format, formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

const ROOM_TYPE_ICONS: Record<string, string> = {
  single: '🛏',
  double: '🛏🛏',
  suite: '🏨',
  deluxe: '⭐',
}

export default function HousekeepingPage() {
  const { rooms, loading, fetchRooms } = useRooms()
  const [filter, setFilter] = useState<'all' | 'waiting' | 'done'>('waiting')
  const [refreshing, setRefreshing] = useState(false)

  const waitingRooms = rooms.filter(r =>
    r.status === 'waiting_inspection' || r.status === 'checkout'
  )
  const inspectedRooms = rooms.filter(r => r.status === 'inspected')
  const allAssigned = rooms.filter(r =>
    ['waiting_inspection', 'checkout', 'inspected'].includes(r.status)
  )

  const displayRooms = filter === 'waiting'
    ? waitingRooms
    : filter === 'done'
      ? inspectedRooms
      : allAssigned

  async function handleRefresh() {
    setRefreshing(true)
    await fetchRooms()
    setRefreshing(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">Sobarice</h1>
          <p className="text-slate-400 text-sm">
            {waitingRooms.length} soba čeka pregled
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{waitingRooms.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Čeka</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{inspectedRooms.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pregledano</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-slate-400">{allAssigned.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Ukupno</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'waiting', label: `Čeka (${waitingRooms.length})` },
          { value: 'done', label: `Pregledano (${inspectedRooms.length})` },
          { value: 'all', label: 'Sve' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all touch-manipulation ${filter === f.value ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Room list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : displayRooms.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={48} className="text-emerald-500/30 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {filter === 'waiting' ? 'Sve sobe su pregledane! 🎉' : 'Nema soba'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRooms.map(room => (
            <HousekeepingRoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  )
}

function HousekeepingRoomCard({ room }: { room: Room }) {
  const isUrgent = room.status === 'waiting_inspection'
  const isDone = room.status === 'inspected'

  const timeAgo = room.last_inspected_at
    ? formatDistanceToNow(new Date(room.last_inspected_at), { addSuffix: true, locale: sr })
    : null

  return (
    <Link
      to={`/rooms/${room.id}`}
      className={`
        block rounded-2xl border transition-all duration-200 active:scale-[0.99]
        ${isUrgent
          ? 'bg-amber-400/5 border-amber-400/30 hover:border-amber-400/50'
          : isDone
            ? 'bg-purple-400/5 border-purple-400/20 hover:border-purple-400/40'
            : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Room number */}
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0
            ${isUrgent ? 'bg-amber-400/20 text-amber-300' : isDone ? 'bg-purple-400/20 text-purple-300' : 'bg-slate-700 text-slate-300'}
          `}>
            {room.number}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Soba {room.number}</span>
                <span className="text-slate-500">{ROOM_TYPE_ICONS[room.type]}</span>
              </div>
              <StatusBadge status={room.status} size="sm" />
            </div>

            <p className="text-xs text-slate-500 mt-1">Sprat {room.floor}</p>

            {isUrgent && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock size={12} className="text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">Potreban pregled</span>
              </div>
            )}

            {isDone && timeAgo && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle size={12} className="text-purple-400" />
                <span className="text-xs text-purple-400">Pregledano {timeAgo}</span>
              </div>
            )}
          </div>

          <ArrowRight size={18} className="text-slate-600 flex-shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  )
}
