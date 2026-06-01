import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Building2, ArrowRight } from 'lucide-react'
import { useRooms } from '../hooks/useRooms'
import StatusBadge from '../components/shared/StatusBadge'
import type { RoomStatus } from '../types'

const STATUS_FILTERS: { label: string; value: RoomStatus | 'all' }[] = [
  { label: 'Sve', value: 'all' },
  { label: 'Slobodne', value: 'free' },
  { label: 'Zauzete', value: 'occupied' },
  { label: 'Odjava', value: 'checkout' },
  { label: 'Čeka pregled', value: 'waiting_inspection' },
  { label: 'Pregledano', value: 'inspected' },
  { label: 'Za naplatu', value: 'ready_for_charge' },
  { label: 'Završeno', value: 'completed' },
]

const FLOOR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-red-500', 'bg-pink-500',
]

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Jednokrevetna',
  double: 'Dvokrevetna',
  suite: 'Apartman',
  deluxe: 'Deluxe',
}

export default function RoomsPage() {
  const { rooms, loading } = useRooms()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all')
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all')

  const floors = [...new Set(rooms.map(r => r.floor))].sort()

  const filtered = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    const matchesFloor = floorFilter === 'all' || room.floor === floorFilter
    return matchesSearch && matchesStatus && matchesFloor
  })

  const grouped = filtered.reduce<Record<number, typeof filtered>>((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = []
    acc[room.floor].push(room)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold text-white">Sobe</h1>
        <span className="text-sm text-slate-400">{rooms.length} soba</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Pretraži po broju sobe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Floor filter */}
      {floors.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFloorFilter('all')}
            className={`flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${floorFilter === 'all' ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Svi spratovi
          </button>
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => setFloorFilter(floor)}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${floorFilter === floor ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Sprat {floor}
            </button>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${statusFilter === f.value ? 'bg-hotel-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nema soba po ovim kriterijumima</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([floor, floorRooms]) => (
              <div key={floor}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${FLOOR_COLORS[Number(floor) % FLOOR_COLORS.length]}`} />
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Sprat {floor}
                  </h2>
                  <span className="text-xs text-slate-600">({floorRooms.length})</span>
                </div>
                <div className="space-y-2">
                  {floorRooms.map(room => (
                    <Link
                      key={room.id}
                      to={`/rooms/${room.id}`}
                      className="card-hover flex items-center gap-4 p-4"
                    >
                      <div className="w-12 h-12 bg-slate-700/50 rounded-2xl flex items-center justify-center font-bold text-white text-lg">
                        {room.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-white">Soba {room.number}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {ROOM_TYPE_LABELS[room.type] ?? room.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={room.status} size="sm" />
                        <ArrowRight size={14} className="text-slate-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
