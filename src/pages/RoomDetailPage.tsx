import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Minus, CheckCircle, ClipboardList,
  MessageSquare, History, ChevronDown, ChevronUp, Send,
  RotateCcw, AlertCircle, ShoppingCart
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { addOfflineAction, isOnline } from '../lib/offline'
import StatusBadge from '../components/shared/StatusBadge'
import toast from 'react-hot-toast'
import type { Room, MinibarItem, RoomInventory, ConsumptionLog, RoomNote, RoomStatus } from '../types'
import { format } from 'date-fns'

interface InventoryWithItem extends RoomInventory {
  item: MinibarItem
  consumed: number
}

const CATEGORY_LABELS: Record<string, string> = {
  beverages: '🥤 Bezalkoholna pića',
  alcohol: '🍷 Alkoholna pića',
  snacks: '🍿 Grickalice',
  toiletries: '🧴 Toaletni pribor',
  other: '📦 Ostalo',
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [inventory, setInventory] = useState<InventoryWithItem[]>([])
  const [notes, setNotes] = useState<RoomNote[]>([])
  const [recentLogs, setRecentLogs] = useState<ConsumptionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [activeTab, setActiveTab] = useState<'inventory' | 'notes' | 'history'>('inventory')
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Track consumed amounts for current session
  const [consumed, setConsumed] = useState<Record<string, number>>({})
  const [missing, setMissing] = useState<Record<string, boolean>>({})

  const fetchRoom = useCallback(async () => {
    if (!id) return
    try {
      const [roomRes, invRes, notesRes, logsRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', id).single(),
        supabase
          .from('room_inventory')
          .select('*, minibar_items(*)')
          .eq('room_id', id),
        supabase
          .from('room_notes')
          .select('*, profiles(full_name, role)')
          .eq('room_id', id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('consumption_logs')
          .select('*, minibar_items(name, icon)')
          .eq('room_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (roomRes.data) setRoom(roomRes.data as Room)
      if (invRes.data) {
        setInventory(
          (invRes.data as unknown as Array<RoomInventory & { minibar_items: MinibarItem }>).map(i => ({
            ...i,
            item: i.minibar_items,
            consumed: 0,
          }))
        )
      }
      if (notesRes.data) setNotes(notesRes.data as unknown as RoomNote[])
      if (logsRes.data) setRecentLogs(logsRes.data as unknown as ConsumptionLog[])
    } catch (err) {
      toast.error('Greška pri učitavanju sobe')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  // Real-time updates
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`room_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
        () => fetchRoom())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, fetchRoom])

  function adjustConsumed(itemId: string, delta: number) {
    const inv = inventory.find(i => i.item_id === itemId)
    if (!inv) return
    const current = consumed[itemId] ?? 0
    const max = inv.current_quantity
    const newVal = Math.max(0, Math.min(max, current + delta))
    setConsumed(prev => ({ ...prev, [itemId]: newVal }))
  }

  function toggleMissing(itemId: string) {
    setMissing(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const hasChanges = Object.values(consumed).some(v => v > 0) || Object.values(missing).some(v => v)

  async function submitCheck() {
    if (!room || !user) return
    setSubmitting(true)

    const payload = {
      room_id: room.id,
      consumed,
      missing,
      inspector_id: user.id,
    }

    if (!isOnline()) {
      addOfflineAction('room_check', payload)
      toast.success('Sačuvano lokalno — biće sinhronizovano kada budete online')
      setSubmitting(false)
      return
    }

    try {
      // Save consumption logs
      const consumptionEntries = Object.entries(consumed)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const inv = inventory.find(i => i.item_id === itemId)
          return {
            room_id: room.id,
            item_id: itemId,
            quantity: qty,
            unit_price: inv?.item.price ?? 0,
            total_price: qty * (inv?.item.price ?? 0),
            logged_by: user.id,
          }
        })

      if (consumptionEntries.length > 0) {
        const { error: logErr } = await supabase.from('consumption_logs').insert(consumptionEntries)
        if (logErr) throw logErr

        // Update inventory
        for (const entry of consumptionEntries) {
          const inv = inventory.find(i => i.item_id === entry.item_id)
          if (inv) {
            await supabase
              .from('room_inventory')
              .update({ current_quantity: inv.current_quantity - entry.quantity, updated_at: new Date().toISOString() })
              .eq('id', inv.id)
          }
        }
      }

      // Update room status and last inspected
      await supabase
        .from('rooms')
        .update({
          status: 'inspected' as RoomStatus,
          last_inspected_at: new Date().toISOString(),
          last_inspected_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id)

      // Log status change
      await supabase.from('room_status_logs').insert({
        room_id: room.id,
        from_status: room.status,
        to_status: 'inspected',
        changed_by: user.id,
        notes: consumptionEntries.length > 0
          ? `Konzumacija: ${consumptionEntries.length} artikala`
          : 'Bez konzumacije',
      })

      toast.success('Soba pregledana! ✓')
      setConsumed({})
      setMissing({})
      navigate('/housekeeping')
    } catch {
      toast.error('Greška pri čuvanju. Pokušajte ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function addNote() {
    if (!newNote.trim() || !room || !user) return
    try {
      const { error } = await supabase.from('room_notes').insert({
        room_id: room.id,
        content: newNote.trim(),
        author_id: user.id,
        author_role: user.role,
      })
      if (error) throw error
      setNewNote('')
      setShowNoteInput(false)
      toast.success('Napomena dodana')
      fetchRoom()
    } catch {
      toast.error('Greška pri dodavanju napomene')
    }
  }

  async function markReadyForCharge() {
    if (!room || !user) return
    try {
      await supabase
        .from('rooms')
        .update({ status: 'ready_for_charge', updated_at: new Date().toISOString() })
        .eq('id', room.id)
      await supabase.from('room_status_logs').insert({
        room_id: room.id,
        from_status: room.status,
        to_status: 'ready_for_charge',
        changed_by: user.id,
      })
      toast.success('Soba označena kao spremna za naplatu')
      fetchRoom()
    } catch {
      toast.error('Greška')
    }
  }

  // Group inventory by category
  const grouped = inventory.reduce<Record<string, InventoryWithItem[]>>((acc, inv) => {
    const cat = inv.item?.category ?? 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(inv)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32 rounded-xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Soba nije pronađena</p>
        <Link to="/rooms" className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Nazad
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-white">Soba {room.number}</h1>
            <StatusBadge status={room.status} />
          </div>
          <p className="text-slate-500 text-xs">Sprat {room.floor}</p>
        </div>
      </div>

      {/* Action buttons for reception */}
      {(user?.role === 'reception' || user?.role === 'admin') && room.status === 'inspected' && (
        <div className="flex gap-3">
          <button onClick={markReadyForCharge} className="btn-success flex-1 flex items-center justify-center gap-2">
            <ShoppingCart size={16} />
            Spremi za naplatu
          </button>
          <Link
            to={`/checkout/${room.id}`}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-3 rounded-xl"
          >
            <CheckCircle size={16} />
            Naplata
          </Link>
        </div>
      )}

      {room.status === 'ready_for_charge' && (user?.role === 'reception' || user?.role === 'admin') && (
        <Link
          to={`/checkout/${room.id}`}
          className="btn-success w-full flex items-center justify-center gap-2"
        >
          <ShoppingCart size={18} />
          Izvrši naplatu
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl">
        {(['inventory', 'notes', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${activeTab === tab ? 'bg-hotel-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            {tab === 'inventory' ? 'Inventar' : tab === 'notes' ? 'Napomene' : 'Istorija'}
          </button>
        ))}
      </div>

      {/* Inventory tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="card divide-y divide-slate-700/50">
                {items.map(inv => {
                  const consumedQty = consumed[inv.item_id] ?? 0
                  const isMissing = missing[inv.item_id] ?? false
                  const isLow = inv.current_quantity <= inv.min_quantity
                  return (
                    <div key={inv.id} className={`p-4 ${isMissing ? 'bg-red-500/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl w-8 text-center">{inv.item?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-sm">{inv.item?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500">
                              Stanje: {inv.current_quantity}/{inv.default_quantity}
                            </p>
                            {isLow && !consumedQty && (
                              <span className="text-[10px] text-amber-400 font-medium">MALO</span>
                            )}
                            <p className="text-xs text-emerald-400 font-medium">{inv.item?.price.toFixed(2)} €</p>
                          </div>
                        </div>

                        {/* Housekeeping controls */}
                        {(user?.role === 'housekeeping' || user?.role === 'admin') && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleMissing(inv.item_id)}
                              className={`p-1.5 rounded-lg transition-colors touch-manipulation ${isMissing ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                              title="Nedostaje"
                            >
                              <AlertCircle size={14} />
                            </button>
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-xl">
                              <button
                                onClick={() => adjustConsumed(inv.item_id, -1)}
                                disabled={consumedQty === 0}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 touch-manipulation"
                              >
                                <Minus size={14} />
                              </button>
                              <span className={`w-7 text-center text-sm font-bold ${consumedQty > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                {consumedQty}
                              </span>
                              <button
                                onClick={() => adjustConsumed(inv.item_id, 1)}
                                disabled={consumedQty >= inv.current_quantity}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 touch-manipulation"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {inventory.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nema inventara za ovu sobu</p>
            </div>
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            Dodaj napomenu
          </button>

          {showNoteInput && (
            <div className="card p-4 space-y-3 animate-slide-up">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Unesite napomenu..."
                rows={3}
                className="input-field resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowNoteInput(false)} className="btn-secondary flex-1">
                  Otkaži
                </button>
                <button onClick={addNote} disabled={!newNote.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Send size={14} />
                  Sačuvaj
                </button>
              </div>
            </div>
          )}

          {notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nema napomena</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="card p-4">
                  <p className="text-slate-200 text-sm">{note.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">
                      {(note.author as any)?.full_name ?? 'Nepoznato'}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-600">
                      {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nema istorije konzumacije</p>
            </div>
          ) : (
            <div className="card divide-y divide-slate-700/50">
              {recentLogs.map(log => {
                const item = log.item as unknown as MinibarItem
                return (
                  <div key={log.id} className="flex items-center gap-3 p-4">
                    <span className="text-xl">{item?.icon ?? '📦'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{item?.name ?? 'Nepoznato'}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.created_at), 'dd.MM. HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-200">×{log.quantity}</p>
                      <p className="text-xs text-emerald-400">{log.total_price.toFixed(2)} €</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Fixed submit button for housekeeping */}
      {(user?.role === 'housekeeping' || user?.role === 'admin') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 safe-bottom lg:left-72">
          <div className="max-w-2xl mx-auto flex gap-3">
            {hasChanges && (
              <button
                onClick={() => { setConsumed({}); setMissing({}) }}
                className="btn-secondary px-4"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              onClick={submitCheck}
              disabled={submitting}
              className="btn-success flex-1 flex items-center justify-center gap-2 text-base"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Čuvanje...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Soba pregledana
                  {hasChanges && ` (${Object.values(consumed).reduce((s, v) => s + v, 0)} konzumirano)`}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
