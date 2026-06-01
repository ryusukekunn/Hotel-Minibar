import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle, ShoppingBag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import type { Room, ConsumptionLog, MinibarItem } from '../types'
import { format } from 'date-fns'

interface LineItem {
  item_id: string
  item_name: string
  icon: string
  quantity: number
  unit_price: number
  total: number
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (!id) return
    loadCheckout()
  }, [id])

  async function loadCheckout() {
    try {
      const [roomRes, logsRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', id!).single(),
        supabase
          .from('consumption_logs')
          .select('*, minibar_items(name, icon, price)')
          .eq('room_id', id!)
          .order('created_at', { ascending: false }),
      ])

      if (roomRes.data) setRoom(roomRes.data as Room)

      if (logsRes.data) {
        // Aggregate by item
        const aggregated = (logsRes.data as unknown as Array<ConsumptionLog & { minibar_items: MinibarItem }>)
          .reduce<Record<string, LineItem>>((acc, log) => {
            const item = log.minibar_items
            if (!acc[log.item_id]) {
              acc[log.item_id] = {
                item_id: log.item_id,
                item_name: item?.name ?? 'Nepoznato',
                icon: item?.icon ?? '📦',
                quantity: 0,
                unit_price: log.unit_price,
                total: 0,
              }
            }
            acc[log.item_id].quantity += log.quantity
            acc[log.item_id].total += log.total_price
            return acc
          }, {})
        setLineItems(Object.values(aggregated))
      }
    } catch {
      toast.error('Greška pri učitavanju')
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = lineItems.reduce((s, i) => s + i.total, 0)

  async function handleComplete() {
    if (!room || !user) return
    setCompleting(true)
    try {
      await supabase
        .from('rooms')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id)

      await supabase.from('room_status_logs').insert({
        room_id: room.id,
        from_status: room.status,
        to_status: 'completed',
        changed_by: user.id,
        notes: `Naplata završena: ${grandTotal.toFixed(2)} €`,
      })

      toast.success(`Naplata sobe ${room.number} završena! Total: ${grandTotal.toFixed(2)} €`)
      navigate('/reception')
    } catch {
      toast.error('Greška pri završavanju naplate')
    } finally {
      setCompleting(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-40 rounded-xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )

  if (!room) return <div className="text-center py-12 text-slate-400">Soba nije pronađena</div>

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Naplata — Soba {room.number}</h1>
          <p className="text-slate-500 text-xs">{format(new Date(), 'dd.MM.yyyy. HH:mm')}</p>
        </div>
      </div>

      {/* Receipt */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-hotel-900 to-hotel-800 px-5 py-4 border-b border-hotel-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-hotel-300 text-xs font-medium uppercase tracking-wider">Hotel Minibar</p>
              <p className="text-white font-bold text-lg">Soba {room.number}</p>
            </div>
            <div className="text-right">
              <p className="text-hotel-300 text-xs">Sprat</p>
              <p className="text-white font-semibold">{room.floor}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-slate-700/50">
          {lineItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
              <p>Nema konzumacije za ovu sobu</p>
            </div>
          ) : (
            lineItems.map(item => (
              <div key={item.item_id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="text-xl w-8">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{item.item_name}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × {item.unit_price.toFixed(2)} €
                  </p>
                </div>
                <span className="font-semibold text-white">{item.total.toFixed(2)} €</span>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        <div className="border-t border-slate-600 bg-slate-700/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-slate-300">UKUPNO</span>
            <span className="text-2xl font-bold text-white">{grandTotal.toFixed(2)} €</span>
          </div>
          {grandTotal === 0 && (
            <p className="text-xs text-slate-500 mt-1 text-right">Bez minibar naknade</p>
          )}
        </div>
      </div>

      {/* Note */}
      {room.notes && (
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Napomene</p>
          <p className="text-sm text-slate-300">{room.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 safe-bottom lg:left-72">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={handlePrint}
            className="btn-secondary px-4 flex items-center gap-2"
          >
            <Printer size={16} />
            Štampaj
          </button>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="btn-success flex-1 flex items-center justify-center gap-2 text-base"
          >
            {completing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Obrada...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Završi naplatu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
