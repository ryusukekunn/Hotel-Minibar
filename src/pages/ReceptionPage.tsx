import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Hotel, CheckCircle, Clock, ShoppingBag, User, LogOut } from 'lucide-react'
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

export default function ReceptionPage() {
  const { rooms, updateRoomStatus } = useRooms()
  const { user } = useAuth()
  const [filter, setFilter] = useState<RoomStatus | 'active'>('active')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const activeStatuses: RoomStatus[] = ['checkout', 'waiting_inspection', 'inspected', 'ready_for_charge']
  const activeRooms = rooms.filter(r => activeStatuses.includes(r.status))

  const filterCounts: Record<string, number> = {
    active: activeRooms.length,
    checkout: rooms.filter(r => r.status === 'checkout').length,
    waiting_inspection: rooms.filter(r => r.status === 'waiting_inspection').length,
    inspected: rooms.filter(r => r.status === 'inspected').length,
    ready_for_charge: rooms.filter(r => r.status === 'ready_for_charge').length,
    completed: rooms.filter(r => r.status === 'completed').length,
  }

  const displayRooms = filter === 'active'
    ? activeRooms
    : rooms.filter(r => r.status === filter)

  async function handleCheckout(room: Room) {
    if (room.status !== 'occupied') return
    setUpdatingId(room.id)
    try {
      await updateRoomStatus(room.id, 'waiting_inspection', 'Gost se odjavio — minibar pregled potreban')
      toast.success(`Soba ${room.number} čeka pregled minibar`)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleMarkComplete(room: Room) {
    setUpdatingId(room.id)
    try {
      await updateRoomStatus(room.id, 'completed', 'Naplata završena')
      toast.success(`Soba ${room.number} označena kao završena`)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-semibold text-white">Recepcija</h1>
        <p className="text-slate-400 text-sm">{activeRooms.length} aktivnih soba u procesu</p>
      </div>

      {/* Workflow pipeline */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Tok gosta
        </p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
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

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('active')}
          className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation ${filter === 'active' ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
        >
          Aktivne ({filterCounts.active})
        </button>
        {WORKFLOW_STEPS.map(step => (
          <button
            key={step.status}
            onClick={() => setFilter(step.status)}
            className={`flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation ${filter === step.status ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Room cards */}
      {displayRooms.length === 0 ? (
        <div className="text-center py-12">
          <Hotel size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nema soba u ovom statusu</p>
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
              userRole={user?.role ?? 'reception'}
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
  userRole: string
}

function ReceptionRoomCard({ room, onCheckout, onComplete, updating, userRole }: ReceptionRoomCardProps) {
  const [charges, setCharges] = useState<{ total: number; count: number } | null>(null)

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
      setCharges({
        total: data.reduce((s, r) => s + r.total_price, 0),
        count: data.length,
      })
    }
  }

  const statusBorderColor: Record<RoomStatus, string> = {
    free: 'border-slate-700',
    occupied: 'border-blue-500/30',
    checkout: 'border-orange-500/40',
    waiting_inspection: 'border-amber-500/40',
    inspected: 'border-purple-500/40',
    ready_for_charge: 'border-emerald-500/40',
    completed: 'border-slate-700',
  }

  return (
    <div className={`card border-l-4 ${statusBorderColor[room.status]} p-4`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-700/50 rounded-xl flex items-center justify-center font-bold text-white">
            {room.number}
          </div>
          <div>
            <p className="font-semibold text-white">Soba {room.number}</p>
            <p className="text-xs text-slate-500">Sprat {room.floor}</p>
          </div>
        </div>
        <StatusBadge status={room.status} size="sm" />
      </div>

      {charges && charges.total > 0 && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
          <span className="text-xs text-emerald-400">Minibar naknada</span>
          <span className="font-bold text-emerald-400">{charges.total.toFixed(2)} €</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          to={`/rooms/${room.id}`}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5"
        >
          Detalji
        </Link>

        {room.status === 'occupied' && (
          <button
            onClick={onCheckout}
            disabled={updating}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2.5 px-3 rounded-xl transition-all touch-manipulation text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {updating ? '...' : <><LogOut size={14} /> Odjava</>}
          </button>
        )}

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
            title="Označi kao završeno"
          >
            {updating ? '...' : <CheckCircle size={16} />}
          </button>
        )}
      </div>
    </div>
  )
}
