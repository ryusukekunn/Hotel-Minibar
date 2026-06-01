import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, TrendingUp, AlertTriangle, CheckCircle,
  Clock, ShoppingBag, ArrowRight, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import StatusBadge from '../components/shared/StatusBadge'
import type { Room, ConsumptionLog, MinibarItem } from '../types'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface TopItem {
  item_id: string
  item_name: string
  icon: string
  total_qty: number
  total_rev: number
}

interface LowStock {
  room_number: string
  room_id: string
  item_name: string
  current_quantity: number
  min_quantity: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { rooms } = useRooms()
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [lowStock, setLowStock] = useState<LowStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const waitingInspection = rooms.filter(r => r.status === 'waiting_inspection')
  const inspected = rooms.filter(r => r.status === 'inspected')
  const readyForCharge = rooms.filter(r => r.status === 'ready_for_charge')
  const occupied = rooms.filter(r => r.status === 'occupied')

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Today's revenue
      const { data: revData } = await supabase
        .from('consumption_logs')
        .select('total_price')
        .gte('created_at', today.toISOString())

      const revenue = (revData ?? []).reduce((sum, r) => sum + (r.total_price ?? 0), 0)
      setTodayRevenue(revenue)

      // Top consumed items (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: consumptionData } = await supabase
        .from('consumption_logs')
        .select('item_id, quantity, total_price, minibar_items(name, icon)')
        .gte('created_at', weekAgo.toISOString())

      if (consumptionData) {
        const aggregated: Record<string, TopItem> = {}
        for (const row of consumptionData as any[]) {
          const itemId = row.item_id
          const item = row.minibar_items
          if (!aggregated[itemId]) {
            aggregated[itemId] = {
              item_id: itemId,
              item_name: item?.name ?? 'Nepoznato',
              icon: item?.icon ?? '📦',
              total_qty: 0,
              total_rev: 0,
            }
          }
          aggregated[itemId].total_qty += row.quantity
          aggregated[itemId].total_rev += row.total_price
        }

        setTopItems(
          (Object.values(aggregated) as TopItem[])
            .sort((a, b) => b.total_qty - a.total_qty)
            .slice(0, 5)
        )
      }

      // Low stock alerts
      const { data: invData } = await supabase
        .from('room_inventory')
        .select('room_id, current_quantity, min_quantity, minibar_items(name), rooms(number)')
        .lt('current_quantity', supabase.rpc as unknown as number)

      // Manual filter since we can't use column comparison in select
      const { data: allInv } = await supabase
        .from('room_inventory')
        .select('room_id, current_quantity, min_quantity, minibar_items(name), rooms(number, status)')

      if (allInv) {
        const lowStockItems = allInv
          .filter(inv => {
            const room = inv.rooms as unknown as Room
            return inv.current_quantity <= inv.min_quantity && room?.status === 'occupied'
          })
          .slice(0, 5)
          .map(inv => {
            const item = inv.minibar_items as unknown as MinibarItem
            const room = inv.rooms as unknown as Room
            return {
              room_number: room?.number ?? '?',
              room_id: inv.room_id,
              item_name: item?.name ?? 'Nepoznato',
              current_quantity: inv.current_quantity,
              min_quantity: inv.min_quantity,
            }
          })
        setLowStock(lowStockItems)
      }

    } catch (err) {
      console.error('Greška pri učitavanju statistike:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Dobro jutro'
    if (h < 18) return 'Dobar dan'
    return 'Dobro veče'
  }

  const statCards = [
    {
      label: 'Čeka pregled',
      value: waitingInspection.length,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      link: '/housekeeping',
      urgent: waitingInspection.length > 0,
    },
    {
      label: 'Pregledano',
      value: inspected.length,
      icon: CheckCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      link: '/reception',
    },
    {
      label: 'Spremo za naplatu',
      value: readyForCharge.length,
      icon: ShoppingBag,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      link: '/reception',
    },
    {
      label: 'Zauzete sobe',
      value: occupied.length,
      icon: Building2,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      link: '/rooms',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-display font-semibold text-white">
            {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {format(new Date(), 'EEEE, d. MMMM yyyy.', { locale: sr })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Revenue card */}
      <div className="card p-5 bg-gradient-to-br from-hotel-900/50 to-hotel-950/80 border-hotel-700/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Prihod danas</p>
            <p className="text-3xl font-bold text-white">
              {loading ? (
                <span className="skeleton w-24 h-8 inline-block rounded" />
              ) : (
                `${todayRevenue.toFixed(2)} €`
              )}
            </p>
            <p className="text-slate-500 text-xs mt-1">iz minibar konzumacije</p>
          </div>
          <div className="w-14 h-14 bg-hotel-600/20 rounded-2xl flex items-center justify-center">
            <TrendingUp size={28} className="text-hotel-400" />
          </div>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={card.link}
              className={`card p-4 border ${card.border} ${card.urgent ? 'animate-pulse-soft' : ''} active:scale-[0.98] transition-transform`}
            >
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.color} />
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? <span className="skeleton w-8 h-7 inline-block rounded" /> : card.value}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{card.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Waiting inspection rooms */}
      {waitingInspection.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Čekaju pregled
            </h2>
            <Link to="/housekeeping" className="text-xs text-hotel-400 flex items-center gap-1">
              Sve sobe <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {waitingInspection.slice(0, 3).map(room => (
              <RoomWaitingCard key={room.id} room={room} />
            ))}
            {waitingInspection.length > 3 && (
              <Link
                to="/housekeeping"
                className="block text-center py-2 text-sm text-hotel-400 hover:text-hotel-300 transition-colors"
              >
                +{waitingInspection.length - 3} više soba
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-3">Najpopularniji artikli (7 dana)</h2>
          <div className="card divide-y divide-slate-700/50">
            {topItems.map((item, i) => (
              <div key={item.item_id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{item.item_name}</p>
                  <p className="text-xs text-slate-500">{item.total_qty} kom</p>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  {item.total_rev.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Upozorenja o zalihama
          </h2>
          <div className="space-y-2">
            {lowStock.map((item, i) => (
              <Link
                key={i}
                to={`/rooms/${item.room_id}`}
                className="card-hover flex items-center gap-3 p-3"
              >
                <div className="w-9 h-9 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">
                    Soba {item.room_number} — {item.item_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Trenutno: {item.current_quantity} / Minimum: {item.min_quantity}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RoomWaitingCard({ room }: { room: Room }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="card-hover flex items-center justify-between p-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
          <span className="font-bold text-amber-400 text-sm">{room.number}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">Soba {room.number}</p>
          <p className="text-xs text-slate-500 capitalize">Sprat {room.floor}</p>
        </div>
      </div>
      <StatusBadge status={room.status} size="sm" />
    </Link>
  )
}
