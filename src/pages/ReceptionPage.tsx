import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Hotel, CheckCircle, Clock,
  ShoppingBag, LogOut, BedDouble, Search
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRooms } from '../hooks/useRooms'
import StatusBadge from '../components/shared/StatusBadge'
import type { Room, RoomStatus } from '../types'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const WORKFLOW_STEPS: { status: RoomStatus; label: string; icon: typeof Clock; color: string }[] = [
  { status: 'checkout', label: 'Odjava', icon: LogOut, color: 'text-orange-400' },
  { status: 'waiting_inspection', label: 'Čeka pregled', icon: Clock, color: 'text-amber-400' },
  { status: 'inspected', label: 'Pregledano', icon: CheckCircle, color: 'text-purple-400' },
  { status: 'ready_for_charge', label: 'Za naplatu', icon: ShoppingBag, color: 'text-emerald-400' },
  { status: 'completed', label: 'Završeno', icon: CheckCircle, color: 'text-slate-400' },
]

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Jednokrevetna',
  double: 'Dvokrevetna',
  suite: 'Apartman',
  deluxe: 'Deluxe',
}

export default function ReceptionPage() {
  const { rooms, updateRoomStatus } = useRooms()
  const { user } = useAuth()
  const [filter, setFilter] = useState<RoomStatus | 'active' | 'occupied'>('occupied')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const occupiedRooms = rooms.filter(r => r.status === 'occupied')
  const activeStatuses: RoomStatus[] = ['checkout', 'waiting_inspection', 'inspected', 'ready_for_charge']
  const activeRooms = rooms.filter(r => activeStatuses.includes(r.status))

  const filterCounts: Record<string, number> = {
    occupied: occupiedRooms.length,
    active: activeRooms.length,
    checkout: rooms.filter(r => r.status === 'checkout').length,
    waiting_inspection: rooms.filter(r => r.status === 'waiting_inspection').length,
    inspected: rooms.filter(r => r.status === 'inspected').length,
    ready_for_charge: rooms.filter(r => r.status === 'ready_for_charge').length,
    completed: rooms.filter(r => r.status === 'completed').length,
  }

  const baseRooms = filter === 'occupied'
    ? occupiedRooms
    : filter === 'active'
      ? activeRooms
      : rooms.filter(r => r.status === filter)

  const displayRooms = search.trim()
    ? baseRooms.filter(r => r.number.toLowerCase().includes(search.toLowerCase()))
    : baseRooms

  async function handleCheckout(room: Room) {
    setUpdatingId(room.id)
    try {
      await updateRoomStatus(room.id, 'waiting_inspection', 'Gost se odjavio — minibar pregled potreban')
      toast.success(`Soba ${room.number} — čeka pregled minibar 🔔`)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleMarkComplete(room: Room) {
    setUpdatingId(room.id)
    try {
      await updateRoomStatus(room.id, 'completed', 'Naplata završena')
      toast.success(`Soba ${room.number} završena ✓`)
    } finally {
      setUpdatingId(null)
    }
  }

  const tabs = [
    {
      id: 'occupied',
      label: 'Zauzete sobe',
      count: filterCounts.occupied,
      color: 'text-blue-400',
      description: 'Pokrenite odjavu gosta',
    },
    {
      id: 'active',
      label: 'U procesu',
      count: filterCounts.active,
      color: 'text-amber-400',
      description: 'Sobe u toku odjave',
    },
    {
      id: 'completed',
      label: 'Završeno',
      count: filterCounts.completed,
      color: 'text-slate-400',
      description: 'Danas završene naplate',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-white">Recepcija</h1>
        <p className="text-slate-400 text-sm">
          {occupiedRooms.length} zauzeto · {activeRooms.length} u procesu odjave
        </p>
      </div>

      {/* Workflow pipeline */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Tok odjave gosta
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {/* Occupied as start */}
          <button
            onClick={() => setFilter('occupied')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all touch-manipulation flex-none ${filter === 'occupied' ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-slate-700/50'}`}
          >
            <div className="flex items-center gap-1">
              <BedDouble size={13} className="text-blue-400" />
              {filterCounts.occupied > 0 && (
                <span className="text-xs font-bold text-blue-400">{filterCounts.occupied}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Zauzete</span>
          </button>
          <ArrowRight size={12} className="text-slate-700 flex-none" />

          {WORKFLOW_STEPS.map((step, i) => {
            const Icon = step.icon
            const count = filterCounts[step.status] ?? 0
            return (
              <div key={step.status} className="flex items-center gap-1 flex-none">
                <button
                  onClick={() => setFilter(step.status)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all touch-manipulation ${filter === step.status ? 'bg-hotel-600/20 border border-hotel-600/30' : 'hover:bg-slate-700/50'}`}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={13} className={step.color} />
                    {count > 0 && (
                      <span className={`text-xs font-bold ${step.color}`}>{count}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{step.label}</span>
                </button>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight size={12} className="text-slate-700 flex-none" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main tabs */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`p-3 rounded-xl border transition-all touch-manipulation text-left ${
              filter === tab.id
                ? 'bg-hotel-600/20 border-hotel-600/40'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <p className={`text-xl font-bold ${tab.color}`}>{tab.count}</p>
            <p className="text-xs font-medium text-slate-300 mt-0.5">{tab.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">{tab.description}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Pretraži po broju sobe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10 py-2.5 text-sm"
        />
      </div>

      {/* Section label */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {filter === 'occupied' && '🛏 Zauzete sobe — kliknite Pokreni odjavu'}
          {filter === 'active' && '⏳ Sobe u procesu odjave'}
          {filter === 'waiting_inspection' && '🔔 Čekaju pregled sobarica'}
          {filter === 'inspected' && '✅ Pregledano — spremo za naplatu'}
          {filter === 'ready_for_charge' && '💳 Spremo za naplatu'}
          {filter === 'completed' && '🏁 Završene naplate danas'}
          {filter === 'checkout' && '🚪 U odjavi'}
        </p>
        <span className="text-xs text-slate-600">{displayRooms.length} soba</span>
      </div>

      {/* Room cards */}
      {displayRooms.length === 0 ? (
        <div className="text-center py-12">
          <Hotel size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">
            {filter === 'occupied'
              ? 'Nema zauzenih soba trenutno'
              : 'Nema soba u ovom statusu'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRooms.map(room => (
            <ReceptionRoomCard
              key={room.id}
              room={room}
              onCheckout={() => handleCheckout(room)}
              onComplete={() => handleMarkComplete(room)}
              updating={updatingId === room.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ReceptionRoomCardProps {
  room: Room
  onCheckout: () => void
  onComplete: () => void
  updating: boolean
}

function ReceptionRoomCard({ room, onCheckout, onComplete, updating }: ReceptionRoomCardProps) {
  const [charges, setCharges] = useState<{ total: number } | null>(null)

  useEffect(() => {
    if (['inspected', 'ready_for_charge', 'completed'].includes(room.status)) {
      loadCharges()
    }
  }, [room.id, room.status])

  async function loadCharges() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('consumption_logs')
      .select('total_price')
      .eq('room_id', room.id)
      .gte('created_at', today.toISOString())
    if (data) {
      setCharges({ total: (data as any[]).reduce((s, r) => s + r.total_price, 0) })
    }
  }

  const borderColors: Partial<Record<RoomStatus, string>> = {
    occupied: 'border-blue-500/40',
    checkout: 'border-orange-500/40',
    waiting_inspection: 'border-amber-500/40',
    inspected: 'border-purple-500/40',
    ready_for_charge: 'border-emerald-500/40',
    completed: 'border-slate-700/50',
  }

  const isOccupied = room.status === 'occupied'

  return (
    <div className={`card border-l-4 ${borderColors[room.status] ?? 'border-slate-700'} p-4 ${isOccupied ? 'bg-blue-500/5' : ''}`}>
      {/* Room info */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isOccupied ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700/50 text-white'}`}>
            {room.number}
          </div>
          <div>
            <p className="font-semibold text-white">Soba {room.number}</p>
            <p className="text-xs text-slate-500">Sprat {room.floor}</p>
          </div>
        </div>
        <StatusBadge status={room.status} size="sm" />
      </div>

      {/* Minibar charge */}
      {charges && charges.total > 0 && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
          <span className="text-xs text-emerald-400">💳 Minibar naknada</span>
          <span className="font-bold text-emerald-400">{charges.total.toFixed(2)} €</span>
        </div>
      )}

      {/* OCCUPIED — highlight checkout button */}
      {isOccupied && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-3">
          <p className="text-xs text-blue-300 mb-2">
            👤 Gost u sobi — pokrenite odjavu kada gost napusti sobu
          </p>
          <button
            onClick={onCheckout}
            disabled={updating}
            className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-all touch-manipulation flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            {updating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Obrada...
              </>
            ) : (
              <>
                <LogOut size={18} />
                Pokreni odjavu
              </>
            )}
          </button>
        </div>
      )}

      {/* Action buttons for other statuses */}
      <div className="flex gap-2">
        <Link
          to={`/rooms/${room.id}`}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5"
        >
          Detalji
        </Link>

        {(room.status === 'inspected' || room.status === 'ready_for_charge') && (
          <Link
            to={`/checkout/${room.id}`}
            className="flex-1 btn-success flex items-center justify-center gap-1.5 text-sm py-2.5"
          >
            <ShoppingBag size={14} />
            Naplata
          </Link>
        )}

        {room.status === 'ready_for_charge' && (
          <button
            onClick={onComplete}
            disabled={updating}
            className="btn-secondary px-3 py-2.5 text-sm touch-manipulation"
            title="Označi kao završeno bez naplate"
          >
            {updating ? '...' : <CheckCircle size={16} />}
          </button>
        )}
      </div>
    </div>
  )
}
