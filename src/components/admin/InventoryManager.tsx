import { useState, useEffect } from 'react'
import { Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import type { Room, MinibarItem } from '../../types'

interface InvRow {
  id: string
  room_id: string
  item_id: string
  default_quantity: number
  current_quantity: number
  min_quantity: number
}

const CATEGORY_LABELS: Record<string, string> = {
  beverages: '🥤 Bezalkoholna pića',
  alcohol: '🍷 Alkohol',
  snacks: '🍿 Grickalice',
  toiletries: '🧴 Toalet',
  other: '📦 Ostalo',
}

export default function InventoryManager() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [items, setItems] = useState<MinibarItem[]>([])
  const [inventory, setInventory] = useState<InvRow[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['beverages', 'alcohol']))
  const [localQty, setLocalQty] = useState<Record<string, { def: number; min: number }>>({})

  useEffect(() => {
    loadRoomsAndItems()
  }, [])

  useEffect(() => {
    if (selectedRoom) loadInventory(selectedRoom)
  }, [selectedRoom])

  async function loadRoomsAndItems() {
    const [r, i] = await Promise.all([
      supabase.from('rooms').select('id,number,floor,type').order('number'),
      supabase.from('minibar_items').select('*').eq('is_active', true).order('category').order('name'),
    ])
    if (r.data) setRooms(r.data as Room[])
    if (i.data) setItems(i.data as MinibarItem[])
    if (r.data?.[0]) setSelectedRoom(r.data[0].id)
  }

  async function loadInventory(roomId: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('room_inventory')
        .select('*')
        .eq('room_id', roomId)

      const inv = (data ?? []) as InvRow[]
      setInventory(inv)

      // Inicijalizuj lokalne vrednosti
      const local: Record<string, { def: number; min: number }> = {}
      inv.forEach(row => {
        local[row.item_id] = { def: row.default_quantity, min: row.min_quantity }
      })
      setLocalQty(local)
    } finally {
      setLoading(false)
    }
  }

  async function saveInventory() {
    if (!selectedRoom) return
    setSaving(true)
    try {
      const upserts = items.map(item => {
        const existing = inventory.find(i => i.item_id === item.id)
        const local = localQty[item.id]
        const defQty = local?.def ?? (existing?.default_quantity ?? 1)
        const minQty = local?.min ?? (existing?.min_quantity ?? 0)
        return {
          room_id: selectedRoom,
          item_id: item.id,
          default_quantity: defQty,
          current_quantity: existing?.current_quantity ?? defQty,
          min_quantity: minQty,
        }
      })

      const { error } = await supabase
        .from('room_inventory')
        .upsert(upserts, { onConflict: 'room_id,item_id' })

      if (error) throw error
      toast.success('Inventar sačuvan')
      loadInventory(selectedRoom)
    } catch (e: any) {
      toast.error(e.message ?? 'Greška')
    } finally {
      setSaving(false)
    }
  }

  async function applyToAllRooms() {
    if (!selectedRoom) return
    setSaving(true)
    try {
      const upserts = rooms.flatMap(room =>
        items.map(item => {
          const local = localQty[item.id]
          const defQty = local?.def ?? 1
          const minQty = local?.min ?? 0
          return {
            room_id: room.id,
            item_id: item.id,
            default_quantity: defQty,
            current_quantity: defQty,
            min_quantity: minQty,
          }
        })
      )

      const { error } = await supabase
        .from('room_inventory')
        .upsert(upserts, { onConflict: 'room_id,item_id' })

      if (error) throw error
      toast.success(`Inventar primenjen na sve ${rooms.length} sobe`)
    } catch (e: any) {
      toast.error(e.message ?? 'Greška')
    } finally {
      setSaving(false)
    }
  }

  function toggleCategory(cat: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const grouped = items.reduce<Record<string, MinibarItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const selectedRoomObj = rooms.find(r => r.id === selectedRoom)

  return (
    <div className="space-y-4">
      {/* Room selector */}
      <div>
        <label className="label">Izaberite sobu</label>
        <select
          value={selectedRoom}
          onChange={e => setSelectedRoom(e.target.value)}
          className="input-field"
        >
          {rooms.map(r => (
            <option key={r.id} value={r.id}>
              Soba {r.number} — Sprat {r.floor}
            </option>
          ))}
        </select>
      </div>

      {selectedRoomObj && (
        <p className="text-xs text-slate-500">
          Postavljate podrazumevane količine za sobu <strong className="text-slate-300">{selectedRoomObj.number}</strong>
        </p>
      )}

      {/* Inventory by category */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, catItems]) => {
            const isExpanded = expandedCats.has(cat)
            return (
              <div key={cat} className="card overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left touch-manipulation"
                >
                  <span className="text-sm font-semibold text-slate-300">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{catItems.length} artik.</span>
                    {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                    {/* Column headers */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30">
                      <div className="flex-1 text-xs text-slate-500">Artikal</div>
                      <div className="w-20 text-center text-xs text-slate-500">Default</div>
                      <div className="w-20 text-center text-xs text-slate-500">Minimum</div>
                    </div>

                    {catItems.map(item => {
                      const local = localQty[item.id]
                      const defVal = local?.def ?? (inventory.find(i => i.item_id === item.id)?.default_quantity ?? 1)
                      const minVal = local?.min ?? (inventory.find(i => i.item_id === item.id)?.min_quantity ?? 0)

                      return (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-3">
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-base">{item.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-slate-200 truncate">{item.name}</p>
                              <p className="text-xs text-emerald-400">{item.price.toFixed(2)} €</p>
                            </div>
                          </div>
                          {/* Default quantity */}
                          <div className="w-20 flex items-center justify-center gap-1">
                            <button
                              onClick={() => setLocalQty(p => ({ ...p, [item.id]: { def: Math.max(0, (p[item.id]?.def ?? defVal) - 1), min: p[item.id]?.min ?? minVal } }))}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 touch-manipulation text-sm"
                            >−</button>
                            <span className="w-6 text-center text-sm font-medium text-white">{defVal}</span>
                            <button
                              onClick={() => setLocalQty(p => ({ ...p, [item.id]: { def: (p[item.id]?.def ?? defVal) + 1, min: p[item.id]?.min ?? minVal } }))}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 touch-manipulation text-sm"
                            >+</button>
                          </div>
                          {/* Min quantity */}
                          <div className="w-20 flex items-center justify-center gap-1">
                            <button
                              onClick={() => setLocalQty(p => ({ ...p, [item.id]: { def: p[item.id]?.def ?? defVal, min: Math.max(0, (p[item.id]?.min ?? minVal) - 1) } }))}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 touch-manipulation text-sm"
                            >−</button>
                            <span className="w-6 text-center text-sm font-medium text-amber-400">{minVal}</span>
                            <button
                              onClick={() => setLocalQty(p => ({ ...p, [item.id]: { def: p[item.id]?.def ?? defVal, min: (p[item.id]?.min ?? minVal) + 1 } }))}
                              className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 touch-manipulation text-sm"
                            >+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Save actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={saveInventory}
          disabled={saving || loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          Sačuvaj za ovu sobu
        </button>
        <button
          onClick={applyToAllRooms}
          disabled={saving || loading}
          className="btn-secondary flex items-center gap-2 px-4"
          title="Primeni isti inventar na sve sobe"
        >
          Sve sobe
        </button>
      </div>
    </div>
  )
}
